import client from "./client";

/** GET /api/v1/trips/mine ?from_date & ?to_date */
export const listMyTrips = (params) =>
  client.get("/api/v1/trips/mine", { params }).then((r) => r.data);

/** GET /api/v1/trips/mine/{trip_id} */
export const getMyTripDetails = (tripId) =>
  client.get(`/api/v1/trips/mine/${tripId}`).then((r) => r.data);
