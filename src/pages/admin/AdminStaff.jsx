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
  const storedRole = getStaffValue(person, ["role_title", "role"]);
  const roleCategory = storedRole === "Teacher" || storedRole.toLowerCase().includes("teacher")
    ? "Teacher"
    : storedRole === "Pilot" || storedRole.toLowerCase().includes("pilot")
      ? "Pilot"
      : "Other staff";

  return {
    ...person,
    role_title: storedRole || "Other staff",
    role_category: roleCategory,
    custom_role_title: roleCategory === "Other staff" && storedRole !== "Other staff" ? storedRole : "",
    email: getStaffValue(person, ["email", "email_id"]) || "",
    date_of_birth: getStaffValue(person, ["date_of_birth", "dob"]) || "",
    marital_status: getStaffValue(person, ["marital_status"]) || "",
    driving_license: getStaffValue(person, ["driving_license", "dl_number"]) || "",
    gender: getStaffValue(person, ["gender"]) || "",
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
  const [roleCategory, setRoleCategory] = useState("");
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [gender, setGender] = useState("");
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
    setRoleCategory("");
    setCustomRoleTitle("");
    setDrivingLicense("");
    setPhone("");
    setEmail("");
    setDateOfBirth("");
    setMaritalStatus("");
    setGender("");
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
    setRoleCategory(normalized.role_category);
    setCustomRoleTitle(normalized.custom_role_title);
    setDrivingLicense(getStaffValue(person, ["driving_license", "dl_number"]));
    setPhone(person.phone || "");
    setEmail(normalized.email || "");
    setDateOfBirth(getStaffValue(person, ["date_of_birth", "dob"]));
    setMaritalStatus(getStaffValue(person, ["marital_status"]));
    setGender(getStaffValue(person, ["gender"]));
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
    if (!roleCategory) {
      toast("Select a role");
      return;
    }
    if (roleCategory === "Other staff" && !customRoleTitle.trim()) {
      toast("Enter the staff title");
      return;
    }
    if (roleCategory === "Pilot" && !drivingLicense.trim()) {
      toast("Enter the driving license number");
      return;
    }
    if (!dateOfBirth || !maritalStatus || !gender || !phone.trim() || !email.trim() || !presentAddress.trim() || !permanentAddress.trim() || !aadhaarNumber.trim() || !emergencyContact.trim()) {
      toast("Complete all required staff fields");
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
        role: roleCategory === "Other staff" ? customRoleTitle.trim() : roleCategory,
        phone: phone.trim(),
        email: email.trim(),
        date_of_birth: dateOfBirth,
        marital_status: maritalStatus,
        gender,
        present_address: presentAddress.trim(),
        permanent_address: permanentAddress.trim(),
        aadhaar_card: aadhaarNumber.trim(),
        emergency_number: emergencyContact.trim(),
        driving_license: roleCategory === "Pilot" ? drivingLicense.trim() : null,
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
                const drivingLicenseValue = person.driving_license || "";
                const dateOfBirthValue = person.date_of_birth || "";
                const maritalStatusValue = person.marital_status || "";
                const genderValue = person.gender || "";

                return (
                  <div key={staffId} className="listitem" style={{ display: "block", cursor: "pointer" }} onClick={() => toggleExpanded(staffId)}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}>
                      <div className="avatar b">{initials(person.name)}</div>

                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                          <b>{person.name}</b>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <span>{person.role_title || "Other staff"}</span>
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
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date of Birth</strong>
                          <span>{dateOfBirthValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Marital Status</strong>
                          <span>{maritalStatusValue || "Not provided"}</span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gender</strong>
                          <span>{genderValue || "Not provided"}</span>
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
                        {person.role_category === "Pilot" ? (
                          <div style={{ display: "grid", gap: 4 }}>
                            <strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Driving License</strong>
                            <span>{drivingLicenseValue || "Not provided"}</span>
                          </div>
                        ) : null}
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
            <label>Full name <span className="required-mark">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha Nair" />
          </div>
          <div className="field">
            <label>Role / Title <span className="required-mark">*</span></label>
            <select required value={roleCategory} onChange={(e) => {
              setRoleCategory(e.target.value);
              if (e.target.value !== "Other staff") setCustomRoleTitle("");
            }}>
              <option value="">Select role</option>
              <option value="Teacher">Teacher</option>
              <option value="Pilot">Pilot</option>
              <option value="Other staff">Other staff</option>
            </select>
          </div>
          {roleCategory === "Other staff" ? (
            <div className="field">
              <label>Staff title <span className="required-mark">*</span></label>
              <input required
                value={customRoleTitle}
                onChange={(e) => setCustomRoleTitle(e.target.value)}
                placeholder="e.g. Admin Assistant"
              />
            </div>
          ) : null}
          {roleCategory === "Pilot" ? (
            <div className="field">
              <label>Driving License <span className="required-mark">*</span></label>
              <input
                required
                value={drivingLicense}
                onChange={(e) => setDrivingLicense(e.target.value)}
                placeholder="Enter driving license number"
              />
            </div>
          ) : null}
          <div className="field">
            <label>Phone <span className="required-mark">*</span></label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
          </div>
          <div className="field">
            <label>Email ID <span className="required-mark">*</span></label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="field">
            <label>Date of birth <span className="required-mark">*</span></label>
            <input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="field">
            <label>Marital status <span className="required-mark">*</span></label>
            <select required value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
              <option value="">Select marital status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div className="field">
            <label>Gender <span className="required-mark">*</span></label>
            <select required value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Present address <span className="required-mark">*</span></label>
            <textarea required value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} rows={3} placeholder="Current residential address" />
          </div>
          <div className="field">
            <label>Permanent address <span className="required-mark">*</span></label>
            <textarea required value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} rows={3} placeholder="Permanent address" />
          </div>
          <div className="field">
            <label>Aadhaar card number <span className="required-mark">*</span></label>
            <input required value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="XXXX XXXX XXXX" inputMode="numeric" maxLength={14} />
          </div>
          <div className="field">
            <label>Emergency contact number <span className="required-mark">*</span></label>
            <input required value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="e.g. 98xxxx0000" inputMode="numeric" maxLength={15} />
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
