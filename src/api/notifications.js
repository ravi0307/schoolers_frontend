import client from "./client";

export const listNotifications = (schoolId) =>
  client.get(`/notifications/school/${schoolId}`).then((r) => r.data);
export const sendNotification = (schoolId, data) =>
  client.post(`/notifications/school/${schoolId}`, data).then((r) => r.data);
export const markRead = (id) => client.patch(`/notifications/${id}/read`).then((r) => r.data);
