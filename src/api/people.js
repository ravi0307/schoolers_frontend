import client from "./client";

export const listTeachers = () => client.get("/teachers").then((r) => r.data);
export const createTeacher = (data) => client.post("/teachers", data).then((r) => r.data);
export const updateTeacher = (id, data) => client.patch(`/teachers/${id}`, data).then((r) => r.data);
export const deleteTeacher = (id) => client.delete(`/teachers/${id}`);
export const teachingLoad = (id) => client.get(`/teachers/${id}/load`).then((r) => r.data);

export const listStaff = (search) => client.get("/staff", { params: { search } }).then((r) => r.data);
export const createStaff = (data) => client.post("/staff", data).then((r) => r.data);
export const updateStaff = (id, data) => client.patch(`/staff/${id}`, data).then((r) => r.data);
export const deleteStaff = (id) => client.delete(`/staff/${id}`);

export const listParents = () => client.get("/parents").then((r) => r.data);
export const createParent = (data) => client.post("/parents", data).then((r) => r.data);
export const childrenOfParent = (parentId) =>
  client.get(`/parents/${parentId}/children`).then((r) => r.data);

export const listStudents = (params) => client.get("/students", { params }).then((r) => r.data);
export const createStudent = (data) => client.post("/students", data).then((r) => r.data);
export const updateStudent = (id, data) => client.patch(`/students/${id}`, data).then((r) => r.data);
export const deleteStudent = (id) => client.delete(`/students/${id}`);
