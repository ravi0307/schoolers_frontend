import client from "./client";

export const classTimetable = (classId) => client.get(`/timetable/class/${classId}`).then((r) => r.data);
export const updateEntry = (entryId, data) =>
  client.patch(`/timetable/entry/${entryId}`, data).then((r) => r.data);
export const clearOverride = (entryId) =>
  client.patch(`/timetable/entry/${entryId}/clear-override`).then((r) => r.data);
