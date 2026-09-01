import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as schoolsApi from "../../api/schools";
import * as notificationsApi from "../../api/notifications";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Kpi, Pill } from "../../components/ui/Primitives";
import ImageUpload from "../../components/ui/ImageUpload";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client";
import { isValidPhone, isValidEmail } from "../../utils/validation";

const FEATURES = [
  { key: "route_enabled", label: "Route" },
  { key: "website_enabled", label: "School Website" },
  { key: "library_enabled", label: "Library Management" },
  { key: "fees_enabled", label: "Fee Management" },
  { key: "salary_enabled", label: "Salary Management" },
];

function schoolDetailsForm(school) {
  return {
    name: school.name || "",
    address: school.address || "",
    city: school.city || "",
    state: school.state || "",
    country: school.country || "",
    pincode: school.pincode || "",
    primary_contact: school.primary_contact || "",
    primary_email: school.primary_email || "",
    alternate_contact: school.alternate_contact || "",
    alternate_email: school.alternate_email || "",
    logo_url: school.logo_url || "",
  };
}

function SchoolLogoPanel({ school, editing, value, onChange, onError, schoolId }) {
  const initial = school?.name?.[0]?.toUpperCase() || "?";
  const logoUrl = resolveMediaUrl(editing ? value : school?.logo_url);

  if (editing) {
    return (
      <div className="school-details-logo">
        <ImageUpload
          label="School logo"
          hint="Square image works best."
          value={value}
          onChange={onChange}
          onError={onError}
          schoolId={school?.school_id || schoolId}
        />
      </div>
    );
  }

  return (
    <div className="school-details-logo">
      <div className="school-logo-label">School Logo</div>
      {logoUrl ? (
        <img src={logoUrl} alt={`${school.name} logo`} className="school-logo-preview" />
      ) : (
        <div className="school-logo-placeholder">{initial}</div>
      )}
    </div>
  );
}

