import client from "./client";

export const studentMarks = (studentId) => client.get(`/marks/student/${studentId}`).then((r) => r.data);
export const classMarks = (classId, term) =>
  client.get(`/marks/class/${classId}`, { params: { term } }).then((r) => r.data);
export const upsertMark = (studentId, subjectId, term, score) =>
  client.put(`/marks/${studentId}/${subjectId}`, { term, score }).then((r) => r.data);

// Session marks lifecycle (Phase 4, marks_feature): entries start as
// drafts; submit sends for review; publish is admin-only; corrections go
// through the correction flow. Parents see published, non-withheld rows.
export const createSessionMark = (data) => client.post("/marks/session-marks", data).then((r) => r.data);
export const updateSessionMark = (markId, data) =>
  client.patch(`/marks/${markId}`, data).then((r) => r.data);
export const submitSessionMarks = (sessionId) =>
  client.post(`/marks/sessions/${sessionId}/submit`).then((r) => r.data);
export const publishSessionMarks = (sessionId) =>
  client.post(`/marks/sessions/${sessionId}/publish`).then((r) => r.data);
export const withholdMarks = (markIds, reason) =>
  client.post("/marks/withhold", { mark_ids: markIds, reason }).then((r) => r.data);
export const unwithholdMarks = (markIds) =>
  client.post("/marks/unwithhold", { mark_ids: markIds }).then((r) => r.data);
export const correctMark = (markId, data) =>
  client.post(`/marks/${markId}/correct`, data).then((r) => r.data);

// Bulk CSV import/export (Phase 4): template download, preview-then-commit
// uploads, and formula-guarded exports. Commits are atomic unless an admin
// explicitly opts into partial application.
export const importTemplate = (sessionId) =>
  client.get("/marks/import/template", { params: { session_id: sessionId } }).then((r) => r.data);
export const previewImport = (sessionId, file) => {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return client.post("/marks/import", form).then((r) => r.data);
};
export const commitImport = (batchId, applyPartial = false) =>
  client.post(`/marks/import/${batchId}/commit`, null, { params: { apply_partial: applyPartial } }).then((r) => r.data);
export const exportSessionMarks = (sessionId) =>
  client.get("/marks/export", { params: { session_id: sessionId } }).then((r) => r.data);

// Results aggregation (Phase 6, marks_feature): published, non-withheld
// rows grouped by examination, plus legacy terms and a year aggregate.
// Grade-wise scopes carry distributions, never invented numbers.
export const studentResults = (studentId, params) =>
  client.get(`/results/student/${studentId}`, { params }).then((r) => r.data);
export const examinationResults = (examId) =>
  client.get(`/results/examination/${examId}`).then((r) => r.data);
