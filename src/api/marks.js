import client from "./client";

export const studentMarks = (studentId) => client.get(`/marks/student/${studentId}`).then((r) => r.data);
export const upsertMark = (studentId, subjectId, term, score) =>
  client.put(`/marks/${studentId}/${subjectId}`, { term, score }).then((r) => r.data);
