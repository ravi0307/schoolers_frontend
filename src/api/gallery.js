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

/** Remove a gallery item (soft delete; school admin only). */
export const deleteGalleryMedia = (mediaId) =>
  client.delete(`/media/${mediaId}`).then((r) => r.data);