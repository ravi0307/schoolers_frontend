import { Fragment, useMemo, useState } from "react";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import PageHeader from "../../components/ui/PageHeader";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import Modal from "../../components/ui/Modal";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import { resolveTripRoster } from "../../utils/tripHistory";
import styles from "./AdminTripHistory.module.css";

const EMPTY_LIST = [];
const STATUS_LABELS = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function fullDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function formatClock(value, twelveHour = false) {
  if (!value) return "—";
  const text = String(value);
  const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  const date = timeOnly
    ? new Date(`1970-01-01T${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleTimeString(twelveHour ? "en-US" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(twelveHour ? { hour12: true } : {}),
  });
}

function getStatusClass(status) {
  return {
    completed: styles.statusCompleted,
    in_progress: styles.statusInProgress,
    cancelled: styles.statusCancelled,
    scheduled: styles.statusScheduled,
  }[status] || styles.statusScheduled;
}

function tripSummary(trip, cancellationReason) {
  if (trip.status === "cancelled" && (cancellationReason || trip.cancellation_reason)) {
    return `Cancelled: ${cancellationReason || trip.cancellation_reason}`;
  }
  if (trip.outcome_summary) return trip.outcome_summary.replace(/\bpicked\b/g, "boarded");
  if (trip.status === "in_progress") return "Trip is still running";
  if (trip.status === "cancelled") return "Cancelled";
  return "—";
}

function TripSummary({ trip }) {
  const cancelled = trip.status === "cancelled";
  const { data, loading, error } = useApi(
    () => cancelled ? transportApi.getTripDetails(trip.trip_id) : Promise.resolve(null),
    [trip.trip_id, cancelled]
  );

  if (cancelled && loading) return "Cancelled";
  if (cancelled && error) {
    return <span className={styles.summaryError} role="alert">Could not load cancellation note: {error}</span>;
  }
  return tripSummary(trip, data?.cancellation_reason);
}

function boardingLabel(status) {
  return {
    picked: "Boarded",
    did_not_board: "Did not board",
    pending: "Not recorded",
  }[status] || status?.replace(/_/g, " ") || "Not recorded";
}

function dropLabel(status) {
  return {
    dropped: "Dropped",
    drop_not_recorded: "Drop not recorded",
    pending: "Not recorded",
  }[status] || status?.replace(/_/g, " ") || "Not recorded";
}

function timeInMinutes(value) {
  const text = String(value || "");
  const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeOnly) return Number(timeOnly[1]) * 60 + Number(timeOnly[2]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getHours() * 60 + parsed.getMinutes();
}

function stopDelay(scheduled, actual) {
  if (!scheduled || !actual) return "—";
  const scheduledMinutes = timeInMinutes(scheduled);
  const actualMinutes = timeInMinutes(actual);
  if (scheduledMinutes === null || actualMinutes === null) return "—";
  const delay = actualMinutes - scheduledMinutes;
  if (!delay) return "On time";
  return `${Math.abs(delay)} min ${delay > 0 ? "late" : "early"}`;
}

function TripDetails({ trip }) {
  const { data, loading, error } = useApi(
    async () => {
      const [details, stops] = await Promise.all([
        transportApi.getTripDetails(trip.trip_id),
        trip.route_id ? transportApi.listStops(trip.route_id) : Promise.resolve([]),
      ]);
      const tripStudents = Array.isArray(details.students) ? details.students : [];
      const routeStudents = !tripStudents.length && trip.route_id
        ? await transportApi.listRouteStudents(trip.route_id)
        : [];
      const roster = resolveTripRoster(tripStudents, routeStudents);
      return {
        details: { ...details, students: roster.students },
        stops,
        isCurrentRouteRoster: roster.isCurrentRouteRoster,
      };
    },
    [trip.trip_id, trip.route_id]
  );
  const { data: studentRecords, error: studentsError } = useApi(
    () => peopleApi.listStudents(),
    []
  );
  const { data: classRecords, error: classesError } = useApi(
    () => academicsApi.listClasses(),
    []
  );

  if (loading) return <div className={styles.detailLoading}><Spinner /></div>;
  if (error) return <div className={styles.detailLoading}><ErrorBanner message={error} /></div>;
  if (!data) return null;

  const { details, stops, isCurrentRouteRoster } = data;
  const direction = details.direction || trip.direction;
  const isDrop = direction === "drop";
  const stopTimeKey = isDrop ? "drop_time" : "pickup_time";
  const stopOrderKey = isDrop ? "drop_order" : "pickup_order";
  const stopIdKey = isDrop ? "drop_stop_id" : "pickup_stop_id";
  const actualStopKey = isDrop ? "drop_stop_id" : "boarding_stop_id";
  const actualTimeKey = isDrop ? "drop_at" : "boarding_at";
  const actualStatusKey = isDrop ? "drop_status" : "boarding_status";
  const scheduledStops = (Array.isArray(stops) ? stops : [])
    .filter((stop) => stop[stopTimeKey])
    .sort((left, right) => (left[stopOrderKey] || 0) - (right[stopOrderKey] || 0));
  const students = Array.isArray(details.students) ? details.students : [];
  const allStudents = Array.isArray(studentRecords) ? studentRecords : [];
  const classes = Array.isArray(classRecords) ? classRecords : [];
  const boarded = students.filter((student) => student.boarding_status === "picked").length;
  const didNotBoard = students.filter((student) => student.boarding_status === "did_not_board").length;
  const duration = details.duration_minutes ??
    (details.started_at && details.ended_at
      ? Math.max(0, Math.round((new Date(details.ended_at) - new Date(details.started_at)) / 60000))
      : null);

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailSummary}>
        <section>
          <h2>Route</h2>
          <p><b>{details.route_name || trip.route_name || "—"}</b></p>
          <p>{direction ? direction[0].toUpperCase() + direction.slice(1) : "—"}</p>
          <p>{fullDate(details.trip_date || trip.trip_date)}</p>
          <p>Pilot: {details.driver_name || trip.driver_name || "—"}</p>
          <p>Vehicle: {details.vehicle || trip.vehicle || "—"}</p>
        </section>
        <section>
          <h2>Timing</h2>
          <p>Started {formatClock(details.started_at)} · Ended {formatClock(details.ended_at)}</p>
          {duration !== null && <p>Ran for {duration} min</p>}
        </section>
      </div>

      <section className={styles.detailsSection}>
        <h2>Stops</h2>
        <div className={styles.nestedTableWrap}>
          <table className={styles.nestedTable}>
            <thead>
              <tr><th scope="col">Stop</th><th scope="col">Scheduled</th><th scope="col">Actual</th><th scope="col">Delay</th></tr>
            </thead>
            <tbody>
              {scheduledStops.map((stop) => {
                const stopId = stop[stopIdKey] ?? stop.stop_id;
                const actuals = students
                  .filter((student) =>
                    student[actualStopKey] === stopId &&
                    student[actualStatusKey] !== "pending" &&
                    student[actualTimeKey]
                  )
                  .map((student) => student[actualTimeKey])
                  .sort((left, right) => new Date(left) - new Date(right));
                const actual = actuals[0];
                return (
                  <tr key={stopId}>
                    <td>{stop.stop_name || "—"}</td>
                    <td>{formatClock(stop[stopTimeKey], true)}</td>
                    <td className={actual ? "" : styles.missingCell}>
                      {actual ? formatClock(actual, true) : "—"}
                    </td>
                    <td className={actual ? "" : styles.missingCell}>
                      {stopDelay(stop[stopTimeKey], actual)}
                    </td>
                  </tr>
                );
              })}
              {!scheduledStops.length && (
                <tr><td colSpan="4" className={styles.noStops}>No scheduled stops recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.detailsSection}>
        <h2>
          Children ({students.length} expected, {boarded} boarded, {didNotBoard} did not board)
        </h2>
        {isCurrentRouteRoster && (
          <p className={styles.rosterNotice} role="note">
            Trip-level child outcomes were not saved for this older trip. This is the route’s current roster and status, not a historical snapshot.
          </p>
        )}
        {studentsError && <ErrorBanner message={`Could not load child class details: ${studentsError}`} />}
        {classesError && <ErrorBanner message={`Could not load class names: ${classesError}`} />}
        <div className={styles.nestedTableWrap}>
          <table className={styles.nestedTable}>
            <thead>
              <tr><th scope="col">Child</th><th scope="col">Outcome</th><th scope="col">Boarded</th><th scope="col">Dropped</th></tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const record = allStudents.find((item) => item.student_id === student.student_id);
                const className = record?.class_name ||
                  record?.grade_level ||
                  classes.find((item) => item.class_id === record?.class_id)?.name;
                const grade = className || (record?.class_id ? `Class ${record.class_id}` : "Grade not recorded");
                const boardedTime = student.boarding_at ? formatClock(student.boarding_at, true) : null;
                const droppedTime = student.drop_at ? formatClock(student.drop_at, true) : null;
                return (
                  <tr key={student.student_id}>
                    <td>
                      <span className={styles.childName}>
                        {student.student_name || `Child #${student.student_id}`}
                      </span>
                      <span className={styles.childGrade}>{grade}</span>
                    </td>
                    <td>
                      <span className={`${styles.outcomeLabel} ${student.boarding_status === "picked" ? styles.outcomeSuccess : student.boarding_status === "did_not_board" ? styles.outcomeMissed : styles.outcomePending}`}>
                        {boardingLabel(student.boarding_status)}
                      </span>
                      {student.boarding_status !== "did_not_board" && (
                        <span className={`${styles.outcomeLabel} ${student.drop_status === "dropped" ? styles.outcomeSuccess : student.drop_status === "drop_not_recorded" ? styles.outcomeMissed : styles.outcomePending}`}>
                          {dropLabel(student.drop_status)}
                        </span>
                      )}
                    </td>
                    <td className={boardedTime ? "" : styles.missingCell}>
                      {boardedTime || "—"}
                    </td>
                    <td className={droppedTime ? "" : styles.missingCell}>
                      {droppedTime || "—"}
                    </td>
                  </tr>
                );
              })}
              {!students.length && (
                <tr><td colSpan="4" className={styles.noStops}>No child outcomes recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(details.cancellation_reason || details.reopen_reason) && (
        <section className={styles.auditNotes} aria-label="Trip changes">
          {details.cancellation_reason && <p>Cancelled: {details.cancellation_reason}</p>}
          {details.reopen_reason && <p>Reopened: {details.reopen_reason}</p>}
        </section>
      )}
    </div>
  );
}

