import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../api/client";

function ViewerMedia({ current }) {
  const [failed, setFailed] = useState(!current?.file_url);

  useEffect(() => {
    setFailed(!current?.file_url);
  }, [current?.media_id, current?.file_url]);

  if (failed) {
    return <div className="media-viewer-fallback" role="status">Media preview unavailable</div>;
  }
  if (current.media_kind === "video") {
    return (
      <video
        className="media-viewer-media"
        src={resolveMediaUrl(current.file_url)}
        controls
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <img
      className="media-viewer-media"
      src={resolveMediaUrl(current.file_url)}
      alt={current.title || "Gallery media"}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Full-size viewer for gallery media.
 *
 * `items` is the set the viewer can page through -- the whole album when opened
 * from inside an album, or a single-element list when opened from a lone tile.
 * `index` is which one is showing. Navigation wraps, so the arrows never dead-end.
 */
export default function MediaLightbox({ items, index, onClose, onNavigate }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
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
    const previouslyFocused = document.activeElement;
    const focusable = () =>
      Array.from(dialogRef.current?.querySelectorAll(
        'a[href], button:not(:disabled), video[controls], [tabindex]:not([tabindex="-1"])'
      ) || []);
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      // Arrows would otherwise scroll the page behind the viewer.
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
      else if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) {
          event.preventDefault();
        } else if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // The viewer covers the page; without this the background scrolls under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [current, onClose, step]);

  if (!current) return null;
  const many = list.length > 1;

  return (
    <div
      ref={dialogRef}
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
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
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
        <ViewerMedia key={current.media_id ?? index} current={current} />
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
