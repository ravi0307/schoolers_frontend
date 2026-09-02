import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import * as peopleApi from "../../api/people";
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
  const { data: allStudents } = useApi(() => peopleApi.listStudents({}), []);
  const [stopForm, setStopForm] = useState(false);
  const [stopName, setStopName] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [stopType, setStopType] = useState("pickup");
  const [studentForm, setStudentForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

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
    try {
      await transportApi.removeStop(id);
      toast("Stop removed");
      refetchStops();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function addRouteStudent(e) {
    e.preventDefault();
    if (!selectedStudentId) {
      toast("Pick a student to add to the route");
      return;
    }
    try {
      await transportApi.addStudentToRoute(route.route_id, Number(selectedStudentId));
      toast("Student added to route");
      setSelectedStudentId("");
      setStudentForm(false);
      refetchStudents();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function removeRouteStudent(studentId) {
    try {
      await transportApi.removeStudentFromRoute(route.route_id, studentId);
      toast("Student removed from route");
      refetchStudents();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  const studentById = useMemo(
    () =>
      new Map(
        (allStudents || []).map((student) => [
          String(student.student_id ?? student.id),
          student,
        ])
      ),
    [allStudents]
  );
  const assignedStudentIds = new Set((routeStudents || []).map((student) => String(student.student_id ?? student.id)));
  const availableStudents = (allStudents || []).filter(
    (student) => !assignedStudentIds.has(String(student.student_id ?? student.id))
  );

  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}>← Back to Routes</button>
      <div className="scr-title">{route.name}</div>
      <div className="scr-sub">{route.vehicle || "Van"} · Driver: {route.driver_name || "Not assigned"}</div>

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
          routeStudents.map((rs) => {
            const student = rs.student || studentById.get(String(rs.student_id ?? rs.id));
            const studentName = rs.student_name || rs.name || student?.name || student?.full_name;
            const admissionNo = rs.admission_no || student?.admission_no || student?.admission_number;

            return (
              <div key={rs.id || rs.student_id} className="listitem">
                <div className="meta">
                  <b>{studentName || "Student name unavailable"}</b>
                  {admissionNo && <span>Admission no: {admissionNo}</span>}
                </div>
                <Pill tone={rs.status === "dropped" ? "ok" : rs.status === "picked" ? "info" : "mute"}>{rs.status}</Pill>
                <button className="btn ghost sm" onClick={() => removeRouteStudent(rs.student_id)}>Remove</button>
              </div>
            );
          })
        ) : (
          <Empty>No students assigned.</Empty>
        )}
      </div>
      {studentForm ? (
        <form className="card white" onSubmit={addRouteStudent}>
          <div className="field">
            <label>Select student</label>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">Select a student</option>
              {availableStudents.map((student) => (
                <option key={student.student_id ?? student.id} value={student.student_id ?? student.id}>{student.name}</option>
              ))}
            </select>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit">Add Student</button>
            <button className="btn ghost" type="button" onClick={() => setStudentForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold block" onClick={() => setStudentForm(true)}>+ Add Student on Route</button>
      )}
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
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingPilotId, setEditingPilotId] = useState(null);
  const [vehicleDraft, setVehicleDraft] = useState("");
  const [pilotDraft, setPilotDraft] = useState("");
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState("");
  const [vehicleRegistrationDraft, setVehicleRegistrationDraft] = useState("");
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);

  const vehicleRecords = useMemo(
    () => (data || []).filter((route) => route.vehicle).map((route) => {
      const rawVehicle = String(route.vehicle || "");
      const parts = rawVehicle.split(" · ");
      return {
        id: route.route_id,
        number: route.vehicle_number || route.vehicle_no || parts[1] || rawVehicle,
        type: route.vehicle_type || route.type || parts[0] || "Vehicle",
        registration: route.registration_number || route.registration_no || route.vehicle_registration_number || parts[1] || "Not provided",
      };
    }),
    [data]
  );
  const pilotRecords = useMemo(
    () => (data || []).filter((route) => route.driver_name).map((route) => ({
      id: route.route_id,
      value: route.driver_name,
      routeName: route.name,
    })),
    [data]
  );

  async function updateVehicle(routeId) {
    const route = (data || []).find((item) => item.route_id === routeId);
    if (!route || !vehicleDraft.trim()) return;
    try {
      await transportApi.updateRoute(routeId, {
        name: route.name,
        vehicle: `${vehicleTypeDraft.trim() || "Vehicle"} · ${vehicleRegistrationDraft.trim() || vehicleDraft.trim()}`,
        vehicle_number: vehicleDraft.trim(),
        vehicle_type: vehicleTypeDraft.trim(),
        registration_number: vehicleRegistrationDraft.trim(),
        driver_name: route.driver_name || "Not assigned",
      });
      setEditingVehicleId(null);
      setVehicleDraft("");
      setVehicleTypeDraft("");
      setVehicleRegistrationDraft("");
      toast("Vehicle updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function updatePilot(routeId) {
    const route = (data || []).find((item) => item.route_id === routeId);
    if (!route || !pilotDraft.trim()) return;
    try {
      await transportApi.updateRoute(routeId, {
        name: route.name,
        vehicle: route.vehicle || "Van",
        driver_name: pilotDraft.trim(),
      });
      setEditingPilotId(null);
      setPilotDraft("");
      toast("Pilot updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

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
        <>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderBottom: "1px solid #dfeaf1" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155" }}>
              Route
            </div>
            {!formOpen && (
              <button className="btn ghost sm" type="button" onClick={() => setFormOpen(true)}>
                + Add Route
              </button>
            )}
          </div>
          <div style={{ padding: "0 18px" }}>
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginTop: 18 }}>
          {[
            { title: "Vehicle", records: vehicleRecords, editingId: editingVehicleId, setEditingId: setEditingVehicleId, draft: vehicleDraft, setDraft: setVehicleDraft, save: updateVehicle },
            { title: "Pilot", records: pilotRecords, editingId: editingPilotId, setEditingId: setEditingPilotId, draft: pilotDraft, setDraft: setPilotDraft, save: updatePilot },
          ].map((card) => (
            <div key={card.title} className="card white" style={{ minHeight: 220, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.title}</div>
                <button className="btn ghost sm" type="button" onClick={() => card.title === "Vehicle" ? setVehicleFormOpen((open) => !open) : setFormOpen(true)}>+ Add {card.title}</button>
              </div>
              {card.title === "Vehicle" && vehicleFormOpen && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #dfeaf1" }}>
                  <div className="grid2">
                    <div className="field"><label>Vehicle number</label><input value={vehicleDraft} onChange={(e) => setVehicleDraft(e.target.value)} /></div>
                    <div className="field"><label>Vehicle type</label><input value={vehicleTypeDraft} onChange={(e) => setVehicleTypeDraft(e.target.value)} placeholder="Bus" /></div>
                  </div>
                  <div className="field"><label>Registration number</label><input value={vehicleRegistrationDraft} onChange={(e) => setVehicleRegistrationDraft(e.target.value)} /></div>
                  <div className="cta-row">
                    <button className="btn primary sm" type="button" onClick={() => updateVehicle((data || [])[0]?.route_id)}>Save</button>
                    <button className="btn ghost sm" type="button" onClick={() => { setVehicleFormOpen(false); setVehicleDraft(""); setVehicleTypeDraft(""); setVehicleRegistrationDraft(""); }}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ maxHeight: 300, overflowY: card.records.length > 10 ? "auto" : "visible" }}>
                {card.records.length ? card.records.map((record) => (
                  <div key={record.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #dfeaf1" }}>
                    {card.editingId === record.id ? (
                      card.title === "Vehicle" ? (
                        <>
                          <input value={card.draft} onChange={(e) => card.setDraft(e.target.value)} placeholder="Vehicle number" style={{ flex: 1, minWidth: 0 }} />
                          <input value={vehicleTypeDraft} onChange={(e) => setVehicleTypeDraft(e.target.value)} placeholder="Type" style={{ flex: 1, minWidth: 0 }} />
                          <input value={vehicleRegistrationDraft} onChange={(e) => setVehicleRegistrationDraft(e.target.value)} placeholder="Registration number" style={{ flex: 1, minWidth: 0 }} />
                          <button className="btn primary sm" type="button" onClick={() => card.save(record.id)}>Save</button>
                          <button className="btn ghost sm" type="button" onClick={() => card.setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <input value={card.draft} onChange={(e) => card.setDraft(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                          <button className="btn primary sm" type="button" onClick={() => card.save(record.id)}>Save</button>
                          <button className="btn ghost sm" type="button" onClick={() => card.setEditingId(null)}>Cancel</button>
                        </>
                      )
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {card.title === "Vehicle" ? (
                            <>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.number}</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>Type: {record.type} · Registration: {record.registration}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.value}</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>{record.routeName}</div>
                            </>
                          )}
                        </div>
                        <button className="btn ghost sm" type="button" onClick={() => {
                          card.setEditingId(record.id);
                          card.setDraft(card.title === "Vehicle" ? record.number : record.value);
                          if (card.title === "Vehicle") {
                            setVehicleTypeDraft(record.type);
                            setVehicleRegistrationDraft(record.registration);
                          }
                        }}>Edit</button>
                      </>
                    )}
                  </div>
                )) : <Empty>No {card.title.toLowerCase()} records yet.</Empty>}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {formOpen && (
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
      )}
    </AdminShell>
  );
}
