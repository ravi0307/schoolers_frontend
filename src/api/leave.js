import client from "./client";

export const createLeave = (data) => client.post("/leave", data).then((r) => r.data);
export const listLeave = (status) => client.get("/leave", { params: { status } }).then((r) => r.data);
export const listMine = () => client.get("/leave/mine").then((r) => r.data);
export const approveLeave = (id, data) => client.patch(`/leave/${id}/approve`, data).then((r) => r.data);
export const rejectLeave = (id, data) => client.patch(`/leave/${id}/reject`, data).then((r) => r.data);
