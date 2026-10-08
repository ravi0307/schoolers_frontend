import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import * as tripsApi from "../../api/trips";
import { useParentContext } from "../../context/ParentContext";
import PageHeader from "../../components/ui/PageHeader";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { formatTripDate, normalizeTripList } from "../../utils/tripHistory";
import styles from "./ParentTripHistory.module.css";

const RANGES = [
  { key: "week", label: "Last 7 days", days: 7 },
  { key: "month", label: "Last 30 days", days: 30 },
  { key: "term", label: "Last 90 days", days: 90 },
];

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function ParentTripHistory() {
  const { selectedChild } = useParentContext();
  const [rangeKey, setRangeKey] = useState("term");
  const range = RANGES.find((item) => item.key === rangeKey) || RANGES[0];
  const { data, loading, error } = useApi(
    () => selectedChild
      ? tripsApi.getChildTripHistory(selectedChild.student_id, {
          from_date: daysAgo(range.days),
          to_date: new Date().toISOString().slice(0, 10),
        })
      : Promise.resolve([]),
    [rangeKey, selectedChild?.student_id]
  );
  const trips = normalizeTripList(data);
  const pager = usePagination(trips);

  return (
    <>
      <PageHeader
        title="Trip History"
        subtitle={selectedChild ? `Completed trips for ${selectedChild.name}` : "Completed school trips"}
      />

      <div className={styles.periodFilters} role="group" aria-label="Trip date range">
        {RANGES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.rangeChip}
            data-selected={item.key === rangeKey}
            aria-pressed={item.key === rangeKey}
            onClick={() => setRangeKey(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && !selectedChild && <Empty>No children are linked to this account.</Empty>}
      {!loading && !error && selectedChild && trips.length === 0 && (
        <Empty>No completed trips found for the selected period.</Empty>
      )}
      {!loading && !error && trips.length > 0 && (
        <>
          <div className={styles.tripList}>
            {pager.pageItems.map((trip) => (
              <article className={styles.tripItem} key={trip.trip_id}>
                <div className={styles.tripRow}>
                  <span className={styles.tripDate}>{formatTripDate(trip.trip_date)}</span>
                  <span className={styles.tripRoute}>{trip.route_name || "—"}</span>
                  <span className={styles.tripDirection}>
                    {trip.direction ? trip.direction[0].toUpperCase() + trip.direction.slice(1) : "—"}
                  </span>
                  <span className={styles.tripStatus}>
                    <Pill tone="ok">{trip.status?.replace(/_/g, " ") || "Completed"}</Pill>
                  </span>
                </div>
                <div className={styles.detailPanel}>
                  <h2 className={styles.detailsHeading}>Trip details</h2>
                  <div className={styles.tripFacts}>
                    <div className={styles.infoRow}>
                      <b>Driver</b>
                      <span>{trip.driver_name || "—"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <b>Vehicle</b>
                      <span>{trip.vehicle || "—"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <b>Started</b>
                      <span>{trip.started_at ? new Date(trip.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <b>Ended</b>
                      <span>{trip.ended_at ? new Date(trip.ended_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span>
                    </div>
                  </div>
                  <h2 className={styles.detailsHeading}>Child outcomes</h2>
                  <div className={styles.infoRow}>
                    <b>Pickup</b>
                    <span className={styles.outcome}>
                      <span>{trip.boarding_stop_name || "Stop not recorded"}</span>
                      <span>{formatOutcome(trip.boarding_status)}</span>
                      {trip.boarding_at && <time dateTime={trip.boarding_at}>{formatTime(trip.boarding_at)}</time>}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <b>Drop-off</b>
                    <span className={styles.outcome}>
                      <span>{trip.drop_stop_name || "Stop not recorded"}</span>
                      <span>{formatOutcome(trip.drop_status)}</span>
                      {trip.drop_at && <time dateTime={trip.drop_at}>{formatTime(trip.drop_at)}</time>}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination {...pager} />
        </>
      )}
    </>
  );
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatOutcome(value) {
  const labels = {
    picked: "Boarded",
    did_not_board: "Did not board",
    pending: "Not recorded",
    dropped: "Dropped",
    drop_not_recorded: "Drop not recorded",
  };
  return labels[value] || value?.replace(/_/g, " ") || "Not recorded";
}
