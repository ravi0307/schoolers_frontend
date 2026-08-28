import client from "./client";

export const schoolOverview = (schoolId) =>
  client.get(`/reports/school/${schoolId}/overview`).then((r) => r.data);
export const classAttendanceTrend = (classId) =>
  client.get(`/reports/class/${classId}/attendance-trend`).then((r) => r.data);
