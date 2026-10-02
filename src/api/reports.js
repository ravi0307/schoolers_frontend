import client from "./client";

export const schoolOverview = (schoolId) =>
  client.get(`/reports/school/${schoolId}/overview`).then((r) => r.data);
export const classAttendanceTrend = (classId) =>
  client.get(`/reports/class/${classId}/attendance-trend`).then((r) => r.data);
export const studentReport = (studentId) =>
  client.get(`/reports/student/${studentId}`).then((r) => r.data);
export const staffReport = (staffId) =>
  client.get(`/reports/staff/${staffId}`).then((r) => r.data);

/**
 * The signed-in staff member's own salary and attendance, for the profile page.
 *
 * There is deliberately no staff id: the server resolves the record from the
 * session, so a staff member cannot read a colleague's pay by editing the URL.
 * `attendanceMonth` narrows the register to one month and `salaryEnd` pages the
 * six-month pay window; both are omitted so the server uses its defaults.
 */
export const myStaffSummary = ({ attendanceMonth, salaryEnd } = {}) =>
  client
    .get("/reports/staff/me", {
      params: {
        ...(attendanceMonth ? { attendance_month: attendanceMonth } : {}),
        ...(salaryEnd ? { salary_end: salaryEnd } : {}),
      },
    })
    .then((r) => r.data);
