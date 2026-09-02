import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

function RouteDetail({ route, onBack, onChanged }) {
  const toast = useToast();
  const { data: stops, refetch: refetchStops } = useApi(() => transportApi.listStops(route.route_id), [route.route_id]);
  const { data: routeStudents, refetch: refetchStudents } = useApi(
    () => transportApi.listRouteStudents(route.route_id),
    [route.route_id]
  );
  const [stopForm, setStopForm] = useState(false);
  const [stopName, setStopName] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [stopType, setStopType] = useState("pickup");

  async function addStop(e) {
    e.preventDefault();
    try {
      await transportApi.addStop(route.route_id, { name: stopName, stop_time: stopTime, stop_type: stopType });
      toast("Stop added");
      setStopName("");
      setStopTime("");
      setStopForm(false);
      refetchStops();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function removeStop(id) {
    await transportApi.removeStop(id);
    toast("Stop removed");
    refetchStops();
  }

  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}>← Back to Routes</button>
      <div className="scr-title">{route.name}</div>
      <div className="scr-sub">{route.vehicle} · {route.driver_name}</div>

      <div className="section-label">Pickup &amp; drop points</div>
      <div className="card">
        {stops && stops.length ? (
          stops.map((s) => (
            <div key={s.stop_id} className="listitem">
              <div className={`avatar ${s.stop_type === "pickup" ? "g" : "r"}`}>{s.stop_type === "pickup" ? "P" : "D"}</div>
              <div className="meta">
                <b>{s.name}</b>
                <span>{s.stop_time} · {s.stop_type}</span>
              </div>
              <button className="btn ghost sm" onClick={() => removeStop(s.stop_id)}>Remove</button>
            </div>
          ))
        ) : (
          <Empty>No stops yet.</Empty>
        )}
      </div>

      {stopForm ? (
        <form className="card white" onSubmit={addStop}>
          <div className="field"><label>Stop name</label><input value={stopName} onChange={(e) => setStopName(e.target.value)} /></div>
          <div className="grid2">
            <div className="field"><label>Time</label><input value={stopTime} onChange={(e) => setStopTime(e.target.value)} placeholder="7:50 AM" /></div>
            <div className="field">
              <label>Type</label>
              <select value={stopType} onChange={(e) => setStopType(e.target.value)}>
                <option value="pickup">Pickup</option>
                <option value="drop">Drop</option>
              </select>
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit">Save Point</button>
            <button className="btn ghost" type="button" onClick={() => setStopForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold block" onClick={() => setStopForm(true)}>+ Add Pickup / Drop Point</button>
      )}

      <div className="section-label">Students on this route</div>
      <div className="card">
        {routeStudents && routeStudents.length ? (
          routeStudents.map((rs) => (
            <div key={rs.id} className="listitem">
              <div className="meta"><b>Student #{rs.student_id}</b></div>
              <Pill tone={rs.status === "dropped" ? "ok" : rs.status === "picked" ? "info" : "mute"}>{rs.status}</Pill>
            </div>
          ))
        ) : (
          <Empty>No students assigned.</Empty>
        )}
      </div>
    </>
  );
}

export default function AdminRoutes() {
  const { data, loading, error, refetch } = useApi(() => transportApi.listRoutes(), []);
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !driver.trim()) {
      toast("Enter a route name and driver");
      return;
    }
    try {
      await transportApi.createRoute({ name, vehicle: vehicle || "Van", driver_name: driver });
      toast("Route created");
      setName("");
      setVehicle("");
      setDriver("");
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  if (selected) {
    return (
      <AdminShell>
        <RouteDetail route={selected} onBack={() => setSelected(null)} onChanged={refetch} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="scr-title">Commute Management</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((r) => (
              <div key={r.route_id} className="listitem" onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                <div className="avatar r">🚌</div>
                <div className="meta">
                  <b>{r.name}</b>
                  <span>{r.driver_name}</span>
                </div>
                <Pill tone={r.status === "On route" ? "ok" : "mute"}>{r.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No routes yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field"><label>Route name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid2">
            <div className="field"><label>Vehicle</label><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></div>
            <div className="field"><label>Driver</label><input value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit">Create Route</button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Route</button>
      )}
    </AdminShell>
  );
}
