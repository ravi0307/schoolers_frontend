import { useState } from "react";
import PilotShell from "../../components/layout/PilotShell";
import { useApi } from "../../hooks/useApi";
import * as tripsApi from "../../api/trips";
import * as transportApi from "../../api/transport";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import {
  statusPill,
  statusLabel,
  formatTripDate,
  normalizeTripList,
} from "../../utils/tripHistory";
import styles from "./PilotTrips.module.css";

/**
 * My Trips: a pilot's own record of what they drove.
 *
 * Trip details are read-only. Each card opens inline so a pilot can review the
 * operational record and student outcomes without leaving the trip list.
 */

const RANGES = [
  { key: "week", label: "Last 7 days", days: 7 },
  { key: "month", label: "Last 30 days", days: 30 },
  { key: "term", label: "Last 90 days", days: 90 },
];

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
}

function clockTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function elapsedMinutes(start, end) {
  if (!start || !end) return null;
  const duration = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  return Number.isFinite(duration) ? duration : null;
}

function minutesOf(value) {
  const text = String(value || "");
  const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeOnly) return Number(timeOnly[1]) * 60 + Number(timeOnly[2]);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
}

function variance(scheduled, actual) {
  if (!scheduled || !actual) return "—";
  const planned = minutesOf(scheduled);
  const arrived = minutesOf(actual);
  if (planned === null || arrived === null) return "—";
  const delta = arrived - planned;
  if (!delta) return "On time";
  return `${Math.abs(delta)} min ${delta > 0 ? "late" : "early"}`;
}

function boardingLabel(status) {
  return {
    picked: "Boarded",
    did_not_board: "Absent",
    pending: "Not recorded",
  }[status] || status?.replace(/_/g, " ") || "Not recorded";
}

function dropLabel(status) {
  return {
    dropped: "Dropped",
    drop_not_recorded: "Not recorded",
    pending: "Not recorded",
  }[status] || status?.replace(/_/g, " ") || "Not recorded";
}

function outcomeTone(status, kind) {
  if (kind === "boarding") {
    if (status === "picked") return styles.outcomeSuccess;
    if (status === "did_not_board") return styles.outcomeMissed;
    return styles.outcomePending;
  }
  if (status === "dropped") return styles.outcomeSuccess;
  if (status === "drop_not_recorded") return styles.outcomeMissed;
  return styles.outcomePending;
}

