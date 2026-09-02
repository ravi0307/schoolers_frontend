import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, initials } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import { isValidPhone, isValidEmail } from "../../utils/validation";

function getValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

function normalizeTeacher(person) {
  return {
    ...person,
    role_title: getValue(person, ["role_title", "role"]) || "Subject Teacher",
    email: getValue(person, ["email", "email_id"]) || "",
    emergency_number: getValue(person, ["emergency_number", "emergency_contact", "emergency_contact_number"]) || "",
    present_address: getValue(person, ["present_address", "current_address"]) || "",
    permanent_address: getValue(person, ["permanent_address"]) || "",
    date_of_birth: getValue(person, ["date_of_birth", "dob"]) || "",
    gender: getValue(person, ["gender"]) || "",
  };
}

export default function AdminTeachers() {
  const { data, loading, error, refetch } = useApi(() => peopleApi.listTeachers(), []);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [gender, setGender] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredData = (data || []).map(normalizeTeacher).filter((teacher) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${teacher.name || ""} ${teacher.role_title || ""} ${teacher.email || ""}`.toLowerCase().includes(q);
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setRoleTitle("");
    setPhone("");
    setEmail("");
    setPresentAddress("");
    setPermanentAddress("");
    setDateOfBirth("");
    setEmergencyNumber("");
    setGender("");
    setFormOpen(false);
  }

  function startEdit(person) {
    const normalized = normalizeTeacher(person);
    setEditingId(person.teacher_id || person.id);
    setName(person.name || "");
    setRoleTitle(normalized.role_title || "");
    setPhone(person.phone || "");
    setEmail(normalized.email || "");
    setPresentAddress(normalized.present_address || "");
    setPermanentAddress(normalized.permanent_address || "");
    setDateOfBirth(normalized.date_of_birth || "");
    setEmergencyNumber(normalized.emergency_number || "");
    setGender(normalized.gender || "");
    setFormOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Enter a name");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      toast("Enter a valid phone number");
      return;
    }
    if (email && !isValidEmail(email)) {
      toast("Enter a valid email ID");
      return;
    }
    if (emergencyNumber && !isValidPhone(emergencyNumber)) {
      toast("Enter a valid emergency contact number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        role_title: roleTitle || "Subject Teacher",
        phone: phone || null,
        email: email || null,
        present_address: presentAddress || null,
        permanent_address: permanentAddress || null,
        date_of_birth: dateOfBirth || null,
        emergency_number: emergencyNumber || null,
        gender: gender || null,
      };

      if (editingId) {
        await peopleApi.updateTeacher(editingId, payload);
        toast(name + " updated");
      } else {
        await peopleApi.createTeacher(payload);
        toast(name + " added");
      }

      resetForm();
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    try {
      await peopleApi.deleteTeacher(id);
      toast("Teacher removed");
      setExpandedId((current) => (current === id ? null : current));
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function toggleExpanded(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <AdminShell>
      <div className="scr-title">Teacher's List</div>
      <div className="scr-sub">{data ? `${data.length} teaching staff` : ""}</div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Search teacher</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role"
              />
            </div>
          </div>

          <div className="card">
            {filteredData.length ? (
              filteredData.map((teacher) => {
                const teacherId = teacher.teacher_id || teacher.id;
                const isExpanded = expandedId === teacherId;
                const phoneValue = teacher.phone || "Not provided";
                const emailValue = teacher.email || "Not provided";
                const presentAddressValue = teacher.present_address || "Not provided";
                const permanentAddressValue = teacher.permanent_address || "Not provided";
                const dobValue = teacher.date_of_birth || "Not provided";
                const emergencyValue = teacher.emergency_number || "Not provided";
                const genderValue = teacher.gender || "Not provided";

                return (
                  <div key={teacherId} className="listitem" style={{ display: "block", cursor: "pointer" }} onClick={() => toggleExpanded(teacherId)}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}>
                      <div className="avatar y">{initials(teacher.name)}</div>

                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <div style={{ minWidth: 0, fontWeight: 700 }}>{teacher.name}</div>
                        <div style={{ flex: 1, textAlign: "center", color: "#374151" }}>{teacher.role_title || "Subject Teacher"}</div>
                      </div>

                      <div className="cta-row" style={{ gap: 8, marginLeft: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn ghost sm" onClick={() => startEdit(teacher)}>Edit</button>
                        <button className="btn ghost sm" onClick={() => remove(teacherId)}>Remove</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid #e5e7eb",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone</strong>
                          <span>{phoneValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email ID</strong>
                          <span>{emailValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Present Address</strong>
                          <span>{presentAddressValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Permanent Address</strong>
                          <span>{permanentAddressValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date of Birth</strong>
                          <span>{dobValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Number</strong>
                          <span>{emergencyValue}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gender</strong>
                          <span>{genderValue}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <Empty>No teachers yet.</Empty>
            )}
          </div>
        </>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mr. Kapoor" />
          </div>
          <div className="field">
            <label>Role / Title</label>
            <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Class Teacher · Grade 5-A" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
          </div>
          <div className="field">
            <label>Email ID</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" />
          </div>
          <div className="field">
            <label>Present address</label>
            <textarea value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} rows={3} placeholder="Current address" />
          </div>
          <div className="field">
            <label>Permanent address</label>
            <textarea value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} rows={3} placeholder="Permanent address" />
          </div>
          <div className="field">
            <label>Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="field">
            <label>Emergency contact number</label>
            <input value={emergencyNumber} onChange={(e) => setEmergencyNumber(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
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
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save Changes" : "Add Teacher"}
            </button>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Teacher</button>
      )}
    </AdminShell>
  );
}
