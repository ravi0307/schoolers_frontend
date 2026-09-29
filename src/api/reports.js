import client from "./client";

export const schoolOverview = (schoolId) =>
  client.get(`/reports/school/${schoolId}/overview`).then((r) => r.data);
export const classAttendanceTrend = (classId) =>
  client.get(`/reports/class/${classId}/attendance-trend`).then((r) => r.data);
export const studentReport = (studentId) =>
  client.get(`/reports/student/${studentId}`).then((r) => r.data);
export const staffReport = (staffId) =>
  client.get(`/reports/staff/${staffId}`).then((r) => r.data);
