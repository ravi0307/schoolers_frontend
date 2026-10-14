import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import TimeSelect, { EMPTY_TIME, formatTime, isTimeIncomplete } from "../../components/ui/TimeSelect";
import Select from "../../components/ui/Select";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import styles from "./AdminRoutes.module.css";

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

function pilotNameForId(pilotId, pilotRecords) {
  const match = pilotRecords.find((record) => String(record.id) === String(pilotId));
  return match ? match.value : "";
}

function stopOptionLabel(stop) {
  const legs = [];
  if (stop.pickup_time) legs.push(`Pickup ${stop.pickup_time}`);
  if (stop.drop_time) legs.push(`Drop ${stop.drop_time}`);
  return legs.length ? `${stop.stop_name} — ${legs.join(" · ")}` : stop.stop_name;
}

// The route payload only carries the derived driver_name, so match it back to a
// pilot id for the edit form.
function pilotIdOf(route, pilotRecords) {
  const name = route?.driver_name;
  if (!name) return "";
  const match = pilotRecords.find((record) => record.value === name);
  return match ? match.id : "";
}

function RouteDetail({ route, onBack, onChanged, vehicleRecords, pilotRecords }) {
  const toast = useToast();
  const [routeSummary, setRouteSummary] = useState(route);
  const [routeEditOpen, setRouteEditOpen] = useState(false);
  const [routeVehicle, setRouteVehicle] = useState(route.vehicle || "");
  const [routeDriver, setRouteDriver] = useState(pilotIdOf(route, pilotRecords) || "");
  const [savingRoute, setSavingRoute] = useState(false);
  const { data: stops, refetch: refetchStops } = useApi(() => transportApi.listStops(route.route_id), [route.route_id]);
  const { data: routeStudents, refetch: refetchStudents } = useApi(
    () => transportApi.listRouteStudents(route.route_id),
    [route.route_id]
  );
  const stopsPager = usePagination(stops);
  const routeStudentsPager = usePagination(routeStudents);
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
  const [selectedStopId, setSelectedStopId] = useState("");

  function openRouteEditor() {
    setRouteVehicle(routeSummary.vehicle || "");
    setRouteDriver(pilotIdOf(routeSummary, pilotRecords) || "");
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
        driver_pilot_id: Number(routeDriver),
      });
      // driver_name is derived server-side, so refetch to show the real value.
      onChanged();
      setRouteSummary((current) => ({
        ...current,
        vehicle: routeVehicle,
        driver_name: pilotNameForId(routeDriver, pilotRecords),
      }));
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

  function resetStudentForm() {
    setSelectedStudentId("");
    setSelectedStopId("");
    setStudentForm(false);
  }

  async function addRouteStudent(e) {
    e.preventDefault();
    if (!selectedStudentId) {
      toast("Pick a student to add to the route");
      return;
    }
    const stopGroup = (stops || []).find((stop) => String(stop.stop_id) === String(selectedStopId));
    if (!selectedStopId || !stopGroup) {
      toast(stops && stops.length ? "Select a stop point for the student" : "Add a stop point to this route first");
      return;
    }
    try {
      await transportApi.addStudentToRoute(route.route_id, Number(selectedStudentId), {
        pickup_stop_id: stopGroup.pickup_stop_id ?? null,
        drop_stop_id: stopGroup.drop_stop_id ?? null,
      });
      toast("Student added to route");
      resetStudentForm();
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
    <main className={styles.page}>
      <button className={`btn ghost sm ${styles.back}`} type="button" onClick={onBack}>← Back to Routes</button>
      <PageHeader
        title={routeSummary.name}
        subtitle={(
          <>
            {routeSummary.vehicle || "Van"} · Driver: {routeSummary.driver_name || "Not assigned"}
          </>
        )}
        action={(
          <button className="btn ghost sm" type="button" onClick={openRouteEditor}>Edit</button>
        )}
      />
      {routeEditOpen && (
        <form className={`card white ${styles.routeAssignmentForm}`} onSubmit={updateRouteAssignment}>
          <div className="grid2">
            <div className="field">
              <label>Vehicle</label>
              <Select value={routeVehicle} onChange={(e) => setRouteVehicle(e.target.value)} disabled={!vehicleRecords.length} aria-label="Vehicle">
                <option value="">Select vehicle</option>
                {vehicleRecords.map((record) => (
                  <option key={record.id} value={record.number}>{record.number} · {record.type}</option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label>Driver</label>
              <Select value={routeDriver} onChange={(e) => setRouteDriver(e.target.value)} disabled={!pilotRecords.length} aria-label="Driver">
                <option value="">Select driver</option>
                {pilotRecords.map((record) => (
                  <option key={record.id} value={record.value}>{record.value} · {record.username}</option>
                ))}
              </Select>
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
                {stopsPager.pageItems.map((stop) => {
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
        <Pagination {...stopsPager} />
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
          routeStudentsPager.pageItems.map((rs) => {
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
            const photoUrl = firstValue(rs.photo_url, nestedStudent?.photo_url, student?.photo_url);
            const parentName = firstValue(rs.parent_name, nestedStudent?.parent_name, student?.parent_name);
            const grade = firstValue(rs.class_name, nestedStudent?.class_name, student?.class_name);
            const stopName = firstValue(rs.pickup_stop_name, rs.drop_stop_name);
            const identityDetails = [
              grade || "",
              parentName ? `Parent: ${parentName}` : "",
            ].filter(Boolean).join(" · ");
            const assignmentDetails = [
              `Stop: ${stopName || "Not assigned"}`,
              admissionNo ? `Admission no: ${admissionNo}` : "",
            ].filter(Boolean).join(" · ");

            return (
              <div key={studentId || rs.id} className={`listitem ${styles.studentItem}`}>
                <div className={`avatar ${styles.studentAvatar}`} aria-hidden="true">
                  <span>{initials(studentName || "?")}</span>
                  {photoUrl ? (
                    <img
                      src={resolveMediaUrl(photoUrl)}
                      alt=""
                      className={styles.studentPhoto}
                      onError={(event) => { event.currentTarget.remove(); }}
                    />
                  ) : null}
                </div>
                <div className="meta">
                  <b>{studentName || "Student name unavailable"}</b>
                  {identityDetails ? <span>{identityDetails}</span> : null}
                  <span>{assignmentDetails}</span>
                </div>
                <Pill tone={rs.status === "dropped" ? "ok" : rs.status === "picked" ? "info" : "mute"}>{rs.status}</Pill>
                <button className="btn ghost sm" onClick={() => removeRouteStudent(studentId)}>Remove</button>
              </div>
            );
          })
        ) : (
          <Empty>No students assigned.</Empty>
        )}
        <Pagination {...routeStudentsPager} />
      </div>
      {studentForm ? (
        <form className="card white" onSubmit={addRouteStudent}>
          <div className="grid2">
            <div className="field">
              <label>Select student</label>
              <Select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} aria-label="Select student">
                <option value="">Select a student</option>
                {availableStudents.map((student) => (
                  <option key={student.student_id ?? student.id} value={student.student_id ?? student.id}>{student.name}</option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label>Stop point</label>
              <Select
                value={selectedStopId}
                onChange={(e) => setSelectedStopId(e.target.value)}
                aria-label="Stop point"
                disabled={!(stops && stops.length)}
              >
                <option value="">{stops && stops.length ? "Select a stop point" : "No stop points yet"}</option>
                {(stops || []).map((stop) => (
                  <option key={stop.stop_id} value={stop.stop_id}>{stopOptionLabel(stop)}</option>
                ))}
              </Select>
            </div>
          </div>
          {!(stops && stops.length) && (
            <div className={styles.formHint}>Add a pickup / drop point above before assigning students to stops.</div>
          )}
          <div className="cta-row">
            <button className="btn primary" type="submit">Add Student</button>
            <button className="btn ghost" type="button" onClick={resetStudentForm}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold block" onClick={() => setStudentForm(true)}>+ Add Student on Route</button>
      )}
    </main>
  );
}

export default function AdminRoutes() {
  const { data, loading, error, refetch } = useApi(() => transportApi.listRoutes(), []);
  const { data: vehicles, refetch: refetchVehicles } = useApi(() => transportApi.listVehicles(), []);
  const { data: pilots } = useApi(() => transportApi.listPilots(), []);
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
    () => (pilots || [])
      .filter((pilot) => pilot.is_active !== false)
      .map((pilot) => ({
        id: pilot.pilot_id,
        username: pilot.username || "No login",
        value: pilot.full_name || pilot.username || `Pilot ${pilot.pilot_id}`,
      })),
    [pilots]
  );
  const routePager = usePagination(data);
  const vehiclePager = usePagination(vehicleRecords);

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
      await transportApi.createRoute({ name: name.trim(), vehicle, driver_pilot_id: Number(driver) });
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
      <main className={styles.page}>
      <PageHeader
        title="Commute Management"
        subtitle="Routes, vehicles, pickup and drop points, and assigned students."
      />
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <>
        <div className={`card ${styles.routeList}`}>
          <div className={styles.routeListHead}>
            <div className={styles.listHeader}>
              Route
            </div>
            {!formOpen && (
              <button className="btn ghost sm" type="button" onClick={() => setFormOpen(true)}>
                + Add Route
              </button>
            )}
          </div>
          {formOpen && (
            <form className={styles.routeCreateForm} onSubmit={submit}>
              <div className="field"><label>Route name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid2">
                <div className="field">
                  <label>Vehicle</label>
                  <Select value={vehicle} onChange={(e) => setVehicle(e.target.value)} disabled={!vehicles} aria-label="Vehicle">
                    <option value="">Select vehicle</option>
                    {vehicleRecords.map((record) => (
                      <option key={record.id} value={record.number}>
                        {record.number} · {record.type}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="field">
                  <label>Driver</label>
                  <Select value={driver} onChange={(e) => setDriver(e.target.value)} disabled={!pilots} aria-label="Driver">
                    <option value="">Select driver</option>
                    {pilotRecords.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.value} · {record.username}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="cta-row">
                <button className="btn primary" type="submit">Create Route</button>
                <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
          <div className={styles.routeListBody}>
            {data && data.length ? (
              <div className={`card table-card`}>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th className={styles.tableActions}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routePager.pageItems.map((r) => (
                        <tr key={r.route_id} onClick={() => setSelected(r)} className={styles.routeRow}>
                          <td>
                            <b>{r.name}</b>
                          </td>
                          <td>{r.vehicle || "—"}</td>
                          <td>{r.driver_name || "Not assigned"}</td>
                          <td>
                            <Pill tone={r.status === "On route" ? "ok" : "mute"}>{r.status}</Pill>
                          </td>
                          <td className={styles.tableActions}>
                            <button className="btn ghost sm" onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...routePager} />
              </div>
            ) : (
              <Empty>No routes yet.</Empty>
            )}
            <Pagination {...routePager} />
          </div>
        </div>
        <section className={styles.vehicleSection}>
          <div className={`card white ${styles.vehicleCard}`}>
            <div className={styles.vehicleHeader}>
              <div className={styles.sectionHeading}>Vehicle</div>
              <button className="btn ghost sm" type="button" onClick={() => setVehicleFormOpen((open) => !open)}>+ Add Vehicle</button>
            </div>
            {vehicleFormOpen && (
                <div className={styles.vehicleEditor}>
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
            <div className={vehicleRecords.length > 10 ? styles.vehicleScroll : undefined}>
              {vehicleRecords.length ? vehiclePager.pageItems.map((record) => (
                  <div key={record.id} className={styles.vehicleRow}>
                    {editingVehicleId === record.id ? (
                      <>
                        <input className={styles.vehicleInput} value={vehicleDraft} onChange={(e) => setVehicleDraft(e.target.value)} placeholder="Vehicle number" />
                        <input className={styles.vehicleInput} value={vehicleTypeDraft} onChange={(e) => setVehicleTypeDraft(e.target.value)} placeholder="Type" />
                        <input className={styles.vehicleInput} value={vehicleRegistrationDraft} onChange={(e) => setVehicleRegistrationDraft(e.target.value)} placeholder="Registration number" />
                        <div className={styles.vehicleActions}>
                          <button className="btn primary sm" type="button" onClick={() => updateVehicle(record.id)}>Save</button>
                          <button className="btn ghost sm" type="button" onClick={() => setEditingVehicleId(null)}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.vehicleInfo}>
                          <div className={styles.vehicleName}>{record.number}</div>
                          <div className={styles.vehicleMeta}>Type: {record.type} · Registration: {record.registration}</div>
                        </div>
                        <div className={styles.vehicleActions}>
                          <button className="btn ghost sm" type="button" onClick={() => {
                            setEditingVehicleId(record.id);
                            setVehicleDraft(record.number);
                            setVehicleTypeDraft(record.type);
                            setVehicleRegistrationDraft(record.registration);
                          }}>Edit</button>
                          <button className="btn ghost sm" type="button" onClick={() => deactivateVehicle(record.id)}>
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )) : <Empty>No vehicle records yet.</Empty>}
              <Pagination {...vehiclePager} />
            </div>
          </div>
        </section>
        </>
      )}

      </main>
    </AdminShell>
  );
}
