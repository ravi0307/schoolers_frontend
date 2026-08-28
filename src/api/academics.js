import client from "./client";

export const listClasses = () => client.get("/classes").then((r) => r.data);
export const createClass = (data) => client.post("/classes", data).then((r) => r.data);
export const updateClass = (id, data) => client.patch(`/classes/${id}`, data).then((r) => r.data);
export const deleteClass = (id) => client.delete(`/classes/${id}`);

export const listSubjects = () => client.get("/subjects").then((r) => r.data);
export const listPeriods = () => client.get("/periods").then((r) => r.data);
export const updatePeriod = (id, period_time) =>
  client.patch(`/periods/${id}`, { period_time }).then((r) => r.data);

export const listHolidays = () => client.get("/holidays").then((r) => r.data);
export const setHoliday = (day, is_holiday) =>
  client.patch(`/holidays/${day}`, { is_holiday }).then((r) => r.data);
