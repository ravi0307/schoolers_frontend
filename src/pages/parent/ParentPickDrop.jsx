import { useEffect } from "react";
import ParentShell from "../../components/layout/ParentShell";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";

const STATUS_META = {
  pending: { label: "Pickup pending", tone: "mute" },
  picked: { label: "Picked up", tone: "info" },
  dropped: { label: "Dropped at school", tone: "ok" },
  not_assigned: { label: "No transport route", tone: "warn" },
};

const POLL_MS = 20000;

export default function ParentPickDrop() {
  const { selectedChild } = useParentContext();
  const { data, loading, error, refetch } = useApi(() => transportApi.getMyPickdropStatus(), []);
  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const snapshot = data && selectedChild ? data.find((row) => row.student_id === selectedChild.student_id) : null;
  const assigned = snapshot && snapshot.status !== "not_assigned";

  const { data: stops } = useApi(
    () => (assigned && snapshot.route_id ? transportApi.listStops(snapshot.route_id) : Promise.resolve([])),
    [assigned && snapshot?.route_id]
  );

  return (
    <ParentShell>
      <div className="scr-title">Pick &amp; Drop</div>
      <div className="scr-sub">
        {selectedChild ? `Live transport status for ${selectedChild.name.split(" ")[0]}` : ""} · updates every 20s
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && snapshot && (
        <>
          <div className="card white">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="avatar">{initials(selectedChild.name)}</div>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>{snapshot.student_name}</b>
                <div style={{ marginTop: 4 }}>{snapshot.admission_no}</div>
              </div>
              <Pill tone={STATUS_META[snapshot.status]?.tone || "mute"}>
                {STATUS_META[snapshot.status]?.label || snapshot.status}
              </Pill>
            </div>
          </div>

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
                  <Empty>No stops set for this route.</Empty>
                )}
              </div>
            </>
          ) : (
            <Empty>This student has not been assigned a transport route yet.</Empty>
          )}
        </>
      )}
    </ParentShell>
  );
}