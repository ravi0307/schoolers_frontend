import client from "./client";

export const markAttendance = (class_id, date, entries) =>
  client.post("/attendance/mark", { class_id, date, entries }).then((r) => r.data);

export const getAttendance = (student_id, date_from, date_to) =>
  client.get("/attendance", { params: { student_id, date_from, date_to } }).then((r) => r.data);

export const classSummary = (class_id, date) =>
  client.get(`/attendance/class/${class_id}/summary`, { params: { date } }).then((r) => r.data);

// Staff attendance is admin-only to mark. Always pass a date range: with no
// bounds the endpoint returns every row ever recorded, not just today.
// The upsert key is (staff_id, date), so re-marking a day overwrites in place.
export const getStaffAttendance = (date) =>
  client.get("/attendance/staff", { params: { date_from: date, date_to: date } }).then((r) => r.data);

export const markStaffAttendance = (date, entries) =>
  client.post("/attendance/staff/mark", { date, entries }).then((r) => r.data);
