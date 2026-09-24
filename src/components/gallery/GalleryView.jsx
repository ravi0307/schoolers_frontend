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
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);
  const pager = usePagination(data);
  const items = (data || []).filter((item) => item.file_url);

  function pickFile(event) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (!ACCEPT.split(",").includes(chosen.type)) {
      setFormError("Choose a JPEG/PNG/GIF/WebP image or an MP4/WebM/MOV video.");
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFormError("Files must be 5 MB or smaller.");
      return;
    }
    setFormError(null);
    setFile(chosen);
  }

  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Give the media a title.");
      return;
    }
    if (!file) {
      setFormError("Choose a photo or video to upload.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await galleryApi.uploadGalleryMedia(file, title.trim());
      refetch();
      setTitle("");
      setFile(null);
      setFormOpen(false);
      toast("Added to the gallery");
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.message || "Upload failed");
    } finally {
      setSaving(false);
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
            <label>File (photo or short video, up to 5 MB)</label>
            <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={pickFile} />
            {file && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>{file.name}</div>}
          </div>
          {formError && <div className="error-text" style={{ marginBottom: 10 }}>{formError}</div>}
          <button className="btn primary block" type="submit" disabled={saving}>
            {saving ? "Uploading…" : "Upload to Gallery"}
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