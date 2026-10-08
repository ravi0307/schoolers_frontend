import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import * as tripsApi from "../../api/trips";
import { useParentContext } from "../../context/ParentContext";
import PageHeader from "../../components/ui/PageHeader";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { formatTripDate } from "../../utils/tripHistory";
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
  const [rangeKey, setRangeKey] = useState("week");
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
  const trips = Array.isArray(data) ? data : [];
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
                  <span>{trip.direction || "—"}</span>
                  <span className={styles.tripStatus}>
                    <Pill tone="ok">{trip.status || "Completed"}</Pill>
                  </span>
                </div>
                <div className={styles.detailPanel}>
                  <div className={styles.infoRow}>
                    <span>Pickup</span>
                    <span>
                      {trip.boarding_stop_name || "—"} · {trip.boarding_status || "—"}
                      {trip.boarding_at ? ` at ${new Date(trip.boarding_at).toLocaleTimeString()}` : ""}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Drop-off</span>
                    <span>
                      {trip.drop_stop_name || "—"} · {trip.drop_status || "—"}
                      {trip.drop_at ? ` at ${new Date(trip.drop_at).toLocaleTimeString()}` : ""}
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
