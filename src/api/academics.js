import client from "./client";

export const listClasses = () => client.get("/classes").then((r) => r.data);
export const createClass = (data) => client.post("/classes", data).then((r) => r.data);
export const updateClass = (id, data) => client.patch(`/classes/${id}`, data).then((r) => r.data);
export const deleteClass = (id) => client.delete(`/classes/${id}`);

export const listSubjects = () => client.get("/subjects").then((r) => r.data);
export const createSubject = (data) => client.post("/subjects", data).then((r) => r.data);
export const updateSubject = (id, data) => client.patch(`/subjects/${id}`, data).then((r) => r.data);
export const deactivateSubject = (id) => client.patch(`/subjects/${id}/deactivate`).then((r) => r.data);
export const activateSubject = (id) => client.patch(`/subjects/${id}/activate`).then((r) => r.data);
export const listPeriods = () => client.get("/periods").then((r) => r.data);
export const updatePeriod = (id, period_time) =>
  client.patch(`/periods/${id}`, { period_time }).then((r) => r.data);

export const listHolidays = () => client.get("/holidays").then((r) => r.data);
export const createHoliday = (data) => client.post("/holidays", data).then((r) => r.data);
export const updateHoliday = (id, data) => client.patch(`/holidays/${id}`, data).then((r) => r.data);
export const deleteHoliday = (id) => client.delete(`/holidays/${id}`);

// Academic calendar (Phase 1, marks_feature): years, periods, dated events.
// Years/periods deactivate via is_active instead of deleting; only events delete.
export const listAcademicYears = () => client.get("/academic-years").then((r) => r.data);
export const createAcademicYear = (data) => client.post("/academic-years", data).then((r) => r.data);
export const updateAcademicYear = (id, data) =>
  client.patch(`/academic-years/${id}`, data).then((r) => r.data);

export const listAcademicPeriods = (yearId) =>
  client.get("/academic-periods", { params: { year_id: yearId } }).then((r) => r.data);
export const createAcademicPeriod = (data) =>
  client.post("/academic-periods", data).then((r) => r.data);
export const updateAcademicPeriod = (id, data) =>
  client.patch(`/academic-periods/${id}`, data).then((r) => r.data);

export const listAcademicEvents = (yearId) =>
  client.get("/academic-events", { params: yearId ? { year_id: yearId } : {} }).then((r) => r.data);
export const createAcademicEvent = (data) =>
  client.post("/academic-events", data).then((r) => r.data);
export const updateAcademicEvent = (id, data) =>
  client.patch(`/academic-events/${id}`, data).then((r) => r.data);
export const deleteAcademicEvent = (id) => client.delete(`/academic-events/${id}`);

// Examination setup (Phase 2, marks_feature): school-scoped types and
// versioned grade scales. Types/scales deactivate instead of deleting;
// grade scale edits use copy-on-write new versions (see newGradeScaleVersion).
export const listExaminationTypes = () => client.get("/examination-types").then((r) => r.data);
export const createExaminationType = (data) =>
  client.post("/examination-types", data).then((r) => r.data);
export const updateExaminationType = (id, data) =>
  client.patch(`/examination-types/${id}`, data).then((r) => r.data);

export const listGradeScales = () => client.get("/grade-scales").then((r) => r.data);
export const createGradeScale = (data) => client.post("/grade-scales", data).then((r) => r.data);
export const updateGradeScale = (id, data) =>
  client.patch(`/grade-scales/${id}`, data).then((r) => r.data);
export const newGradeScaleVersion = (id) =>
  client.post(`/grade-scales/${id}/new-version`).then((r) => r.data);

export const listGradeLevels = (scaleId) =>
  client.get(`/grade-scales/${scaleId}/levels`).then((r) => r.data);
export const createGradeLevel = (scaleId, data) =>
  client.post(`/grade-scales/${scaleId}/levels`, data).then((r) => r.data);
export const updateGradeLevel = (id, data) =>
  client.patch(`/grade-levels/${id}`, data).then((r) => r.data);
export const deleteGradeLevel = (id) => client.delete(`/grade-levels/${id}`);
