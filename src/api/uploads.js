import client from "./client";

/** Upload a school image file to the backend. */
export function uploadImage(file, schoolId) {
  if (!schoolId) {
    return Promise.reject(new Error("School ID is required for image uploads."));
  }

  const form = new FormData();
  form.append("file", file);

  return client
    .post(`/schools/${schoolId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}
