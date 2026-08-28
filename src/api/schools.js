import client from "./client";

export const listSchools = () => client.get("/schools").then((r) => r.data);
export const getSchool = (id) => client.get(`/schools/${id}`).then((r) => r.data);
export const createSchool = (data) => client.post("/schools", data).then((r) => r.data);
export const updateSchool = (id, data) => client.patch(`/schools/${id}`, data).then((r) => r.data);
export const deleteSchool = (id) => client.delete(`/schools/${id}`);
export const updateFeatures = (id, data) => client.patch(`/schools/${id}/features`, data).then((r) => r.data);
export const updateStatus = (id, status) => client.patch(`/schools/${id}/status`, { status }).then((r) => r.data);
export const getStats = (id) => client.get(`/schools/${id}/stats`).then((r) => r.data);
