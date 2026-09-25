import { useRef, useState } from "react";
import { useApi } from "../../hooks/useApi";
import * as galleryApi from "../../api/gallery";
import { resolveMediaUrl } from "../../api/client";
import { Spinner, ErrorBanner, Empty } from "../ui/Primitives";
import Pagination, { usePagination } from "../ui/Pagination";
import { useToast } from "../../context/ToastContext";

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 5 * 1024 * 1024;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export default function GalleryView({ canUpload = false, canDelete = false, empty = "No gallery media yet." }) {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(() => galleryApi.listGallery(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);
  const pager = usePagination(data);
  const items = (data || []).filter((item) => item.file_url);

function pickFiles(event) {
    const chosen = Array.from(event.target.files || []);
    const valid = chosen.filter(
      (f) => ACCEPT.split(",").includes(f.type) && f.size <= MAX_BYTES
    );
    if (valid.length === 0) {
      setFormError("Choose JPEG/PNG/GIF/WebP images or MP4/WebM/MOV videos up to 5 MB each.");
      return;
    }
    const skipped = chosen.length - valid.length;
    setFormError(
      skipped ? `${skipped} file${skipped === 1 ? "" : "s"} skipped (type or size not allowed).` : null
    );
    setFiles(valid);
  }

  const fileListLabel = files.length <= 3
    ? files.map((f) => f.name).join(", ")
    : `${files.slice(0, 2).map((f) => f.name).join(", ")}, +${files.length - 2} more`;

  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Give the media a title.");
      return;
    }
if (files.length === 0) {
      setFormError("Choose photos or videos to upload.");
      return;
    }
    setSaving(true);
    setDone(0);
    setFormError(null);
    let ok = 0;
    let firstError = null;
    for (let i = 0; i < files.length; i++) {
      try {
        await galleryApi.uploadGalleryMedia(files[i], title.trim());
        ok++;
      } catch (err) {
        firstError = firstError || err?.response?.data?.detail || err?.message || "Upload failed";
      }
      setDone(i + 1);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFiles([]);
    if (ok > 0) refetch();
    setSaving(false);
    if (ok === files.length) {
      setTitle("");
      setFormOpen(false);
      toast(ok === 1 ? "Added to the gallery" : `Uploaded ${ok} photos/videos to the gallery`);
    } else {
      setFormError(
        ok > 0
          ? `${ok} uploaded, ${files.length - ok} failed (${firstError || "unknown error"})`
          : firstError || "Upload failed"
      );
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove "${item.title}" from the gallery?`)) return;
    try {
      await galleryApi.deleteGalleryMedia(item.media_id);
      refetch();
      toast("Removed from the gallery");
    } catch (err) {
      toast(err?.response?.data?.detail || err?.message || "Could not remove the item");
    }
  }

  return (
    <>
      {canUpload && (
        <button className="btn gold" style={{ marginBottom: 14 }} onClick={() => setFormOpen((open) => !open)}>
          {formOpen ? "✕ Cancel" : "➕ Add to Gallery"}
        </button>
      )}

      {formOpen && canUpload && (
        <form className="card white" style={{ marginBottom: 14 }} onSubmit={submit}>
          <div className="field">
            <label htmlFor="gallery-title">Title</label>
            <input
              id="gallery-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual day practice"
            />
          </div>
          <div className="field">
<label>Files (photos or short videos, up to 5 MB each — you can select several)</label>
            <input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={pickFiles} />
            {files.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                {fileListLabel}
              </div>
            )}
          </div>
          {formError && <div className="error-text" style={{ marginBottom: 10 }}>{formError}</div>}
          <button className="btn primary block" type="submit" disabled={saving}>
            {saving
              ? done > 0
                ? `Uploading ${done}/${files.length}…`
                : "Uploading…"
              : files.length > 1
                ? `Upload ${files.length} to Gallery`
                : "Upload to Gallery"}
          </button>
        </form>
      )}

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error &&
        (items.length ? (
          <>
            <div className="gallery-grid">
              {pager.pageItems.map((item) => (
                <div key={item.media_id} className="gallery-tile">
                  {canDelete && (
                    <button
                      type="button"
                      className="gallery-tile-remove"
                      title={`Remove ${item.title}`}
                      onClick={() => remove(item)}
                    >
                      ✕
                    </button>
                  )}
                  {item.media_kind === "video" ? (
                    <video
                      className="gallery-media"
                      src={resolveMediaUrl(item.file_url)}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img className="gallery-media" src={resolveMediaUrl(item.file_url)} alt={item.title} loading="lazy" />
                  )}
                  <div className="gallery-tile-meta">
                    <b>{item.title}</b>
                    <span>
                      {item.posted_by}
                      {item.created_at ? ` · ${formatDate(item.created_at)}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination {...pager} />
          </>
        ) : (
          <Empty>{empty}</Empty>
        ))}
    </>
  );
}