export default function MasterSchoolDetail() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: school, loading, error, refetch } = useApi(() => schoolsApi.getSchool(schoolId), [schoolId]);
  const { data: stats } = useApi(() => schoolsApi.getStats(schoolId), [schoolId]);
  const { data: notifications, refetch: refetchNotifications } = useApi(
    () => notificationsApi.listNotifications(schoolId),
    [schoolId]
  );

  const [notifType, setNotifType] = useState("Dues");
  const [notifMessage, setNotifMessage] = useState("");
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [detailsForm, setDetailsForm] = useState(null);

  useEffect(() => {
    if (school && !detailsEditing) setDetailsForm(schoolDetailsForm(school));
  }, [school, detailsEditing]);

  async function toggleFeature(key, current) {
    try {
      await schoolsApi.updateFeatures(schoolId, { [key]: !current });
      toast("Feature updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function toggleStatus() {
    try {
      await schoolsApi.updateStatus(schoolId, school.status === "Active" ? "Inactive" : "Active");
      toast("Status updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function sendNotification(e) {
    e.preventDefault();
    if (!notifMessage.trim()) {
      toast("Write a message");
      return;
    }
    try {
      const result = await notificationsApi.sendNotification(schoolId, { type: notifType, message: notifMessage });
      const recipients = result.email_recipients?.length
        ? ` — emailed to ${result.email_recipients.join(", ")}`
        : "";
      toast(`Notification sent${recipients}`);
      setNotifMessage("");
      refetchNotifications();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function removeSchool() {
    try {
      await schoolsApi.deleteSchool(schoolId);
      toast("School removed");
      navigate("/master/schools");
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    try {
      await schoolsApi.updateSchool(schoolId, detailsForm);
      toast("School details updated");
      setDetailsEditing(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  if (loading) return <MasterShell><Spinner /></MasterShell>;
  if (error) return <MasterShell><ErrorBanner message={error} /></MasterShell>;
  if (!school) return null;

  return (
    <MasterShell>
      <div className="master-detail-header">
        <button className="btn ghost sm master-back-btn" onClick={() => navigate("/master/schools")}>
          ← Back to Schools
        </button>
        <div className="master-detail-heading">
          <div className="scr-title master-detail-title">{school.name}</div>
          <div className="scr-sub master-detail-sub">{school.city}, {school.state}</div>
        </div>
      </div>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Pill tone={school.status === "Active" ? "ok" : "mute"}>{school.status}</Pill>
        <button className="btn ghost sm" onClick={toggleStatus}>
          {school.status === "Active" ? "Deactivate" : "Activate"}
        </button>
      </div>

      <div className="section-header">
        <div className="section-label">School Details</div>
        {!detailsEditing && (
          <button className="btn ghost sm" onClick={() => {
            setDetailsForm(schoolDetailsForm(school));
            setDetailsEditing(true);
          }}>
            Edit Details
          </button>
        )}
      </div>
      {detailsEditing ? (
        <form className="card school-details-layout" onSubmit={saveDetails}>
          <div className="school-details-fields">
            <div className="field school-detail-wide">
              <label>School Name</label>
              <input value={detailsForm.name} onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })} required />
            </div>
            <div className="field school-detail-wide">
              <label>Address</label>
              <input value={detailsForm.address} onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })} required />
            </div>
            <div className="field">
              <label>City</label>
              <input value={detailsForm.city} onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })} required />
            </div>
            <div className="field">
              <label>State</label>
              <input value={detailsForm.state} onChange={(e) => setDetailsForm({ ...detailsForm, state: e.target.value })} required />
            </div>
            <div className="field">
              <label>Country</label>
              <input value={detailsForm.country} onChange={(e) => setDetailsForm({ ...detailsForm, country: e.target.value })} required />
            </div>
            <div className="field">
              <label>Pincode</label>
              <input value={detailsForm.pincode} onChange={(e) => setDetailsForm({ ...detailsForm, pincode: e.target.value })} required />
            </div>
            <div className="field">
              <label>Primary Contact</label>
              <input type="tel" value={detailsForm.primary_contact} onChange={(e) => setDetailsForm({ ...detailsForm, primary_contact: e.target.value })} required />
            </div>
            <div className="field">
              <label>Primary Email</label>
              <input type="email" value={detailsForm.primary_email} onChange={(e) => setDetailsForm({ ...detailsForm, primary_email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Alternate Contact</label>
              <input type="tel" value={detailsForm.alternate_contact} onChange={(e) => setDetailsForm({ ...detailsForm, alternate_contact: e.target.value })} />
            </div>
            <div className="field">
              <label>Alternate Email</label>
              <input type="email" value={detailsForm.alternate_email} onChange={(e) => setDetailsForm({ ...detailsForm, alternate_email: e.target.value })} />
            </div>
            <div className="cta-row school-detail-wide">
              <button className="btn primary" type="submit">Save Details</button>
              <button className="btn ghost" type="button" onClick={() => {
                setDetailsForm(schoolDetailsForm(school));
                setDetailsEditing(false);
              }}>
                Cancel
              </button>
            </div>
          </div>
          <SchoolLogoPanel
            school={school}
            editing
            value={detailsForm.logo_url}
            onChange={(logo_url) => setDetailsForm({ ...detailsForm, logo_url })}
            onError={toast}
            schoolId={schoolId}
          />
        </form>
      ) : (
        <div className="card school-details-layout">
          <div className="school-details-fields">
            <div className="school-detail-item school-detail-wide">
              <span>Address</span>
              <b>{school.address || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>City</span>
              <b>{school.city || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>State</span>
              <b>{school.state || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Country</span>
              <b>{school.country || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Pincode</span>
              <b>{school.pincode || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Primary Contact</span>
              <b>{school.primary_contact || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Primary Email</span>
              <b>{school.primary_email || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Alternate Contact</span>
              <b>{school.alternate_contact || "Not provided"}</b>
            </div>
            <div className="school-detail-item">
              <span>Alternate Email</span>
              <b>{school.alternate_email || "Not provided"}</b>
            </div>
          </div>
          <SchoolLogoPanel school={school} editing={false} schoolId={schoolId} />
        </div>
      )}

      {stats && (
        <>
          <div className="section-label">Reports</div>
          <div className="grid4" style={{ marginBottom: 16 }}>
            <Kpi n={stats.teachers} label="Teachers" />
            <Kpi n={stats.staff} label="Staff" />
            <Kpi n={stats.students} label="Students" />
            <Kpi n={stats.parents} label="Parents" />
          </div>
        </>
      )}

      <div className="section-label">Feature Access</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {FEATURES.map((f) => (
          <div key={f.key} className="listitem">
            <div className="meta"><b>{f.label}</b></div>
            <button
              className={`btn sm ${school[f.key] ? "toggle-on" : "toggle-off"}`}
              onClick={() => toggleFeature(f.key, school[f.key])}
            >
              {school[f.key] ? "Enabled" : "Disabled"}
            </button>
          </div>
        ))}
      </div>

      <div className="section-label">Send Notification</div>
      <form className="card" onSubmit={sendNotification} style={{ marginBottom: 10 }}>
        <div className="field">
          <label>Type</label>
          <select value={notifType} onChange={(e) => setNotifType(e.target.value)}>
            <option value="Dues">Dues</option>
            <option value="Activation">Activation</option>
            <option value="General">General</option>
          </select>
        </div>
        <div className="field">
          <label>Message</label>
          <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} placeholder="e.g. Your annual dues are pending..." />
        </div>
        <button className="btn primary" type="submit">Send Notification</button>
      </form>

      <div className="section-label">Notification History</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {notifications && notifications.length ? (
          notifications.map((n) => (
            <div key={n.notification_id} className="listitem">
              <div className="meta"><b>{n.type}</b><span>{n.message}</span></div>
            </div>
          ))
        ) : (
          <Empty>No notifications sent yet.</Empty>
        )}
      </div>

      <button className="btn danger block" onClick={removeSchool}>Delete School</button>
    </MasterShell>
  );
}
