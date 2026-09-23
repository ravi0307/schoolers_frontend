import { useRef, useState } from "react";
import { uploadDocument } from "../../api/uploads";
import { resolveMediaUrl, apiErrorMessage } from "../../api/client";

export default function DocumentUpload({
  label,
  value,
  onChange,
  schoolId,
  onError,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const docs = Array.isArray(value) ? value : [];

  async function handleFileChange(e) {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { url } = await uploadDocument(file, schoolId);
        urls.push(url);
      }
      onChange([...docs, ...urls]);
    } catch (err) {
      onError?.(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index) {
    onChange(docs.filter((_, i) => i !== index));
  }

  return (
    <div className="field document-upload">
      <label>{label}</label>
      {docs.length ? (
        <div className="document-upload-list">
          {docs.map((doc, index) => {
            const name = doc.split("/").pop() || doc;
            return (
              <div key={`${doc}-${index}`} className="document-upload-item">
                <a href={resolveMediaUrl(doc)} target="_blank" rel="noreferrer" className="document-upload-name">
                  {name}
                </a>
                <button className="btn ghost sm" type="button" onClick={() => remove(index)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <label className="btn ghost sm image-upload-btn">
        {uploading ? "Uploading..." : "Upload document"}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={uploading}
          multiple
          hidden
        />
      </label>
    </div>
  );
}