import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as schoolsApi from "../../api/schools";
import * as notificationsApi from "../../api/notifications";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Kpi, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

const FEATURES = [
  { key: "route_enabled", label: "Route" },
  { key: "website_enabled", label: "School Website" },
  { key: "library_enabled", label: "Library Management" },
  { key: "fees_enabled", label: "Fee Management" },
  { key: "salary_enabled", label: "Salary Management" },
];

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
      await notificationsApi.sendNotification(schoolId, { type: notifType, message: notifMessage });
      toast("Notification sent");
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

  if (loading) return <MasterShell><Spinner /></MasterShell>;
  if (error) return <MasterShell><ErrorBanner message={error} /></MasterShell>;
  if (!school) return null;

  return (
    <MasterShell>
      <button className="btn ghost sm" onClick={() => navigate("/master/schools")} style={{ marginBottom: 14 }}>
        ← Back to Schools
      </button>
      <div className="scr-title">{school.name}</div>
      <div className="scr-sub">{school.city}, {school.state}</div>

      <div className="card white" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Pill tone={school.status === "Active" ? "ok" : "mute"}>{school.status}</Pill>
        <button className="btn ghost sm" onClick={toggleStatus}>
          {school.status === "Active" ? "Deactivate" : "Activate"}
        </button>
      </div>

      {stats && (
        <>
          <div className="section-label">Reports</div>
          <div className="grid2" style={{ marginBottom: 8 }}>
            <Kpi n={stats.teachers} label="Teachers" />
            <Kpi n={stats.staff} label="Staff" />
          </div>
          <div className="grid2" style={{ marginBottom: 16 }}>
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
              className="btn sm"
              style={{
                background: school[f.key] ? "var(--ok-green)" : "var(--line)",
                color: school[f.key] ? "#fff" : "var(--ink)",
              }}
              onClick={() => toggleFeature(f.key, school[f.key])}
            >
              {school[f.key] ? "Enabled" : "Disabled"}
            </button>
          </div>
        ))}
      </div>

      <div className="section-label">Send Notification</div>
      <form className="card white" onSubmit={sendNotification} style={{ marginBottom: 10 }}>
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
