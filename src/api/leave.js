import client from "./client";

export const createLeave = (data) => client.post("/leave", data).then((r) => r.data);
export const listLeave = (status) => client.get("/leave", { params: { status } }).then((r) => r.data);
export const approveLeave = (id) => client.patch(`/leave/${id}/approve`).then((r) => r.data);
export const rejectLeave = (id) => client.patch(`/leave/${id}/reject`).then((r) => r.data);
