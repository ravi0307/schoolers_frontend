import { useEffect, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import { Spinner, ErrorBanner, Pill, initials } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import styles from "./ParentPickDrop.module.css";

const STATUS_META = {
  pending: { label: "Pickup pending", tone: "mute" },
  picked: { label: "Picked up", tone: "info" },
  dropped: { label: "Dropped at school", tone: "ok" },
  not_assigned: { label: "No transport route", tone: "warn" },
};

const POLL_MS = 20000;
// Stable empty reference so the journey memo does not re-run every render.
const NO_STOPS = [];

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function etaLabel(nextMin, nowMin) {
  const diff = Math.round(nextMin - nowMin);
  if (diff <= 0) return "now";
  if (diff < 60) return diff <= 3 ? `in ${diff} min` : `in ~${diff} min`;
  return `in ${Math.floor(diff / 60)}h ${diff % 60}m`;
}

export default function ParentPickDrop() {
  const { selectedChild } = useParentContext();
  const { data, loading, error, refetch } = useApi(() => transportApi.getMyPickdropStatus(), []);
  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const snapshot = data && selectedChild ? data.find((row) => row.student_id === selectedChild.student_id) : null;
  const assigned = snapshot && snapshot.status !== "not_assigned";

  // The stop schedule rides along on the snapshot, so there is no second
  // request. A route with no stops configured yields an empty list.
  const stops = snapshot?.stops || NO_STOPS;

  const journey = useMemo(() => {
    if (!stops || !stops.length) return null;
    const ordered = [...stops].sort((a, b) => (a.pickup_order ?? 9999) - (b.pickup_order ?? 9999));
    const nowMin = nowMinutes();
    const reached = [];
    const upcoming = [];
    const complete = snapshot?.status === "dropped";
    for (const s of ordered) {
      const t = toMinutes(complete ? s.drop_time || s.pickup_time : s.pickup_time);
      if (t != null && (complete || t <= nowMin)) reached.push({ ...s, time: complete ? s.drop_time || s.pickup_time : s.pickup_time });
      else upcoming.push(s);
    }
    const next = upcoming[0] || null;
    const nextMin = next ? toMinutes(next.pickup_time) : null;
    const total = reached.length + upcoming.length;
    return {
      reached,
      upcoming,
      next,
      etaMin: nextMin,
      nowMin,
      progressPct: total ? Math.round((reached.length / total) * 100) : 0,
    };
  }, [stops, snapshot?.status]);

  return (
    <>
      <PageHeader
        title="Pick & Drop"
        subtitle={`${selectedChild ? `Live transport status for ${selectedChild.name.split(" ")[0]}` : ""} · updates every 20s`}
      />

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && snapshot && (
        <>
          <Card className={`card white ${styles.studentCard}`}>
              <div className="avatar">{initials(selectedChild.name)}</div>
              <div className={styles.studentInfo}>
                <b className={styles.studentName}>{snapshot.student_name}</b>
                <div className={styles.admissionNumber}>{snapshot.admission_no}</div>
              </div>
              <Pill tone={STATUS_META[snapshot.status]?.tone || "mute"}>
                {STATUS_META[snapshot.status]?.label || snapshot.status}
              </Pill>
          </Card>

          {assigned ? (
            <>
              <div className="section-label">Bus</div>
              <div className="card">
                <div className="listitem">
                  <div className="avatar g">{snapshot.route_name.charAt(0)}</div>
                  <div className="meta">
                    <b>{snapshot.route_name}</b>
                    <span>
                      {snapshot.vehicle} · Driver {snapshot.driver_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="section-label">Live journey</div>
              {journey && (
                <Card className={`card ${styles.journeyCard}`}>
                  <JourneyHead status={snapshot.status} journey={journey} />
                  <progress
                    className={styles.progress}
                    value={journey.progressPct}
                    max="100"
                    aria-label="Journey completion"
                  />
                  <div className={styles.progressCaption}>
                    {journey.reached.length} of {journey.reached.length + journey.upcoming.length} stops
                  </div>

                  <div className={styles.stopTimeline}>
                    {[...journey.reached, ...journey.upcoming].map((s) => (
                      <StopRow key={s.stop_id} stop={s} reached={journey.reached.includes(s)} current={journey.next && journey.next.stop_id === s.stop_id} />
                    ))}
                  </div>
                </Card>
              )}

              <div className="section-label">Stops</div>
              <div className="card">
                {stops && stops.length ? (
                  stops.map((s) => (
                    <div key={s.stop_id} className="listitem">
                      <div className="avatar g">{s.stop_name.charAt(0)}</div>
                      <div className="meta">
                        <b>{s.stop_name}</b>
                        <span>
                          Pickup {s.pickup_time || "—"} · Drop {s.drop_time || "—"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>No stops set for this route.</EmptyState>
                )}
              </div>
            </>
          ) : (
            <EmptyState>This student has not been assigned a transport route yet.</EmptyState>
          )}
        </>
      )}
    </>
  );
}

function JourneyHead({ status, journey }) {
  const { reached, next, etaMin, nowMin } = journey;
  const complete = status === "dropped";
  const heading = complete
    ? "Arrived at school"
    : reached.length === 0
      ? "Vehicle is heading to the first stop"
      : `${next ? `Vehicle is at ${reached[reached.length - 1].stop_name}` : "Vehicle is heading to school"}`;
  const eta = complete || !next || etaMin == null ? null : (
    <span className={`pill ${reached.length === 0 ? "info" : "warn"}`}>
      Arrives {next.pickup_time} · {etaLabel(etaMin, nowMin)}
    </span>
  );
  return (
    <>
      <div className={styles.journeyHead}>
        <div className={styles.journeyHeading}>
          <span className={styles.journeyPulse} />
          {heading}
        </div>
        {eta}
      </div>
      {next && !complete && (
        <div className={styles.journeyNext}>
          Next stop: <b>{next.stop_name}</b>
        </div>
      )}
    </>
  );
}

function StopRow({ stop, reached, current }) {
  return (
    <div className={`${styles.timelineStop} ${styles[reached ? "reached" : current ? "current" : "upcoming"]}`}>
      <div className={styles.timelineNode}>
        {reached ? <span className={styles.timelineTick}>✓</span> : <span className={styles.timelineDot} />}
      </div>
      <div className="meta">
        <b>{stop.stop_name}</b>
        <span>
          {reached ? `Reached at ${stop.time || "—"}` : current ? `Next stop · arrives ~${stop.pickup_time || "—"}` : `Pickup ${stop.pickup_time || "—"} · Drop ${stop.drop_time || "—"}`}
        </span>
      </div>
      {reached ? (
        <span className="pill ok">Reached</span>
      ) : current ? (
        <span className="pill warn">Up next</span>
      ) : (
        <span className="pill mute">{stop.pickup_time || "—"}</span>
      )}
    </div>
  );
}