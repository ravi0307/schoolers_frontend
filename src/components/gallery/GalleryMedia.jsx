import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./GalleryMedia.module.css";

export default function GalleryMedia({ src, alt, kind = "image", className = "", compact = false }) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const mediaClassName = [className, styles.media].filter(Boolean).join(" ");
  if (failed) {
    return (
      <span
        className={[className, styles.fallback, compact ? styles.compactFallback : ""]
          .filter(Boolean)
          .join(" ")}
        role="img"
        aria-label={`${alt || "Media"} preview unavailable`}
      >
        <ImageOff aria-hidden="true" size={compact ? 18 : 28} />
        {!compact && <span>Preview unavailable</span>}
      </span>
    );
  }

  if (kind === "video") {
    return (
      <video
        className={mediaClassName}
        src={src}
        muted
        preload="metadata"
        onError={() => setFailed(true)}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      className={mediaClassName}
      src={src}
      alt={alt || "Gallery media"}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
