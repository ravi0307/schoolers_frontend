import client from "./client";

/** List every media file (photo/video) uploaded by staff for this school. */
export const listGallery = () => client.get("/media").then((r) => r.data);

/** Upload a photo or short video to the school gallery. */
export function uploadGalleryMedia(file, title, classId = null) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (classId) form.append("class_id", classId);
  return client
    .post("/media", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
}

/**
 * Edit a gallery item. The caller may only pass media they uploaded, or any
 * media in their own school if they are an admin — the server enforces this,
 * this function just shapes the request.
 *
 * `replacementFile` swaps the stored file for a new upload; when omitted the
 * existing file is kept as-is (the server unlinks the old one only after the
 * row has stopped pointing at it).
 */
export function updateGalleryMedia(mediaId, { title, classId, setClassId = false, replacementFile } = {}) {
  const form = new FormData();
  if (title !== undefined) form.append("title", title);
  if (setClassId) form.append("class_id", classId ?? "");
  if (setClassId) form.append("set_class_id", "true");
  if (replacementFile) form.append("file", replacementFile);
  return client
    .patch(`/media/${mediaId}`, form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
}

/** Remove a gallery item (soft delete). Allowed for admins school-wide, and for
 *  staff on media they uploaded. */
export const deleteGalleryMedia = (mediaId) =>
  client.delete(`/media/${mediaId}`).then((r) => r.data);