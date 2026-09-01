import { useRef, useState } from "react";
import { uploadImage } from "../../api/uploads";
import { resolveMediaUrl, apiErrorMessage } from "../../api/client";

export default function ImageUpload({
  label,
  value,
  onChange,
  hint,
  onError,
  schoolId,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, schoolId);
      onChange(url);
    } catch (err) {
      onError?.(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const previewUrl = resolveMediaUrl(value);

  return (
    <div className="field image-upload">
      <label>{label}</label>
      {hint && <p className="image-upload-hint">{hint}</p>}

      {previewUrl ? (
        <div className="image-upload-preview-wrap">
          <img src={previewUrl} alt="" className="image-upload-preview" />
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => onChange("")}
            disabled={uploading}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="image-upload-actions">
        <label className="btn ghost sm image-upload-btn">
          {uploading ? "Uploading..." : value ? "Replace image" : "Choose image"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            onChange={handleFileChange}
            disabled={uploading}
            hidden
          />
        </label>
      </div>
    </div>
  );
}
