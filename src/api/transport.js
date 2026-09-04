import client from "./client";

export const listRoutes = () => client.get("/routes").then((r) => r.data);
export const createRoute = (data) => client.post("/routes", data).then((r) => r.data);
export const updateRoute = (id, data) => client.patch(`/routes/${id}`, data).then((r) => r.data);
export const deleteRoute = (id) => client.delete(`/routes/${id}`);
export const listVehicles = () => client.get("/vehicles").then((r) => r.data);
export const createVehicle = (data) => client.post("/vehicles", data).then((r) => r.data);
export const updateVehicle = (id, data) => client.patch(`/vehicles/${id}`, data).then((r) => r.data);
export const deactivateVehicle = (id) => client.patch(`/vehicles/${id}`, { is_active: false }).then((r) => r.data);
export const listPilots = () => client.get("/pilots").then((r) => r.data);
export const createPilot = (data) => client.post("/pilots", data).then((r) => r.data);
export const updatePilot = (id, data) => client.patch(`/pilots/${id}`, data).then((r) => r.data);
export const deactivatePilot = (id) => client.patch(`/pilots/${id}`, { is_active: false }).then((r) => r.data);

export const listStops = (routeId) => client.get(`/routes/${routeId}/stops`).then((r) => r.data);
export const addStop = (routeId, data) => client.post(`/routes/${routeId}/stops`, data).then((r) => r.data);
export const updateStop = (stopId, data) => client.patch(`/routes/stops/${stopId}`, data).then((r) => r.data);
export const removeStop = (stopId) => client.delete(`/routes/stops/${stopId}`);

export const listRouteStudents = (routeId) =>
  client.get(`/routes/${routeId}/students`).then((r) => r.data);
export const addStudentToRoute = (routeId, studentId) =>
  client.post(`/routes/${routeId}/students/${studentId}`).then((r) => r.data);
export const removeStudentFromRoute = (routeId, studentId) =>
  client.delete(`/routes/${routeId}/students/${studentId}`);
export const updatePickupStatus = (routeId, studentId, status) =>
  client.patch(`/routes/${routeId}/students/${studentId}/status`, { status }).then((r) => r.data);