export default function AdminTripHistory() {
  const { data, loading, error, refetch } = useApi(() => transportApi.listAdminTrips(), []);
  const trips = Array.isArray(data) ? data : EMPTY_LIST;
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [reopenTrip, setReopenTrip] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [reopenError, setReopenError] = useState("");

  const routes = useMemo(
    () => [...new Set(trips.map((trip) => trip.route_name).filter(Boolean))].sort(),
    [trips]
  );
  const filteredTrips = useMemo(
    () => trips.filter((trip) =>
      (!filterRoute || trip.route_name === filterRoute) &&
      (!filterStatus || trip.status === filterStatus) &&
      (!filterDirection || trip.direction === filterDirection) &&
      (!filterFrom || trip.trip_date >= filterFrom) &&
      (!filterTo || trip.trip_date <= filterTo)
    ),
    [trips, filterRoute, filterStatus, filterDirection, filterFrom, filterTo]
  );
  const pager = usePagination(filteredTrips, 20);

  async function handleReopen(event) {
    event.preventDefault();
    if (!reopenTrip) return;
    setReopenLoading(true);
    setReopenError("");
    try {
      await transportApi.reopenAdminTrip(
        reopenTrip.trip_id,
        reopenReason.trim() || "Reopened by admin"
      );
      setReopenTrip(null);
      setSelectedTripId(null);
      setReopenReason("");
      refetch();
    } catch (requestError) {
      setReopenError(
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Could not reopen this trip."
      );
    } finally {
      setReopenLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        className={styles.pageHeader}
        title="Trip History"
        subtitle="Every commute run your school has recorded, and the children on each. A trip records what the pilot tapped, so a child who boarded but was never dropped is shown as unrecorded rather than assumed to have gone home. Only a cancellation can be changed, and only if it was made today."
      />

      <section className={styles.filtersBar} aria-label="Trip filters">
        <label>
          Route
          <select className={styles.filterSelect} value={filterRoute} onChange={(event) => setFilterRoute(event.target.value)}>
            <option value="">All routes</option>
            {routes.map((route) => <option key={route} value={route}>{route}</option>)}
          </select>
        </label>
        <label>
          Status
          <select className={styles.filterSelect} value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">All statuses</option>
            {["scheduled", "in_progress", "completed", "cancelled"].map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select className={styles.filterSelect} value={filterDirection} onChange={(event) => setFilterDirection(event.target.value)}>
            <option value="">Both directions</option>
            <option value="pickup">Pickup</option>
            <option value="drop">Drop</option>
          </select>
        </label>
        <label>
          From
          <input className={styles.filterInput} type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} />
        </label>
        <label>
          To
          <input className={styles.filterInput} type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} />
        </label>
      </section>

      {loading && <div className={styles.messageCard}><Spinner /></div>}
      {error && <div className={styles.messageCard}><ErrorBanner message={error} /></div>}
      {!loading && !error && filteredTrips.length === 0 && (
        <div className={styles.messageCard}><Empty>No trips found.</Empty></div>
      )}
      {!loading && !error && filteredTrips.length > 0 && (
        <section className={styles.tripTable} aria-label="Trip history">
          <div className={styles.tableScroll} role="region" aria-label="Trip history table" tabIndex="0">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Route</th>
                  <th scope="col">Status</th>
                  <th scope="col">What happened</th>
                  <th scope="col">Driver</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((trip) => {
                  const expanded = selectedTripId === trip.trip_id;
                  const status = trip.status || "";
                  return (
                    <Fragment key={trip.trip_id}>
                      <tr className={styles.tripRow}>
                        <td className={styles.tripDate}>{displayDate(trip.trip_date)}</td>
                        <td>
                          <span className={styles.routeName}>{trip.route_name || "—"}</span>
                          <span className={styles.routeType}>
                            {trip.direction ? trip.direction[0].toUpperCase() + trip.direction.slice(1) : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${getStatusClass(status)}`}>
                            {STATUS_LABELS[status] || status.replace(/_/g, " ") || "—"}
                          </span>
                        </td>
                        <td className={styles.summaryCell}><TripSummary trip={trip} /></td>
                        <td>{trip.driver_name || "—"}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.detailsButton}
                              aria-expanded={expanded}
                              aria-controls={`trip-details-${trip.trip_id}`}
                              onClick={() => setSelectedTripId(expanded ? null : trip.trip_id)}
                            >
                              {expanded ? "Hide" : "Details"}
                            </button>
                            {status === "cancelled" && (
                              <button
                                type="button"
                                className={styles.reopenButton}
                                onClick={() => {
                                  setReopenTrip(trip);
                                  setReopenReason("");
                                  setReopenError("");
                                }}
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr id={`trip-details-${trip.trip_id}`} className={styles.detailRow}>
                          <td colSpan="6"><TripDetails trip={trip} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pager} />
        </section>
      )}

      {reopenTrip && (
        <Modal
          onClose={() => !reopenLoading && setReopenTrip(null)}
          titleId="reopen-trip-title"
          panelClassName={styles.reopenModal}
        >
          <form onSubmit={handleReopen}>
            <h2 id="reopen-trip-title">Reopen cancelled trip</h2>
            <p className={styles.reopenDescription}>
              Reopen the {reopenTrip.direction || "trip"} trip on {displayDate(reopenTrip.trip_date)} for{" "}
              {reopenTrip.route_name || "this route"}? It will return to In progress on the same trip record,
              so the driver can continue logging the run. Who reopened it, when, and why are recorded permanently.
            </p>
            <label className={styles.reasonLabel} htmlFor="reopen-reason">Reason (optional)</label>
            <input
              id="reopen-reason"
              className={styles.reasonInput}
              type="text"
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="Add a note for the trip record"
            />
            {reopenError && <p className={styles.reopenError} role="alert">{reopenError}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={reopenLoading}
                onClick={() => setReopenTrip(null)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.modalReopenButton} disabled={reopenLoading}>
                {reopenLoading ? "Reopening…" : "Reopen"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
