import client from "./client";

export const markAttendance = (class_id, date, entries) =>
  client.post("/attendance/mark", { class_id, date, entries }).then((r) => r.data);

export const getAttendance = (student_id, date_from, date_to) =>
  client.get("/attendance", { params: { student_id, date_from, date_to } }).then((r) => r.data);

export const classSummary = (class_id, date) =>
  client.get(`/attendance/class/${class_id}/summary`, { params: { date } }).then((r) => r.data);
