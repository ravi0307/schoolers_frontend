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

// Examinations and sessions (Phase 3, marks_feature): examinations hold
// academic context; sessions are the schedulable units and the conflict
// engine reads them. Writes return { session, warnings }; warnings are
// computed, never stored.
export const listExaminations = (yearId) =>
  client.get("/examinations", { params: yearId ? { year_id: yearId } : {} }).then((r) => r.data);
export const createExamination = (data) => client.post("/examinations", data).then((r) => r.data);
export const updateExamination = (id, data) =>
  client.patch(`/examinations/${id}`, data).then((r) => r.data);
export const publishExamination = (id) => client.post(`/examinations/${id}/publish`).then((r) => r.data);
export const unpublishExamination = (id) =>
  client.post(`/examinations/${id}/unpublish`).then((r) => r.data);
export const cancelExamination = (id, reason) =>
  client.post(`/examinations/${id}/cancel`, { reason }).then((r) => r.data);
export const deleteExamination = (id) => client.delete(`/examinations/${id}`);

export const listExaminationSessions = (examId) =>
  client.get(`/examinations/${examId}/sessions`).then((r) => r.data);
export const createExaminationSession = (examId, data) =>
  client.post(`/examinations/${examId}/sessions`, data).then((r) => r.data);
export const updateExaminationSession = (id, data) =>
  client.patch(`/sessions/${id}`, data).then((r) => r.data);
export const deleteExaminationSession = (id) => client.delete(`/sessions/${id}`);
export const completeExaminationSession = (id) =>
  client.post(`/sessions/${id}/complete`).then((r) => r.data);
export const listSessionVersions = (id) =>
  client.get(`/sessions/${id}/versions`).then((r) => r.data);
export const examinationTimetable = (params) =>
  client.get("/examinations/timetable", { params }).then((r) => r.data);

// Subject offerings and enrollment (Phase 5, marks_feature): offerings say
// what a class teaches; enrollment says who takes what. Both are opt-in:
// classes/students without rows keep exact legacy behavior, and entry grids
// refuse non-enrolled students instead of recording zeros.
export const listClassOfferings = (classId) =>
  client.get(`/classes/${classId}/subjects`).then((r) => r.data);
export const setClassOffering = (classId, data) =>
  client.post(`/classes/${classId}/subjects`, data).then((r) => r.data);
export const deleteClassOffering = (classId, subjectId) =>
  client.delete(`/classes/${classId}/subjects/${subjectId}`);

export const listStudentSubjects = (studentId, yearId) =>
  client.get(`/students/${studentId}/subjects`, { params: { year_id: yearId } }).then((r) => r.data);
