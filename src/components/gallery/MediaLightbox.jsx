import { useCallback, useEffect, useRef } from "react";
import { resolveMediaUrl } from "../../api/client";

/**
 * Full-size viewer for gallery media.
 *
 * `items` is the set the viewer can page through -- the whole album when opened
 * from inside an album, or a single-element list when opened from a lone tile.
 * `index` is which one is showing. Navigation wraps, so the arrows never dead-end.
 */
export default function MediaLightbox({ items, index, onClose, onNavigate }) {
  const closeRef = useRef(null);
  const list = items || [];
  const current = list[index];

  const step = useCallback(
    (delta) => {
      if (list.length === 0) return;
      onNavigate((index + delta + list.length) % list.length);
    },
    [index, list.length, onNavigate]
  );

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      // Arrows would otherwise scroll the page behind the viewer.
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    // The viewer covers the page; without this the background scrolls under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [current, onClose, step]);

  if (!current) return null;
  const many = list.length > 1;

  return (
    <div
      className="media-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={current.title || "Gallery media"}
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="media-viewer-close"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>

      {many && (
        <button
          type="button"
          className="media-viewer-nav prev"
          onClick={(e) => { e.stopPropagation(); step(-1); }}
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      <figure className="media-viewer-figure" onClick={(e) => e.stopPropagation()}>
        {current.media_kind === "video" ? (
          <video className="media-viewer-media" src={resolveMediaUrl(current.file_url)} controls />
        ) : (
          <img className="media-viewer-media" src={resolveMediaUrl(current.file_url)} alt={current.title || "Gallery media"} />
        )}
        <figcaption className="media-viewer-caption">
          <b>{current.title}</b>
          {many && <span>{index + 1} of {list.length}</span>}
        </figcaption>
      </figure>

      {many && (
        <button
          type="button"
          className="media-viewer-nav next"
          onClick={(e) => { e.stopPropagation(); step(1); }}
          aria-label="Next"
        >
          ›
        </button>
      )}
    </div>
  );
}