function PilotTripDetails({ trip }) {
  const { data, loading, error } = useApi(
    () => Promise.all([
      tripsApi.getMyTripDetails(trip.trip_id),
      trip.route_id ? transportApi.listStops(trip.route_id) : Promise.resolve([]),
    ]).then(([details, stops]) => ({ details, stops })),
    [trip.trip_id, trip.route_id]
  );

  if (loading) return <div className={styles.detailsLoading}><Spinner /></div>;
  if (error) return <div className={styles.detailsLoading}><ErrorBanner message={error} /></div>;
  if (!data) return null;

  const { details, stops } = data;
  const students = Array.isArray(details.students) ? details.students : [];
  const direction = details.direction || trip.direction;
  const isDrop = direction === "drop";
  const scheduledTimeKey = isDrop ? "drop_time" : "pickup_time";
  const scheduledOrderKey = isDrop ? "drop_order" : "pickup_order";
  const configuredStopIdKey = isDrop ? "drop_stop_id" : "pickup_stop_id";
  const actualStopIdKey = isDrop ? "drop_stop_id" : "boarding_stop_id";
  const actualTimeKey = isDrop ? "drop_at" : "boarding_at";
  const actualStatusKey = isDrop ? "drop_status" : "boarding_status";
  const routeStops = (Array.isArray(stops) ? stops : [])
    .filter((stop) => stop[scheduledTimeKey])
    .sort((left, right) => (left[scheduledOrderKey] || 0) - (right[scheduledOrderKey] || 0));
  const boarded = students.filter((student) => student.boarding_status === "picked").length;
  const absentOrMissing = students.filter((student) => student.boarding_status !== "picked").length;
  const duration = elapsedMinutes(details.started_at, details.ended_at);

  return (
    <div className={styles.detail} data-trip-details>
      <section className={styles.operationalSummary} aria-label="Trip timing">
        <div className={styles.tripFacts}>
          <div>
            <span className={styles.sectionLabel}>TRIP TYPE</span>
            <b>{direction ? direction[0].toUpperCase() + direction.slice(1) : "—"}</b>
          </div>
          <div>
            <span className={styles.sectionLabel}>DATE</span>
            <b>{details.trip_date ? new Date(`${details.trip_date}T00:00:00`).toLocaleDateString([], {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }) : formatTripDate(trip.trip_date)}</b>
          </div>
          <div>
            <span className={styles.sectionLabel}>VEHICLE</span>
            <b>{details.vehicle || trip.vehicle || "—"}</b>
          </div>
        </div>
        <div className={styles.timingSummary}>
          <span className={styles.sectionLabel}>TIMING</span>
          <b>
            Started {clockTime(details.started_at)} · Ended {clockTime(details.ended_at)}
            {duration !== null && ` · Total Time: ${duration} ${duration === 1 ? "min" : "mins"}`}
          </b>
        </div>
      </section>

      <section className={styles.detailsSection}>
        <h3 className={styles.sectionLabel}>STOPS TRACKING</h3>
        <div className={styles.detailsTableWrap}>
          <table className={styles.detailsTable}>
            <thead>
              <tr>
                <th scope="col">Stop name</th>
                <th scope="col">Scheduled time</th>
                <th scope="col">Actual arrival</th>
                <th scope="col">Variance / delay</th>
              </tr>
            </thead>
            <tbody>
              {routeStops.map((stop) => {
                const stopId = stop[configuredStopIdKey] ?? stop.stop_id;
                const matchingStudents = students
                  .filter((student) =>
                    student[actualStopIdKey] === stopId &&
                    student[actualStatusKey] &&
                    student[actualStatusKey] !== "pending"
                  );
                const visits = matchingStudents
                  .map((student) => student[actualTimeKey])
                  .filter(Boolean)
                  .sort((left, right) => new Date(left) - new Date(right));
                const actual = visits[0];
                const logged = matchingStudents.length > 0;
                return (
                  <tr key={stopId}>
                    <td>
                      <span className={styles.stopName}>
                        {logged && <span className={styles.stopCheck} aria-label="Stop logged">✓</span>}
                        {stop.stop_name || "—"}
                      </span>
                    </td>
                    <td>{clockTime(stop[scheduledTimeKey])}</td>
                    <td className={actual ? "" : styles.missingValue}>
                      {actual ? clockTime(actual) : "—"}
                    </td>
                    <td className={actual ? "" : styles.missingValue}>
                      {variance(stop[scheduledTimeKey], actual)}
                    </td>
                  </tr>
                );
              })}
              {!routeStops.length && (
                <tr>
                  <td colSpan="4" className={styles.emptyDetails}>No scheduled stops are recorded for this route.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.detailsSection}>
        <h3 className={styles.sectionLabel}>
          STUDENTS ({students.length} EXPECTED · {boarded} BOARDED · {absentOrMissing} ABSENT/MISSING)
        </h3>
        <div className={styles.detailsTableWrap}>
          <table className={styles.detailsTable}>
            <thead>
              <tr>
                <th scope="col">Student name</th>
                <th scope="col">Class/grade</th>
                <th scope="col">Boarding status</th>
                <th scope="col">Dropoff status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td>{student.student_name || `Student #${student.student_id}`}</td>
                  <td>{student.class_name || student.grade_level || student.class || "—"}</td>
                  <td>
                    <span className={`${styles.outcomeBadge} ${outcomeTone(student.boarding_status, "boarding")}`}>
                      {boardingLabel(student.boarding_status)}
                    </span>
                    {student.boarding_at && <span className={styles.outcomeTime}>{clockTime(student.boarding_at)}</span>}
                  </td>
                  <td>
                    <span className={`${styles.outcomeBadge} ${outcomeTone(student.drop_status, "drop")}`}>
                      {dropLabel(student.drop_status)}
                    </span>
                    {student.drop_at && <span className={styles.outcomeTime}>{clockTime(student.drop_at)}</span>}
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan="4" className={styles.emptyDetails}>No student outcomes are recorded for this trip.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function PilotTrips() {
  const [rangeKey, setRangeKey] = useState("week");
  const range = RANGES.find((item) => item.key === rangeKey) || RANGES[0];
  const [openId, setOpenId] = useState(null);

  const { data: listData, loading, error, refetch } = useApi(
    () =>
      tripsApi.listMyTrips({
        from_date: daysAgo(range.days),
        to_date: new Date().toISOString().slice(0, 10),
      }),
    [rangeKey]
  );

  const items = normalizeTripList(listData);
  const totalTrips = Array.isArray(listData)
    ? items.length
    : listData?.total ?? items.length;
  const pager = usePagination(items);

  function toggleTrip(trip) {
    if (trip.status !== "completed") return;
    setOpenId((current) => current === trip.trip_id ? null : trip.trip_id);
  }

  function handleCardKeyDown(event, trip) {
    if (trip.status !== "completed" || (event.key !== "Enter" && event.key !== " ")) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    toggleTrip(trip);
  }

  return (
    <PilotShell>
      <div className={styles.head}>
        <div>
          <div className="scr-title">My Trips</div>
          <div className="scr-sub">
            {listData ? `${totalTrips} trip${totalTrips === 1 ? "" : "s"} · ${range.label.toLowerCase()}` : range.label}
          </div>
        </div>
      </div>

      <div className={styles.ranges} role="group" aria-label="Date range">
        {RANGES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.rangeChip}
            aria-pressed={item.key === rangeKey}
            onClick={() => {
              setOpenId(null);
              setRangeKey(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <Empty>No trips in this range.</Empty>
          ) : (
            <>
              <ul className={styles.list}>
                {pager.pageItems.map((trip) => {
                  const completed = trip.status === "completed";
                  const expanded = openId === trip.trip_id;
                  return (
                    <li className={styles.row} key={trip.trip_id}>
                      <article
                        className={`${styles.tripCard} ${completed ? styles.tripCardInteractive : ""}`}
                        role={completed ? "button" : undefined}
                        tabIndex={completed ? 0 : undefined}
                        aria-expanded={completed ? expanded : undefined}
                        aria-controls={completed ? `pilot-trip-details-${trip.trip_id}` : undefined}
                        onClick={() => toggleTrip(trip)}
                        onKeyDown={(event) => handleCardKeyDown(event, trip)}
                      >
                        <div className={styles.rowHead}>
                          <span className={styles.rowTitle}>
                            <b>{trip.route_name || `Route ${trip.route_id}`}</b>
                            <span>
                              {formatTripDate(trip.trip_date)} ·{" "}
                              {trip.direction
                                ? trip.direction[0].toUpperCase() + trip.direction.slice(1)
                                : trip.trip_type || "Trip"}
                            </span>
                          </span>
                          <span className={styles.rowActions}>
                            <Pill tone={statusPill(trip.status)}>{statusLabel(trip.status)}</Pill>
                            {completed && (
                              <span className={styles.detailsLink}>
                                {expanded ? "Hide Details" : "View Details"}
                              </span>
                            )}
                          </span>
                        </div>
                        {expanded && (
                          <div
                            id={`pilot-trip-details-${trip.trip_id}`}
                            className={styles.expandedDetails}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <PilotTripDetails trip={trip} />
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
              <Pagination {...pager} />
            </>
          )}
          <div className={styles.refreshRow}>
            <button type="button" className="btn ghost block" onClick={refetch}>
              Refresh
            </button>
          </div>
        </>
      )}
    </PilotShell>
  );
}

/** Helper used by the hook; kept for consistency with the codebase. */
export function apiErrorMessage(err) {
  return err?.response?.data?.detail || err?.message || "Something went wrong";
}
