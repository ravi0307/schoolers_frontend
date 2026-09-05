import client from "./client";

export const listMedia = (classId) =>
  client.get("/media", { params: classId ? { class_id: classId } : {} }).then((r) => r.data);
