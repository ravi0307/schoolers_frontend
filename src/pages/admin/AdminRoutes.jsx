import { useMemo, useRef, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import TimeSelect, { EMPTY_TIME, formatTime, isTimeIncomplete } from "../../components/ui/TimeSelect";
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
  const [pickupTime, setPickupTime] = useState(EMPTY_TIME);
  const [dropTime, setDropTime] = useState(EMPTY_TIME);
  const [savingStop, setSavingStop] = useState(false);
  const savedPoints = useRef(new Set());
  const [studentForm, setStudentForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  function resetStopForm() {
    setStopName("");
    setPickupTime(EMPTY_TIME);
    setDropTime(EMPTY_TIME);
    savedPoints.current.clear();
    setStopForm(false);
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

    const points = [
      { stop_type: "pickup", stop_time: formatTime(pickupTime) },
      { stop_type: "drop", stop_time: formatTime(dropTime) },
    ].filter((point) => point.stop_time);

    if (!points.length) {
      toast("Set a pickup or drop time");
      return;
    }

    setSavingStop(true);
    try {
      // A retry after a partial failure must not re-create the points that got through —
      // neither the ones this form saved nor the ones a lost response left on the server, so
      // the existing points are read back here rather than taken from the rendered list.
      const existing = await transportApi.listStops(route.route_id).catch(() => []);

      for (const point of points) {
        const key = `${name}|${point.stop_type}|${point.stop_time}`;
        const alreadyOnServer = existing.some(
          (s) => s.name === name && s.stop_type === point.stop_type && s.stop_time === point.stop_time
        );
        if (savedPoints.current.has(key) || alreadyOnServer) continue;
        await transportApi.addStop(route.route_id, { name, ...point });
        savedPoints.current.add(key);
      }
      toast(points.length > 1 ? "Pickup & drop points added" : "Stop added");
      resetStopForm();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSavingStop(false);
      refetchStops();
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
            <TimeSelect label="Pickup time" value={pickupTime} onChange={setPickupTime} />
            <TimeSelect label="Drop time" value={dropTime} onChange={setDropTime} />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={savingStop}>
              {savingStop ? "Saving..." : "Save Point"}
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
  const { data: vehicles, refetch: refetchVehicles } = useApi(() => transportApi.listVehicles(), []);
  const { data: pilots, refetch: refetchPilots } = useApi(() => transportApi.listPilots(), []);
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
  const [pilotUsernameDraft, setPilotUsernameDraft] = useState("");
  const [pilotPasswordDraft, setPilotPasswordDraft] = useState("");
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState("");
  const [vehicleRegistrationDraft, setVehicleRegistrationDraft] = useState("");
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [pilotLicenseDraft, setPilotLicenseDraft] = useState("");
  const [pilotPhoneDraft, setPilotPhoneDraft] = useState("");
  const [pilotAddressDraft, setPilotAddressDraft] = useState("");
  const [pilotPermanentAddressDraft, setPilotPermanentAddressDraft] = useState("");
  const [pilotAadhaarDraft, setPilotAadhaarDraft] = useState("");
  const [pilotEmailDraft, setPilotEmailDraft] = useState("");
  const [pilotFormOpen, setPilotFormOpen] = useState(false);

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
    () => (pilots || []).filter((pilot) => pilot.is_active !== false).map((pilot) => ({
      id: pilot.pilot_id,
      username: pilot.username,
      value: pilot.full_name,
      licenseNumber: pilot.dl_number || "Not provided",
      phone: pilot.phone || "Not provided",
      address: pilot.present_address || "Not provided",
      permanentAddress: pilot.permanent_address || "Not provided",
      aadhaarNumber: pilot.aadhaar_number || "Not provided",
      email: pilot.email || "Not provided",
    })),
    [pilots]
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

  async function addPilot() {
    if (!pilotUsernameDraft.trim() || !pilotPasswordDraft.trim() || !pilotDraft.trim()) {
      toast("Enter a username, password, and pilot name");
      return;
    }
    try {
      await transportApi.createPilot({
        username: pilotUsernameDraft.trim(),
        password: pilotPasswordDraft,
        full_name: pilotDraft.trim(),
        email: pilotEmailDraft.trim(),
        phone: pilotPhoneDraft.trim(),
        present_address: pilotAddressDraft.trim(),
        permanent_address: pilotPermanentAddressDraft.trim(),
        aadhaar_number: pilotAadhaarDraft.trim(),
        dl_number: pilotLicenseDraft.trim(),
      });
      setPilotFormOpen(false);
      setPilotUsernameDraft("");
      setPilotPasswordDraft("");
      setPilotDraft("");
      setPilotLicenseDraft("");
      setPilotPhoneDraft("");
      setPilotAddressDraft("");
      setPilotPermanentAddressDraft("");
      setPilotAadhaarDraft("");
      setPilotEmailDraft("");
      toast("Pilot added");
      refetchPilots();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function updatePilot(pilotId) {
    if (!pilotId || !pilotDraft.trim()) return;
    try {
      await transportApi.updatePilot(pilotId, {
        username: pilotUsernameDraft.trim(),
        ...(pilotPasswordDraft.trim() ? { password: pilotPasswordDraft } : {}),
        full_name: pilotDraft.trim(),
        email: pilotEmailDraft.trim(),
        phone: pilotPhoneDraft.trim(),
        present_address: pilotAddressDraft.trim(),
        permanent_address: pilotPermanentAddressDraft.trim(),
        aadhaar_number: pilotAadhaarDraft.trim(),
        dl_number: pilotLicenseDraft.trim(),
      });
      setEditingPilotId(null);
      setPilotUsernameDraft("");
      setPilotPasswordDraft("");
      setPilotDraft("");
      setPilotLicenseDraft("");
      setPilotPhoneDraft("");
      setPilotAddressDraft("");
      setPilotPermanentAddressDraft("");
      setPilotAadhaarDraft("");
      setPilotEmailDraft("");
      toast("Pilot updated");
      refetchPilots();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function deactivatePilot(pilotId) {
    if (!window.confirm("Remove this pilot?")) return;
    try {
      await transportApi.deactivatePilot(pilotId);
      if (editingPilotId === pilotId) setEditingPilotId(null);
      toast("Pilot removed");
      refetchPilots();
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
                <button className="btn ghost sm" type="button" onClick={() => card.title === "Vehicle" ? setVehicleFormOpen((open) => !open) : setPilotFormOpen((open) => !open)}>+ Add {card.title}</button>
              </div>
              {card.title === "Vehicle" && vehicleFormOpen && (
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
              {card.title === "Pilot" && pilotFormOpen && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #dfeaf1" }}>
                  <div className="grid2">
                    <div className="field"><label>Username</label><input value={pilotUsernameDraft} onChange={(e) => setPilotUsernameDraft(e.target.value)} /></div>
                    <div className="field"><label>Password</label><input value={pilotPasswordDraft} onChange={(e) => setPilotPasswordDraft(e.target.value)} type="password" /></div>
                  </div>
                  <div className="field"><label>Pilot name</label><input value={pilotDraft} onChange={(e) => setPilotDraft(e.target.value)} /></div>
                  <div className="grid2">
                    <div className="field"><label>DL number</label><input value={pilotLicenseDraft} onChange={(e) => setPilotLicenseDraft(e.target.value)} /></div>
                    <div className="field"><label>Phone number</label><input value={pilotPhoneDraft} onChange={(e) => setPilotPhoneDraft(e.target.value)} /></div>
                    <div className="field"><label>Email</label><input value={pilotEmailDraft} onChange={(e) => setPilotEmailDraft(e.target.value)} type="email" /></div>
                    <div className="field"><label>Aadhaar number</label><input value={pilotAadhaarDraft} onChange={(e) => setPilotAadhaarDraft(e.target.value)} /></div>
                  </div>
                  <div className="grid2">
                    <div className="field"><label>Present address</label><input value={pilotAddressDraft} onChange={(e) => setPilotAddressDraft(e.target.value)} /></div>
                    <div className="field"><label>Permanent address</label><input value={pilotPermanentAddressDraft} onChange={(e) => setPilotPermanentAddressDraft(e.target.value)} /></div>
                  </div>
                  <div className="cta-row">
                    <button className="btn primary sm" type="button" onClick={addPilot}>Save</button>
                    <button className="btn ghost sm" type="button" onClick={() => { setPilotFormOpen(false); setPilotUsernameDraft(""); setPilotPasswordDraft(""); setPilotDraft(""); setPilotLicenseDraft(""); setPilotPhoneDraft(""); setPilotAddressDraft(""); setPilotPermanentAddressDraft(""); setPilotAadhaarDraft(""); setPilotEmailDraft(""); }}>Cancel</button>
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
                          <input value={pilotUsernameDraft} onChange={(e) => setPilotUsernameDraft(e.target.value)} placeholder="Username" style={{ flex: 1, minWidth: 0 }} />
                          <input value={card.draft} onChange={(e) => card.setDraft(e.target.value)} placeholder="Full name" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotLicenseDraft} onChange={(e) => setPilotLicenseDraft(e.target.value)} placeholder="DL number" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotPhoneDraft} onChange={(e) => setPilotPhoneDraft(e.target.value)} placeholder="Phone number" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotAddressDraft} onChange={(e) => setPilotAddressDraft(e.target.value)} placeholder="Present address" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotPermanentAddressDraft} onChange={(e) => setPilotPermanentAddressDraft(e.target.value)} placeholder="Permanent address" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotAadhaarDraft} onChange={(e) => setPilotAadhaarDraft(e.target.value)} placeholder="Aadhaar number" style={{ flex: 1, minWidth: 0 }} />
                          <input value={pilotEmailDraft} onChange={(e) => setPilotEmailDraft(e.target.value)} placeholder="Email" type="email" style={{ flex: 1, minWidth: 0 }} />
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
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                Username: {record.username} · DL: {record.licenseNumber} · Phone: {record.phone} · Present address: {record.address} · Permanent address: {record.permanentAddress} · Aadhaar: {record.aadhaarNumber} · Email: {record.email}
                              </div>
                            </>
                          )}
                        </div>
                        <button className="btn ghost sm" type="button" onClick={() => {
                          card.setEditingId(record.id);
                          card.setDraft(card.title === "Vehicle" ? record.number : record.value);
                          if (card.title === "Vehicle") {
                            setVehicleTypeDraft(record.type);
                            setVehicleRegistrationDraft(record.registration);
                          } else {
                            setPilotUsernameDraft(record.username || "");
                            setPilotLicenseDraft(record.licenseNumber === "Not provided" ? "" : record.licenseNumber);
                            setPilotPhoneDraft(record.phone === "Not provided" ? "" : record.phone);
                            setPilotAddressDraft(record.address === "Not provided" ? "" : record.address);
                            setPilotPermanentAddressDraft(record.permanentAddress === "Not provided" ? "" : record.permanentAddress);
                            setPilotAadhaarDraft(record.aadhaarNumber === "Not provided" ? "" : record.aadhaarNumber);
                            setPilotEmailDraft(record.email === "Not provided" ? "" : record.email);
                          }
                        }}>Edit</button>
                        {card.title === "Vehicle" && (
                          <button className="btn ghost sm" type="button" onClick={() => deactivateVehicle(record.id)}>
                            Remove
                          </button>
                        )}
                        {card.title === "Pilot" && (
                          <button className="btn ghost sm" type="button" onClick={() => deactivatePilot(record.id)}>
                            Remove
                          </button>
                        )}
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
              <select value={driver} onChange={(e) => setDriver(e.target.value)} disabled={!pilots}>
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
