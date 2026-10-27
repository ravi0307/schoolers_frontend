import client from "./client";

export const listSchools = () => client.get("/schools").then((r) => r.data);
export const getSchool = (id) => client.get(`/schools/${id}`).then((r) => r.data);
export const createSchool = (data) => client.post("/schools", data).then((r) => r.data);
export const updateSchool = (id, data) => client.patch(`/schools/${id}`, data).then((r) => r.data);
export const deleteSchool = (id) => client.delete(`/schools/${id}`);
export const updateFeatures = (id, data) => client.patch(`/schools/${id}/features`, data).then((r) => r.data);
// Effective feature configuration for one school (master: any school;
// school admin: own school only).
export const getFeatures = (id) => client.get(`/schools/${id}/features`).then((r) => r.data);
export const updateStatus = (id, status) => client.patch(`/schools/${id}/status`, { status }).then((r) => r.data);
export const getStats = (id) => client.get(`/schools/${id}/stats`).then((r) => r.data);

// Marking system (Phase 2, marks_feature): per-school marks/grades setting.
// Switching with existing marks requires confirm=true (409 carries counts);
// published history always keeps its captured format.
export const updateMarkingSystem = (id, markingSystem, confirm = false) =>
  client
    .patch(`/schools/${id}/marking-system`, { marking_system: markingSystem, confirm })
    .then((r) => r.data);
