import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, initials } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import { isValidPhone, isValidEmail, isValidAadhaar } from "../../utils/validation";

function getStaffValue(person, keys) {
  for (const key of keys) {
    const value = person?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

function normalizeStaffPerson(person) {
  return {
    ...person,
    role_title: getStaffValue(person, ["role_title", "role"]) || "Support Staff",
    email: getStaffValue(person, ["email", "email_id"]) || "",
    emergency_contact: getStaffValue(person, ["emergency_number", "emergency_contact", "emergency_contact_number"]) || "",
    aadhaar_number: getStaffValue(person, ["aadhaar_card", "aadhaar_number", "aadhaar_card_number"]) || "",
  };
}

export default function AdminStaff() {
  const { data, loading, error, refetch } = useApi(() => peopleApi.listStaff(), []);
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredData = (data || []).map(normalizeStaffPerson).filter((person) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${person.name || ""} ${person.role_title || ""} ${person.email || ""}`.toLowerCase().includes(q);
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setRoleTitle("");
    setPhone("");
    setEmail("");
    setPresentAddress("");
    setPermanentAddress("");
    setAadhaarNumber("");
    setEmergencyContact("");
    setFormOpen(false);
  }

  function startEdit(person) {
    const normalized = normalizeStaffPerson(person);
    setEditingId(person.staff_id || person.id);
    setName(person.name || "");
    setRoleTitle(normalized.role_title || "");
    setPhone(person.phone || "");
    setEmail(normalized.email || "");
    setPresentAddress(getStaffValue(person, ["present_address", "current_address"]) || "");
    setPermanentAddress(getStaffValue(person, ["permanent_address"]) || "");
    setAadhaarNumber(normalized.aadhaar_number || "");
    setEmergencyContact(normalized.emergency_contact || "");
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
    if (aadhaarNumber && !isValidAadhaar(aadhaarNumber)) {
      toast("Enter a valid Aadhaar number (12 digits)");
      return;
    }
    if (emergencyContact && !isValidPhone(emergencyContact)) {
      toast("Enter a valid emergency contact number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        role: roleTitle || "Support Staff",
        phone: phone || "—",
        email: email || null,
        present_address: presentAddress || null,
        permanent_address: permanentAddress || null,
        aadhaar_card: aadhaarNumber || null,
        emergency_number: emergencyContact || null,
      };

      if (editingId) {
        await peopleApi.updateStaff(editingId, payload);
        toast(name + " updated");
      } else {
        await peopleApi.createStaff(payload);
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
      await peopleApi.deleteStaff(id);
      toast("Staff removed");
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
      <div className="scr-title">Staff Directory</div>
      <div className="scr-sub">{data ? `${data.length} staff members` : ""}</div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Search staff</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role"
              />
            </div>
          </div>

          <div className="card">
            {filteredData.length ? (
              filteredData.map((person) => {
                const staffId = person.staff_id || person.id;
                const isExpanded = expandedId === staffId;
                const emailValue = person.email || "";
                const emergencyValue = person.emergency_contact || "";
                const presentAddressValue = getStaffValue(person, ["present_address", "current_address"]) || "";
                const permanentAddressValue = getStaffValue(person, ["permanent_address"]) || "";
                const aadhaarValue = person.aadhaar_number || "";

                return (
                  <div key={staffId} className="listitem" style={{ display: "block", cursor: "pointer" }} onClick={() => toggleExpanded(staffId)}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}>
                      <div className="avatar b">{initials(person.name)}</div>

                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                          <b>{person.name}</b>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <span>{person.role_title || "Support Staff"}</span>
                        </div>
                      </div>

                      <div className="cta-row" style={{ gap: 8, marginLeft: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn ghost sm" onClick={() => startEdit(person)}>Edit</button>
                        <button className="btn ghost sm" onClick={() => remove(staffId)}>Remove</button>
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
                          <span>{person.phone || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email ID</strong>
                          <span>{emailValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Present Address</strong>
                          <span>{presentAddressValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Permanent Address</strong>
                          <span>{permanentAddressValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aadhaar Card</strong>
                          <span>{aadhaarValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Contact</strong>
                          <span>{emergencyValue || "Not provided"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <Empty>No staff found.</Empty>
            )}
          </div>
        </>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha Nair" />
          </div>
          <div className="field">
            <label>Role / Title</label>
            <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Admin Assistant" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
          </div>
          <div className="field">
            <label>Email ID</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="field">
            <label>Present address</label>
            <textarea value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} rows={3} placeholder="Current residential address" />
          </div>
          <div className="field">
            <label>Permanent address</label>
            <textarea value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} rows={3} placeholder="Permanent address" />
          </div>
          <div className="field">
            <label>Aadhaar card number</label>
            <input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="XXXX XXXX XXXX" inputMode="numeric" maxLength={14} />
          </div>
          <div className="field">
            <label>Emergency contact number</label>
            <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save Changes" : "Add Staff"}
            </button>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>
          + Add Staff
        </button>
      )}
    </AdminShell>
  );
}
