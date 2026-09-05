import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import TimeSelect, { EMPTY_TIME, formatTime, isTimeIncomplete } from "../../components/ui/TimeSelect";
import { apiErrorMessage } from "../../api/client";

function parseTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  return match
    ? { hour: match[1], minute: match[2], meridiem: match[3].toUpperCase() }
    : EMPTY_TIME;
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function studentIdOf(student) {
  return firstValue(student?.student_id, student?.id);
}

function studentNameOf(student) {
  if (!student) return "";
  return firstValue(
    student.student_name,
    student.name,
    student.full_name,
    [student.first_name, student.last_name].filter(Boolean).join(" ")
  );
}

function RouteDetail({ route, onBack, onChanged, vehicleRecords, pilotRecords }) {
  const toast = useToast();
  const [routeSummary, setRouteSummary] = useState(route);
  const [routeEditOpen, setRouteEditOpen] = useState(false);
  const [routeVehicle, setRouteVehicle] = useState(route.vehicle || "");
  const [routeDriver, setRouteDriver] = useState(route.driver_name || "");
  const [savingRoute, setSavingRoute] = useState(false);
  const { data: stops, refetch: refetchStops } = useApi(() => transportApi.listStops(route.route_id), [route.route_id]);
  const { data: routeStudents, refetch: refetchStudents } = useApi(
    () => transportApi.listRouteStudents(route.route_id),
    [route.route_id]
  );
  const { data: allStudents, refetch: refetchAvailableStudents } = useApi(
    () => peopleApi.listStudents({ unassigned_only: true }),
    []
  );
  const [stopForm, setStopForm] = useState(false);
  const [stopName, setStopName] = useState("");
  const [pickupTime, setPickupTime] = useState(EMPTY_TIME);
  const [dropTime, setDropTime] = useState(EMPTY_TIME);
  const [savingStop, setSavingStop] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [studentForm, setStudentForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  function openRouteEditor() {
    setRouteVehicle(routeSummary.vehicle || "");
    setRouteDriver(routeSummary.driver_name || "");
    setRouteEditOpen(true);
  }

  async function updateRouteAssignment(e) {
    e.preventDefault();
    if (!routeVehicle || !routeDriver) {
      toast("Select a vehicle and driver");
      return;
    }

    setSavingRoute(true);
    try {
      await transportApi.updateRoute(route.route_id, {
        vehicle: routeVehicle,
        driver_name: routeDriver,
      });
      setRouteSummary((current) => ({ ...current, vehicle: routeVehicle, driver_name: routeDriver }));
      setRouteEditOpen(false);
      toast("Route assignment updated");
      onChanged();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSavingRoute(false);
    }
  }

  function resetStopForm() {
    setStopName("");
    setPickupTime(EMPTY_TIME);
    setDropTime(EMPTY_TIME);
    setEditingStop(null);
    setStopForm(false);
  }

  async function removeStopGroup(stop) {
    try {
      const stopIds = [stop.pickup_stop_id, stop.drop_stop_id].filter(Boolean);
      await Promise.all(stopIds.map((stopId) => transportApi.removeStop(stopId)));
      toast("Stop removed");
      refetchStops();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function editStop(stop) {
    setEditingStop(stop);
    setStopName(stop.stop_name);
    setPickupTime(parseTime(stop.pickup_time));
    setDropTime(parseTime(stop.drop_time));
    setStopForm(true);
  }

  async function addStop(e) {
    e.preventDefault();
    if (savingStop) return;

    const name = stopName.trim();
    if (!name) {
      toast("Enter a stop name");
      return;
    }
    if (isTimeIncomplete(pickupTime)) {
      toast("Pick both an hour and a minute for the pickup time");
      return;
    }
    if (isTimeIncomplete(dropTime)) {
      toast("Pick both an hour and a minute for the drop time");
      return;
    }

    const pickup = formatTime(pickupTime);
    const drop = formatTime(dropTime);

    setSavingStop(true);
    try {
      if (editingStop) {
        await transportApi.updateStop(editingStop.stop_id, {
          stop_name: name,
          pickup_time: pickup,
          pickup_order: editingStop.pickup_order,
          drop_time: drop,
          drop_order: editingStop.drop_order,
        });
      } else {
        const nextOrder = (stops || []).reduce(
          (max, stop) => Math.max(max, stop.pickup_order || 0, stop.drop_order || 0),
          0
        ) + 1;
        await transportApi.addStop(route.route_id, {
          stop_name: name,
          pickup_time: pickup,
          pickup_order: nextOrder,
          drop_time: drop,
          drop_order: nextOrder,
        });
      }
      toast(editingStop ? "Stop updated" : "Pickup & drop points added");
      resetStopForm();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSavingStop(false);
      refetchStops();
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
      refetchAvailableStudents();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  const studentById = useMemo(
    () =>
      new Map(
        (allStudents || []).map((student) => [
          String(studentIdOf(student)),
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
      <div className="scr-title">{routeSummary.name}</div>
      <div className="route-assignment">
        <div className="scr-sub">{routeSummary.vehicle || "Van"} · Driver: {routeSummary.driver_name || "Not assigned"}</div>
        <button className="btn ghost sm" type="button" onClick={openRouteEditor}>Edit</button>
      </div>
      {routeEditOpen && (
        <form className="card white route-assignment-form" onSubmit={updateRouteAssignment}>
          <div className="grid2">
            <div className="field">
              <label>Vehicle</label>
              <select value={routeVehicle} onChange={(e) => setRouteVehicle(e.target.value)} disabled={!vehicleRecords.length}>
                <option value="">Select vehicle</option>
                {vehicleRecords.map((record) => (
                  <option key={record.id} value={record.number}>{record.number} · {record.type}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Driver</label>
              <select value={routeDriver} onChange={(e) => setRouteDriver(e.target.value)} disabled={!pilotRecords.length}>
                <option value="">Select driver</option>
                {pilotRecords.map((record) => (
                  <option key={record.id} value={record.value}>{record.value} · {record.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={savingRoute}>
              {savingRoute ? "Saving..." : "Save"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setRouteEditOpen(false)} disabled={savingRoute}>Cancel</button>
          </div>
        </form>
      )}

      <div className="section-label">Pickup &amp; drop points</div>
      <div className="card table-card">
        {stops && stops.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stop</th>
                  <th>Pickup time</th>
                  <th>Drop time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((stop) => {
                  return (
                    <tr key={stop.stop_id}>
                      <td>{stop.stop_name}</td>
                      <td>{stop.pickup_time || "—"}</td>
                      <td>{stop.drop_time || "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn ghost sm" onClick={() => editStop(stop)}>Edit</button>
                          <button className="btn ghost sm" onClick={() => removeStopGroup(stop)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No stops yet.</Empty>
        )}
      </div>

      {stopForm ? (
        <form className="card white" onSubmit={addStop}>
          <div className="field"><label>Stop name</label><input value={stopName} onChange={(e) => setStopName(e.target.value)} /></div>
          <div className="grid2">
            <TimeSelect label="Pickup time" value={pickupTime} onChange={setPickupTime} />
            <TimeSelect label="Drop time" value={dropTime} onChange={setDropTime} />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={savingStop}>
              {savingStop ? "Saving..." : editingStop ? "Update Point" : "Save Point"}
            </button>
            <button className="btn ghost" type="button" onClick={resetStopForm} disabled={savingStop}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold block" onClick={() => setStopForm(true)}>+ Add Pickup / Drop Point</button>
      )}

      <div className="section-label">Students on this route</div>
      <div className="card">
        {routeStudents && routeStudents.length ? (
          routeStudents.map((rs) => {
            const nestedStudent = typeof rs.student === "object" ? rs.student : null;
            const studentId = firstValue(rs.student_id, nestedStudent?.student_id, nestedStudent?.id);
            const student = nestedStudent || studentById.get(String(studentId));
            const studentName = firstValue(
              studentNameOf(rs),
              studentNameOf(nestedStudent),
              studentNameOf(student)
            );
            const admissionNo = firstValue(
              rs.admission_no,
              rs.admission_number,
              nestedStudent?.admission_no,
              nestedStudent?.admission_number,
              student?.admission_no,
              student?.admission_number
            );

            return (
              <div key={studentId || rs.id} className="listitem">
                <div className="meta">
                  <b>{studentName || "Student name unavailable"}</b>
                  {admissionNo && <span>Admission no: {admissionNo}</span>}
                </div>
                <Pill tone={rs.status === "dropped" ? "ok" : rs.status === "picked" ? "info" : "mute"}>{rs.status}</Pill>
                <button className="btn ghost sm" onClick={() => removeRouteStudent(studentId)}>Remove</button>
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
  const { data: vehicles, refetch: refetchVehicles } = useApi(() => transportApi.listVehicles(), []);
  const { data: staff } = useApi(() => peopleApi.listStaff(), []);
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleDraft, setVehicleDraft] = useState("");
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState("");
  const [vehicleRegistrationDraft, setVehicleRegistrationDraft] = useState("");
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);

  const vehicleRecords = useMemo(
    () => (vehicles || []).filter((vehicleRecord) => {
      return vehicleRecord.is_active !== false;
    }).map((vehicleRecord) => {
      return {
        id: vehicleRecord.vehicle_id,
        number: vehicleRecord.vehicle_number,
        type: vehicleRecord.vehicle_type || "Vehicle",
        registration: vehicleRecord.registration_number || "Not provided",
      };
    }),
    [vehicles]
  );
  const pilotRecords = useMemo(
    () => (staff || [])
      .filter((member) => {
        const role = member.role || member.role_title || "";
        return member.is_active !== false && String(role).toLowerCase() === "pilot";
      })
      .map((member) => ({
        id: member.staff_id || member.id,
        username: member.name || member.full_name,
        value: member.name || member.full_name,
      })),
    [staff]
  );

  async function addVehicle() {
    const number = vehicleDraft.trim();
    if (!number) {
      toast("Enter a vehicle number");
      return;
    }
    try {
      await transportApi.createVehicle({
        vehicle_number: number,
        vehicle_type: vehicleTypeDraft.trim(),
        registration_number: vehicleRegistrationDraft.trim(),
      });
      setVehicleFormOpen(false);
      setVehicleDraft("");
      setVehicleTypeDraft("");
      setVehicleRegistrationDraft("");
      toast("Vehicle added");
      refetchVehicles();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function updateVehicle(vehicleId) {
    if (!vehicleId || !vehicleDraft.trim()) return;
    try {
      await transportApi.updateVehicle(vehicleId, {
        vehicle_number: vehicleDraft.trim(),
        vehicle_type: vehicleTypeDraft.trim(),
        registration_number: vehicleRegistrationDraft.trim(),
      });
      setEditingVehicleId(null);
      setVehicleDraft("");
      setVehicleTypeDraft("");
      setVehicleRegistrationDraft("");
      toast("Vehicle updated");
      refetchVehicles();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function deactivateVehicle(vehicleId) {
    if (!window.confirm("Remove this vehicle?")) return;
    try {
      await transportApi.deactivateVehicle(vehicleId);
      if (editingVehicleId === vehicleId) {
        setEditingVehicleId(null);
        setVehicleDraft("");
        setVehicleTypeDraft("");
        setVehicleRegistrationDraft("");
      }
      toast("Vehicle removed");
      refetchVehicles();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !driver.trim()) {
      toast("Enter a route name and select a driver");
      return;
    }
    if (!vehicle) {
      toast("Select a vehicle");
      return;
    }
    try {
      await transportApi.createRoute({ name: name.trim(), vehicle, driver_name: driver });
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
        <RouteDetail
          route={selected}
          onBack={() => setSelected(null)}
          onChanged={refetch}
          vehicleRecords={vehicleRecords}
          pilotRecords={pilotRecords}
        />
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
        <div style={{ marginTop: 18 }}>
          <div className="card white" style={{ minHeight: 220, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vehicle</div>
              <button className="btn ghost sm" type="button" onClick={() => setVehicleFormOpen((open) => !open)}>+ Add Vehicle</button>
            </div>
            {vehicleFormOpen && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #dfeaf1" }}>
                  <div className="grid2">
                    <div className="field"><label>Vehicle number</label><input value={vehicleDraft} onChange={(e) => setVehicleDraft(e.target.value)} /></div>
                    <div className="field"><label>Vehicle type</label><input value={vehicleTypeDraft} onChange={(e) => setVehicleTypeDraft(e.target.value)} placeholder="Bus" /></div>
                  </div>
                  <div className="field"><label>Registration number</label><input value={vehicleRegistrationDraft} onChange={(e) => setVehicleRegistrationDraft(e.target.value)} /></div>
                  <div className="cta-row">
                    <button className="btn primary sm" type="button" onClick={addVehicle}>Save</button>
                    <button className="btn ghost sm" type="button" onClick={() => { setVehicleFormOpen(false); setVehicleDraft(""); setVehicleTypeDraft(""); setVehicleRegistrationDraft(""); }}>Cancel</button>
                  </div>
                </div>
              )}
            <div style={{ maxHeight: 300, overflowY: vehicleRecords.length > 10 ? "auto" : "visible" }}>
              {vehicleRecords.length ? vehicleRecords.map((record) => (
                  <div key={record.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #dfeaf1" }}>
                    {editingVehicleId === record.id ? (
                      <>
                        <input value={vehicleDraft} onChange={(e) => setVehicleDraft(e.target.value)} placeholder="Vehicle number" style={{ flex: 1, minWidth: 0 }} />
                        <input value={vehicleTypeDraft} onChange={(e) => setVehicleTypeDraft(e.target.value)} placeholder="Type" style={{ flex: 1, minWidth: 0 }} />
                        <input value={vehicleRegistrationDraft} onChange={(e) => setVehicleRegistrationDraft(e.target.value)} placeholder="Registration number" style={{ flex: 1, minWidth: 0 }} />
                        <button className="btn primary sm" type="button" onClick={() => updateVehicle(record.id)}>Save</button>
                        <button className="btn ghost sm" type="button" onClick={() => setEditingVehicleId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.number}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>Type: {record.type} · Registration: {record.registration}</div>
                        </div>
                        <button className="btn ghost sm" type="button" onClick={() => {
                          setEditingVehicleId(record.id);
                          setVehicleDraft(record.number);
                          setVehicleTypeDraft(record.type);
                          setVehicleRegistrationDraft(record.registration);
                        }}>Edit</button>
                        <button className="btn ghost sm" type="button" onClick={() => deactivateVehicle(record.id)}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                )) : <Empty>No vehicle records yet.</Empty>}
            </div>
          </div>
        </div>
        </>
      )}

      {formOpen && (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field"><label>Route name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid2">
            <div className="field">
              <label>Vehicle</label>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} disabled={!vehicles}>
                <option value="">Select vehicle</option>
                {vehicleRecords.map((record) => (
                  <option key={record.id} value={record.number}>
                    {record.number} · {record.type}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Driver</label>
              <select value={driver} onChange={(e) => setDriver(e.target.value)} disabled={!staff}>
                <option value="">Select driver</option>
                {pilotRecords.map((record) => (
                  <option key={record.id} value={record.value}>
                    {record.value} · {record.username}
                  </option>
                ))}
              </select>
            </div>
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
