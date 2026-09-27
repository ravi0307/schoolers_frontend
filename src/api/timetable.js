import client from "./client";

export const classTimetable = (classId) => client.get(`/timetable/class/${classId}`).then((r) => r.data);
/**
 * The class timetable for one calendar week, with holiday flags resolved.
 * Omit `weekStart` to let the server pick the current week.
 */
export const classTimetableWeek = (classId, weekStart) =>
  client
    .get(`/timetable/class/${classId}/week`, { params: weekStart ? { week_start: weekStart } : {} })
    .then((r) => r.data);
export const createWeekPeriod = (classId, data) =>
  client.post(`/timetable/class/${classId}/period`, data).then((r) => r.data);
export const updateEntry = (entryId, data) =>
  client.patch(`/timetable/entry/${entryId}`, data).then((r) => r.data);
export const clearOverride = (entryId) =>
  client.patch(`/timetable/entry/${entryId}/clear-override`).then((r) => r.data);
export const deleteEntry = (entryId) =>
  client.delete(`/timetable/entry/${entryId}`).then((r) => r.data);
