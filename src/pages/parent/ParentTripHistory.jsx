import { useState, useEffect } from "react";
import ParentShell from "../../components/layout/ParentShell";
import { useApi } from "../../hooks/useApi";
import * as tripsApi from "../../api/trips";
import { useParentContext } from "../../context/ParentContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { formatTripDate, formatDuration, statusPill, statusLabel } from "../../utils/tripHistory";
import styles from "./ParentTripHistory.module.css";

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

export default function ParentTripHistory() {
  const { selectedChild, kids } = useParentContext();
  const [rangeKey, setRangeKey] = useState("week");
  const range = RANGES.find((r) => r.key === rangeKey);
  const [openId, setOpenId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState(null);

  const child = selectedChild || (kids && kids.length > 0 ? kids[0] : null);

  const { data: listData, loading, error, refetch } = useApi(
    () =>
      tripsApi.getChildTripHistory(
        child?.student_id || "",
        {
          from_date: daysAgo(range.days),
          to_date: new Date().toISOString().slice(0, 10),
        }
      ),
    [rangeKey, child?.student_id]
  );

  // Fetch detail only when a trip is selected
  useEffect(() => {
    if (openId) {
      setDetailLoading(true);
      setDetailError(null);
      tripsApi.getMyTripDetails(openId).then(
        (res) => setDetailData(res),
        (err) => setDetailError("Failed to load trip details")
      ).finally(() => setDetailLoading(false));
    } else {
      setDetailData(null);
    }
  }, [openId]);

  const items = listData?.items || [];
  const pager = usePagination(items);

  return (
    <ParentShell>
      <div className="page-header">
        <div className="scr-title">Trip History</div>
        <div className="scr-sub">Completed school trips for your child</div>
      </div>

      {selectedChild ? (
        <div className="child-selector">
          <span>Child:</span>
          <select
            onChange={(e) => {
              setSelectedChild(kids.find((k) => k.student_id === e.target.value) || null);
              setDetailData(null);
            }}
          >
            <option value="">All children</option>
            {kids.map((child) => (
              <option key={child.student_id} value={child.student_id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p>Select a child above to view trip history.</p>
      )}

      <div className="period-filters">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={styles.rangeChip}
            onClick={() => {
              setRangeKey(r.key);
              refetch();
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <Empty>No completed trips found for the selected period.</Empty>
          ) : (
            <>
              <ul className="trip-list">
                {pager.pageItems.map((trip) => (
                  <li className="trip-item" key={trip.trip_id}>
                    <button
                      type="button"
                      className="trip-row"
                      onClick={() => setOpenId(openId === trip.trip_id ? null : trip.trip_id)}
                      aria-expanded={openId === trip.trip_id}
                    >
                      <span className="trip-date">
                        {trip.trip_date ? new Date(trip.trip_date).toLocaleDateString() : "—"}
                      </span>
                      <span className="trip-route">
                        {trip.route_name || "—"}
                      </span>
                      <span className="trip-direction">
                        {trip.direction || "—"}
                      </span>
                      <span className="trip-status">
                        <Pill tone={statusPill(trip.status)}>
                          {statusLabel(trip.status)}
                        </Pill>
                      </span>
                    </button>
                    {openId === trip.trip_id && (
                      <div className="trip-detail">
                        {detailLoading && (
                          <p>Loading trip details…</p>
                        )}
                        {detailError && (
                          <ErrorBanner message={detailError} />
                        )}
                        {!detailLoading && !detailError && detailData && (
                          <div className="detail-panel">
                            <div className="detail-info">
                              <div className="info-row">
                                <span>Date:</span>
                                <span>{formatTripDate(detailData.trip_date)}</span>
                              </div>
                              <div className="info-row">
                                <span>Route:</span>
                                <span>{detailData.route_name || "—"}</span>
                              </div>
                              <div className="info-row">
                                <span>Driver:</span>
                                <span>{detailData.driver_name || "—"}</span>
                              </div>
                              <div className="info-row">
                                <span>Status:</span>
                                <Pill tone={statusPill(detailData.status)}>
                                  {statusLabel(detailData.status)}
                                </Pill>
                              </div>
                              {detailData.started_at && (
                                <div className="info-row">
                                  <span>Start:</span>
                                  <span>{new Date(detailData.started_at).toLocaleString()}</span>
                                </div>
                              )}
                              {detailData.ended_at && (
                                <div className="info-row">
                                  <span>End:</span>
                                  <span>{new Date(detailData.ended_at).toLocaleString()}</span>
                                </div>
                              )}
                              {detailData.duration_minutes !== null && detailData.duration_minutes !== undefined && (
                                <div className="info-row">
                                  <span>Duration:</span>
                                  <span>{formatDuration(detailData.duration_minutes)}</span>
                                </div>
                              )}
                            </div>

                            {detailData.students && detailData.students.length > 0 ? (
                              <div className="student-roster">
                                <h4>Students</h4>
                                <ul>
                                  {detailData.students.map((s) => (
                                    <li key={s.student_id}>
                                      <b>{s.student_name || "—"}</b>
                                      <span>
                                        {s.outcome ? `Outcome: ${s.outcome}` : ""}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p>No student outcomes recorded for this trip.</p>
                            )}
                          </div>
                        )}
                        {openId === trip.trip_id && !detailLoading && !detailError && !detailData && (
                          <p>Select a trip to view details.</p>
                        )}
                      </div>
                    )}
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
    </ParentShell>
  );
}
