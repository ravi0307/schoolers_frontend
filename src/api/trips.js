import client from "./client";

/** GET /trips/mine ?from_date & ?to_date (API base URL includes /api/v1) */
export const listMyTrips = (params) =>
  client.get("/trips/mine", { params }).then((r) => r.data);

/** GET /trips/mine/{trip_id} */
export const getMyTripDetails = (tripId) =>
  client.get(`/trips/mine/${tripId}`).then((r) => r.data);

/** GET /trips/children/{student_id} */
export const getChildTripHistory = (studentId, params) =>
  client.get(`/trips/children/${studentId}`, { params }).then((r) => r.data);
