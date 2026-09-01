import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

function getValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi(() => peopleApi.listStudents({ search: search || undefined }), [search]);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentEmergencyNumber, setParentEmergencyNumber] = useState("");

  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAdmissionNo, setEditAdmissionNo] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentAddress, setEditParentAddress] = useState("");
  const [editParentEmergencyNumber, setEditParentEmergencyNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setClassId("");
    setDateOfBirth("");
    setGender("");
    setParentName("");
    setParentPhone("");
    setParentEmail("");
    setParentAddress("");
    setParentEmergencyNumber("");
    setFormOpen(false);
    setEditingStudentId(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !classId) {
      toast("Enter a name and pick a class");
      return;
    }
    setSubmitting(true);
    try {
      await peopleApi.createStudent({
        name,
        class_id: Number(classId),
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        parent_email: parentEmail || null,
        parent_address: parentAddress || null,
        parent_emergency_number: parentEmergencyNumber || null,
      });
      toast(name + " added");
      resetForm();
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStudent(id) {
    const payload = {
      name: editName.trim(),
      admission_no: editAdmissionNo.trim(),
      class_id: Number(editClassId),
      date_of_birth: editDateOfBirth || null,
      gender: editGender || null,
      parent_name: editParentName || null,
      parent_phone: editParentPhone || null,
      parent_email: editParentEmail || null,
      parent_address: editParentAddress || null,
      parent_emergency_number: editParentEmergencyNumber || null,
    };

    if (!payload.name || !payload.class_id) {
      toast("Enter a name and pick a class");
      return;
    }

    try {
      await peopleApi.updateStudent(id, payload);
      toast("Student updated");
      setEditingStudentId(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function remove(id) {
    try {
      await peopleApi.deleteStudent(id);
      toast("Student removed");
      if (expandedStudentId === id) setExpandedStudentId(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function toggleExpanded(id) {
    setExpandedStudentId((current) => (current === id ? null : id));
  }

  return (
    <AdminShell>
      <div className="scr-title">Student List</div>
      <div className="scr-sub">School-wide roster</div>

      <div className="field">
        <input
          placeholder="Search by name or admission no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((s) => {
              const isExpanded = expandedStudentId === s.student_id;
              const className = (classes || []).find((c) => c.class_id === s.class_id)?.name || "Unassigned";
              const studentDOB = getValue(s, ["date_of_birth", "dob"]) || "Not provided";
              const studentGender = getValue(s, ["gender"]) || "Not provided";
              const parentNameValue = getValue(s, ["parent_name", "guardian_name"]) || "Not provided";
              const parentPhoneValue = getValue(s, ["parent_phone", "guardian_phone"]) || "Not provided";
              const parentEmailValue = getValue(s, ["parent_email", "guardian_email"]) || "Not provided";
              const parentAddressValue = getValue(s, ["parent_address", "guardian_address"]) || "Not provided";
              const parentEmergencyValue = getValue(s, ["parent_emergency_number", "guardian_emergency_number"]) || "Not provided";

              return (
                <div key={s.student_id} style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: isExpanded ? 8 : 0, marginBottom: isExpanded ? 8 : 0 }}>
                  <div
                    className="listitem"
                    onClick={() => toggleExpanded(s.student_id)}
                    style={{
                      cursor: "pointer",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <div className="avatar">{initials(s.name)}</div>
                      <div style={{ fontWeight: 700, marginLeft: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </div>
                    </div>

                    <div style={{ flex: 1, textAlign: "center", color: "#374151", fontWeight: 500 }}>
                      {s.admission_no}
                    </div>

                    <div className="cta-row" style={{ gap: 8, minWidth: 220, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                      <Pill tone={s.present_today ? "ok" : "warn"}>{s.present_today ? "Present" : "Absent"}</Pill>
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          setEditingStudentId(s.student_id);
                          setEditName(s.name || "");
                          setEditAdmissionNo(s.admission_no || "");
                          setEditClassId(String(s.class_id || ""));
                          setEditDateOfBirth(getValue(s, ["date_of_birth", "dob"]) || "");
                          setEditGender(getValue(s, ["gender"]) || "");
                          setEditParentName(getValue(s, ["parent_name", "guardian_name"]) || "");
                          setEditParentPhone(getValue(s, ["parent_phone", "guardian_phone"]) || "");
                          setEditParentEmail(getValue(s, ["parent_email", "guardian_email"]) || "");
                          setEditParentAddress(getValue(s, ["parent_address", "guardian_address"]) || "");
                          setEditParentEmergencyNumber(getValue(s, ["parent_emergency_number", "guardian_emergency_number"]) || "");
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn ghost sm" onClick={() => remove(s.student_id)}>Remove</button>
                    </div>
                  </div>

                  {editingStudentId === s.student_id && (
                    <div className="card white" style={{ margin: "8px 0 10px" }}>
                      <div className="field">
                        <label>Student name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Admission no.</label>
                        <input value={editAdmissionNo} onChange={(e) => setEditAdmissionNo(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Class</label>
                        <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)}>
                          <option value="">Select a class</option>
                          {(classes || []).map((c) => (
                            <option key={c.class_id} value={c.class_id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Date of birth</label>
                        <input type="date" value={editDateOfBirth} onChange={(e) => setEditDateOfBirth(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Gender</label>
                        <select value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Parent name</label>
                        <input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent phone</label>
                        <input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent email</label>
                        <input type="email" value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent address</label>
                        <textarea rows={3} value={editParentAddress} onChange={(e) => setEditParentAddress(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent emergency number</label>
                        <input value={editParentEmergencyNumber} onChange={(e) => setEditParentEmergencyNumber(e.target.value)} />
                      </div>
                      <div className="cta-row">
                        <button className="btn primary sm" onClick={() => updateStudent(s.student_id)}>Save</button>
                        <button className="btn ghost sm" onClick={() => setEditingStudentId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Student Details</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                        {[
                          ["Name", s.name],
                          ["Admission No", s.admission_no || "Not provided"],
                          ["Class", className],
                          ["Status", s.present_today ? "Present" : "Absent"],
                          ["Date of Birth", studentDOB],
                          ["Gender", studentGender],
                          ["Parent Name", parentNameValue],
                          ["Parent Phone", parentPhoneValue],
                          ["Parent Email", parentEmailValue],
                          ["Parent Emergency Number", parentEmergencyValue],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{value}</div>
                          </div>
                        ))}
                        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 4 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                            Parent Address
                          </div>
                          <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{parentAddressValue}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty>No students match.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha Verma" />
          </div>
          <div className="field">
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select a class</option>
              {(classes || []).map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Parent name</label>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Anvi Swaminathan" />
          </div>
          <div className="field">
            <label>Parent phone</label>
            <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 98xxxx0000" />
          </div>
          <div className="field">
            <label>Parent email</label>
            <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
          </div>
          <div className="field">
            <label>Parent address</label>
            <textarea rows={3} value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} placeholder="Parent address" />
          </div>
          <div className="field">
            <label>Parent emergency number</label>
            <input value={parentEmergencyNumber} onChange={(e) => setParentEmergencyNumber(e.target.value)} placeholder="e.g. 98xxxx0000" />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Student"}
            </button>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Student</button>
      )}
    </AdminShell>
  );
}
