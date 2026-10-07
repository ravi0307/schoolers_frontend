import { useState, useEffect } from "react";
import PilotShell from "../../components/layout/PilotShell";
import { useApi } from "../../hooks/useApi";
import * as tripsApi from "../../api/trips";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import {
  statusPill,
  statusLabel,
  tripTypeLabel,
  tripSummaryLine,
  formatTripDate,
  formatDuration,
  formatStopTime,
} from "../../utils/tripHistory";
import styles from "./PilotTrips.module.css";

/**
 * My Trips: a pilot's own record of what they drove.
 *
 * Read-only on purpose. The screen exists so a pilot can answer "did I do that
 * run, and what happened on it" without asking an admin, and a record that can
 * be edited from a phone in a lay-by is not a record. Every change is made on
 * Pick & Drop, while the run is happening.
 *
 * What a pilot sees of their own trips is not quite what an admin sees. Names
 * are sent by the server only while the pilot still holds the route, so a trip
 * from a route they have since been moved off shows counts and stops but no
 * child names. That narrowing is the server's decision and this page just
 * renders whichever it sent, rather than deciding for itself who should see
 * what.
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

export default function PilotTrips() {
  const [rangeKey, setRangeKey] = useState("week");
  const range = RANGES.find((r) => r.key === rangeKey);
  const [openId, setOpenId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const { data: listData, loading, error, refetch } = useApi(
    () =>
      tripsApi.listMyTrips({
        from_date: daysAgo(range.days),
        to_date: new Date().toISOString().slice(0, 10),
        pageSize: 50,
      }),
    [rangeKey]
  );

  // Selected trip detail data – fetched on demand
  const [detailData, setDetailData] = useState(null);

  // Fetch detail only when a trip is selected
  useEffect(() => {
    if (openId) {
      setDetailLoading(true);
      setDetailError(null);
      tripsApi.getMyTripDetails(openId).then(
        (res) => setDetailData(res),
        (err) => setDetailError(apiErrorMessage(err))
      ).finally(() => setDetailLoading(false));
    } else {
      setDetailData(null);
    }
  }, [openId]);

  const items = listData?.items || [];
  const pager = usePagination(items);

  return (
    <PilotShell>
      <div className={styles.head}>
        <div>
          <div className="scr-title">My Trips</div>
          <div className="scr-sub">
            {listData ? `${listData.total} trip${listData.total === 1 ? "" : "s"} · ${range.label.toLowerCase()}` : range.label}
          </div>
        </div>
      </div>

      <div className={styles.ranges} role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={styles.rangeChip}
            aria-pressed={r.key === rangeKey}
            onClick={() => {
              setOpenId(null);
              setRangeKey(r.key);
              setDetailData(null);
            }}
          >
            {r.label}
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
                {pager.pageItems.map((trip) => (
                  <li className={styles.row} key={trip.trip_id}>
                    <button type="button" className={styles.rowHead} onClick={() => setOpenId(openId === trip.trip_id ? null : trip.trip_id)} aria-expanded={openId === trip.trip_id}>
                      <span className={styles.rowTitle}>
                        <b>{trip.route_name || `Route ${trip.route_id}`}</b>
                        <span>{formatTripDate(trip.trip_date)} · {tripTypeLabel(trip.trip_type)}</span>
                      </span>
                      <Pill tone={statusPill(trip.status)}>{statusLabel(trip.status)}</Pill>
                    </button>
                    {openId === trip.trip_id && (
                      detailLoading && (
                        <div className={styles.detail}>
                          <p>Loading trip details…</p>
                        </div>
                      )}
                      {detailError && (
                        <div className={styles.detail}>
                          <ErrorBanner message={detailError} />
                        </div>
                      )}
                      {!detailLoading && !detailError && detailData && (
                        <div className={styles.detail}>
                          <div className="trip-info">
                            <div className="info-row">
                              <span>Date:</span>
                              <span>{formatTripDate(detailData.trip_date)}</span>
                            </div>
                            <div className="info-row">
                              <span>Route:</span>
                              <span>{detailData.route_name || `Route ${detailData.route_id}`}</span>
                            </div>
                            <div className="info-row">
                              <span>Direction:</span>
                              <span>{detailData.direction || "—"}</span>
                            </div>
                            <div className="info-row">
                              <span>Status:</span>
                              <span><Pill tone={statusPill(detailData.status)}>{statusLabel(detailData.status)}</Pill></span>
                            </div>
                            <div className="info-row">
                              <span>Driver:</span>
                              <span>{detailData.driver_name || "—"}</span>
                            </div>
                            <div className="info-row">
                              <span>Vehicle:</span>
                              <span>{detailData.vehicle || "—"}</span>
                            </div>
                            <div className="info-row">
                              <span>Start:</span>
                              <span>{detailData.started_at ? new Date(detailData.started_at).toLocaleString() : "—"}</span>
                            </div>
                            <div className="info-row">
                              <span>End:</span>
                              <span>{detailData.ended_at ? new Date(detailData.ended_at).toLocaleString() : "—"}</span>
                            </div>
                            {detailData.duration_minutes !== null && detailData.duration_minutes !== undefined && (
                              <div className="info-row">
                                <span>Duration:</span>
                                <span>{formatDuration(detailData.duration_minutes)}</span>
                              </div>
                            )}
                          </div>

                          <div className="student-roster">
                            <h4>Students</h4>
                            {detailData.students ? (
                              <ul>
                                {detailData.students.map((s) => (
                                  <li key={s.student_id}>
                                    <b>{s.student_name || `Child #${s.student_id}`}</b>
                                    <span>
                                      {s.boarding_status ? `Boarded at ${s.boarding_stop_name || "—"} ` : ""}
                                      {s.drop_status ? `Dropped at ${s.drop_stop_name || "—"}` : ""}
                                      {s.outcome ? `Outcome: ${s.outcome}` : ""}
                                      <br />
                                      {s.boarding_at ? `Boarded: ${new Date(s.boarding_at).toLocaleTimeString()}` : ""}
                                      {s.drop_at ? `Dropped: ${new Date(s.drop_at).toLocaleTimeString()}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>No student outcomes recorded for this trip.</p>
                            )}
                          </div>
                        </div>
                      )}
                      {openId === trip.trip_id && !detailLoading && !detailError && !detailData && (
                        <div className={styles.detail}>
                          <p>Select a trip to view details.</p>
                        </div>
                      )}
                    </li>
                  </li>
                ))}
              </ul>
              <Pagination {...pager} />
            </>
          )}
          <button type="button" className="btn ghost block" onClick={refetch}>
            Refresh
          </button>
        </>
      )}
    </PilotShell>
  );
}

/** Helper used by the hook; kept for consistency with the codebase. */
export function apiErrorMessage(err) {
  return err?.response?.data?.detail || err?.message || "Something went wrong";
}
