/** Status pill tone mapping */
export const statusPill = (status) => {
  const map = { completed: "ok", cancelled: "mute", ongoing: "info" };
  return map[status] || "mute";
};

/** Status enum -> human label */
export const statusLabel = (status) => {
  const map = { completed: "Completed", cancelled: "Cancelled", ongoing: "Ongoing" };
  return map[status] || status || "—";
};

/** Normalize trip-list API responses across list and paginated endpoints. */
export const normalizeTripList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

/**
 * Older trips may not have TripStudent snapshots. Keep their current assigned
 * route roster visible, but let the view label it as current rather than
 * presenting mutable route status as historical trip data.
 */
export const resolveTripRoster = (tripStudents, routeStudents) => {
  if (Array.isArray(tripStudents) && tripStudents.length) {
    return { students: tripStudents, isCurrentRouteRoster: false };
  }
  const currentStudents = Array.isArray(routeStudents) ? routeStudents : [];
  return {
    students: currentStudents.map((student) => ({
      student_id: student.student_id,
      student_name: student.student_name,
      boarding_status: student.status === "picked" || student.status === "dropped" ? "picked" : "pending",
      drop_status: student.status === "dropped" ? "dropped" : "pending",
      boarding_at: null,
      drop_at: null,
      boarding_stop_id: null,
      drop_stop_id: null,
    })),
    isCurrentRouteRoster: currentStudents.length > 0,
  };
};

/** Trip type -> human label */
export const tripTypeLabel = (tripType) => {
  const map = { regular: "Regular", field: "Field trip", emergency: "Emergency" };
  return map[tripType] || tripType || "—";
};

/** Build a summary line from trip data */
export const tripSummaryLine = (trip) => {
  const parts = [];
  if (trip.route_name) parts.push(trip.route_name);
  if (trip.trip_date) parts.push(`on ${trip.trip_date}`);
  return parts.join(" ") || "— trip";
};

/** Format ISO date string to display format */
export const formatTripDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return String(dateStr).slice(0, 10);
  }
};

/** Format duration in minutes to HH:MM or "XXm" */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

/** Format stop scheduled time */
export const formatStopTime = (timeStr) => {
  if (!timeStr) return "—";
  try {
    return new Date(timeStr).toLocaleTimeString([], { hour: "numeric", minute: "numeric" });
  } catch {
    return String(timeStr).slice(11, 16);
  }
};
