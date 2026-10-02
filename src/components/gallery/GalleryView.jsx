import { useRef, useState, useMemo, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import * as galleryApi from "../../api/gallery";
import { resolveMediaUrl } from "../../api/client";
import { buildGalleryCards, canManageCard, canManageMedia, mediaIdsOf } from "../../utils/galleryAlbums";
import MediaLightbox from "./MediaLightbox";
import { Spinner, ErrorBanner, Empty, ConfirmDialog } from "../ui/Primitives";
import Pagination, { usePagination } from "../ui/Pagination";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 5 * 1024 * 1024;

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function GalleryView({ canUpload = false, canManage = false, empty = "No gallery media yet." }) {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => galleryApi.listGallery(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);
  const [openAlbumKey, setOpenAlbumKey] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(null);
  // Gating is per item, not per page: staff only see controls on media they
  // uploaded, and admins on everything in their school. The page-level
  // `canManage` flag only says the signed-in role may manage things at all.
  const mayManage = canManage && !!user;
  const canManageItem = (item) => mayManage && canManageMedia(item, user);
  // Which set of media the full-size viewer is paging through, and which one it
  // is showing. Held together so opening a different album resets to its first
  // photo instead of carrying an index across.
  const [viewer, setViewer] = useState(null);

  const cards = useMemo(() => buildGalleryCards(data), [data]);
  const pager = usePagination(cards);
  const openAlbum = cards.find((card) => card.kind === "album" && card.key === openAlbumKey);

  useEffect(() => {
    if (!openAlbum || viewer) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenAlbumKey(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openAlbum, viewer]);

  function openViewer(items, index) {
    setViewer({ items, index });
  }

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

  function handleRemove(item) {
    const kind = item.items ? "album" : "media";
    setPendingDelete({ kind, item });
  }

  function openEditor(item) {
    if (!item || !canManageItem(item)) return;
    setOpenAlbumKey(null);
    setFormError(null);
    setEditing({
      item,
      title: item.title || "",
      file: null,
      replaceFile: false,
    });
  }

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setFormError(null);
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!editing) return;
    const nextTitle = editing.title.trim();
    if (!nextTitle) {
      setFormError("Give the media a title.");
      return;
    }
    if (editing.replaceFile && !editing.file) {
      setFormError("Choose a replacement file, or untick replace to keep the current one.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await galleryApi.updateGalleryMedia(editing.item.media_id, {
        title: nextTitle,
        replacementFile: editing.replaceFile ? editing.file : undefined,
      });
      setEditing(null);
      toast("Updated the gallery item");
      refetch();
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.message || "Could not update the media");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingDelete || removing) return;
    // An album card has no media_id of its own, so this used to send
    // /media/undefined and remove nothing at all.
    const ids = mediaIdsOf(pendingDelete.item);
    if (ids.length === 0) {
      setPendingDelete(null);
      return;
    }
    const isAlbum = pendingDelete.kind === "album";
    setRemoving(true);
    let failed = 0;
    // Sequentially, so one failure does not abandon the rest of an album.
    for (const id of ids) {
      try {
        await galleryApi.deleteGalleryMedia(id);
      } catch {
        failed += 1;
      }
    }
    // An album can mix several people's uploads, so report refused items
    // honestly instead of implying the whole album went.
    const rejected = ids.filter((id) => {
      const items = pendingDelete.item.items || [];
      const match = items.find((it) => it.media_id === id);
      return match && !canManageMedia(match, user);
    });
    setRemoving(false);
    setPendingDelete(null);
    // The viewer may be showing media that has just been deleted.
    setViewer(null);
    if (isAlbum) setOpenAlbumKey(null);
    if (failed === 0) {
      toast(isAlbum ? `Removed ${ids.length} item${ids.length === 1 ? "" : "s"} from the gallery` : "Removed from the gallery");
    } else if (failed < ids.length) {
      toast(`${ids.length - failed} removed, ${failed} could not be removed`);
    } else {
      toast(rejected.length
        ? "You can only remove media you uploaded — ask a school admin for the rest"
        : "Could not remove from the gallery");
    }
    refetch();
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

      {editing && (
        <form className="card white" style={{ marginBottom: 14 }} onSubmit={submitEdit}>
          <div className="field">
            <label htmlFor="gallery-edit-title">Title</label>
            <input
              id="gallery-edit-title"
              value={editing.title}
              onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
              placeholder="e.g. Annual day practice"
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={editing.replaceFile}
                onChange={(e) => setEditing((s) => ({ ...s, replaceFile: e.target.checked, file: null }))}
                style={{ marginRight: 6 }}
              />
              Replace the file
            </label>
            {editing.replaceFile && (
              <input
                type="file"
                accept={ACCEPT}
                onChange={(e) => setEditing((s) => ({ ...s, file: e.target.files?.[0] || null }))}
              />
            )}
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
              Leave this unticked to keep the current photo or video.
            </div>
          </div>
          {formError && <div className="error-text" style={{ marginBottom: 10 }}>{formError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button className="btn ghost" type="button" onClick={closeEditor} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error &&
        (cards.length ? (
          <>
            <div className="gallery-grid">
              {pager.pageItems.map((card) => {
                if (card.kind === "album") {
                  return (
                    <div key={card.key} className="gallery-album">
                      <div className="album-head-row">
                        {/* Only offered when the user may manage every photo in
                            the album: removing one they uploaded but not the
                            rest would fail on the server. */}
                        {canManageCard(card, user) && (
                          <button type="button" className="gallery-tile-remove" title={`Remove album "${card.title}"`} onClick={() => handleRemove(card)}>✕</button>
                        )}
                      </div>
                      <div
                        className="gallery-album-head"
                        role="button"
                        tabIndex={0}
                        aria-haspopup="dialog"
                        onClick={() => setOpenAlbumKey(card.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenAlbumKey(card.key);
                          }
                        }}
                      >
                        <div className="album-thumbs">
                          {card.items.slice(0, 4).map((it) => (
                            <img
                              key={it.media_id}
                              className="album-thumb"
                              src={resolveMediaUrl(it.file_url)}
                              alt={it.title}
                              loading="lazy"
                            />
                          ))}
                        </div>
                        <div className="album-meta">
                          <b>{card.title}</b>
                          <span>
                            {card.items.length} photo{card.items.length !== 1 ? "s" : ""}
                            {card.createdAt ? ` · ${formatDateTime(card.createdAt)}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                const it = card.item;
                return (
                  <div key={it.media_id} className="gallery-tile">
                    {canManageItem(it) && (
                      <div className="gallery-tile-actions">
                        <button type="button" className="gallery-tile-edit" title={`Edit ${it.title}`} onClick={() => openEditor(it)}>✎</button>
                        <button type="button" className="gallery-tile-remove" title={`Remove ${it.title}`} onClick={() => handleRemove(it)}>✕</button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="album-open"
                      onClick={() => openViewer([it], 0)}
                      aria-label={`Open ${it.title || "media"} full size`}
                    >
                      {it.media_kind === "video" ? (
                        <video className="gallery-media" src={resolveMediaUrl(it.file_url)} muted preload="metadata" />
                      ) : (
                        <img className="gallery-media" src={resolveMediaUrl(it.file_url)} alt={it.title} loading="lazy" />
                      )}
                    </button>
                    <div className="gallery-tile-meta">
                      <b>{it.title}</b>
                      <span>
                        {it.posted_by}
                        {it.created_at ? ` · ${formatDateTime(it.created_at)}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination {...pager} />
          </>
        ) : (
          <Empty>{empty}</Empty>
        ))}
      {openAlbum && (
        <div
          className="album-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-album-title"
          onClick={() => setOpenAlbumKey(null)}
        >
          <section className="album-dialog" onClick={(event) => event.stopPropagation()}>
            <header className="album-dialog-header">
              <div className="album-dialog-heading">
                <h2 id="gallery-album-title">{openAlbum.title}</h2>
                <span>
                  {openAlbum.items.length} photo{openAlbum.items.length !== 1 ? "s" : ""}
                  {openAlbum.createdAt ? ` · ${formatDateTime(openAlbum.createdAt)}` : ""}
                </span>
              </div>
              <button
                type="button"
                className="album-dialog-close"
                onClick={() => setOpenAlbumKey(null)}
                aria-label="Close album"
              >
                ✕
              </button>
            </header>
            <div className="album-detail">
              {openAlbum.items.map((it, itemIndex) => (
                <div key={it.media_id} className="album-item">
                  <button
                    type="button"
                    className="album-open"
                    onClick={() => openViewer(openAlbum.items, itemIndex)}
                    aria-label={`Open ${it.title || "photo"} full size`}
                  >
                    {it.media_kind === "video" ? (
                      <video className="album-media" src={resolveMediaUrl(it.file_url)} muted preload="metadata" />
                    ) : (
                      <img className="album-media" src={resolveMediaUrl(it.file_url)} alt={it.title} loading="lazy" />
                    )}
                  </button>
                  <div className="album-item-info">
                    <span>{formatDateTime(it.created_at)}</span>
                    {canManageItem(it) && (
                      <>
                        <button
                          type="button"
                          className="gallery-tile-edit"
                          title={`Edit ${it.title}`}
                          onClick={() => openEditor(it)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="gallery-tile-remove"
                          title={`Remove ${it.title}`}
                          onClick={() => handleRemove(it)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      <MediaLightbox
        items={viewer?.items}
        index={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
        onNavigate={(index) => setViewer((v) => (v ? { ...v, index } : v))}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === "album"
            ? `Remove album "${pendingDelete?.item?.title}"?`
            : `Remove "${pendingDelete?.item?.title}"?`
        }
        message={
          pendingDelete?.kind === "album"
            ? `This will remove ${pendingDelete?.item?.items?.length || 0} photos/videos from the gallery. Their history (marks, timetable entries) stays intact but they won't appear in the gallery.`
            : `This will remove the media from the gallery. Its history (marks, timetable entries) stays intact but it won't appear in the gallery.`
        }
        confirmLabel={removing ? "Removing…" : "Remove"}
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
