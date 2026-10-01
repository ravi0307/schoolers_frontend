import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/layout/AdminShell";
import ParentShell from "../components/layout/ParentShell";
import TeacherShell from "../components/layout/TeacherShell";
import PilotShell from "../components/layout/PilotShell";
import MasterShell from "../components/layout/MasterShell";
import StaffSelfSummary from "../components/profile/StaffSelfSummary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApi } from "../hooks/useApi";
import * as authApi from "../api/auth";
import { Spinner, ErrorBanner } from "../components/ui/Primitives";
import { resolveMediaUrl } from "../api/client";

/**
 * The signed-in user's own account: read-only details plus a password change.
 *
 * Details are shown rather than edited because there is nothing to edit
 * generically: a display name lives on the linked staff/parent row and is
 * maintained by whoever administers that record, and changing it here would
 * quietly fork two sources of truth. The one field a user genuinely owns is
 * their password, so that gets a form.
 *
 * The current password is required alongside the new one. The anonymous
 * forgot-password flow cannot be used from here because it needs an emailed
 * OTP, and this page is for someone who is already signed in — asking for the
 * current password proves the session really is theirs, so a left-open tab on
 * a shared machine is not enough on its own.
 */

const ROLE_LABEL = {
  parent: "Parent",
  teacher: "Teacher",
  admin: "School Admin",
  pilot: "Pilot",
  master: "Master Admin",
  staff: "Staff",
};

/** Each role's own shell, so the page keeps that portal's nav and branding. */
const SHELLS = {
  parent: ParentShell,
  teacher: TeacherShell,
  admin: AdminShell,
  pilot: PilotShell,
  master: MasterShell,
};

const HOME_BY_ROLE = {
  parent: "/parent/home",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
  pilot: "/pilot/pickdrop",
  master: "/master/schools",
};

/** A role with no registered shell still renders its details, just without nav. */
function BareShell({ children }) {
  return <div className="web-content">{children}</div>;
}

/**
 * Roles with a staff row, and therefore an attendance register and a payslip.
 *
 * A parent and a master admin have no staff record: a parent's own attendance
 * would be a child's, and the master is above every school rather than in one.
 * They are excluded here so the summary never mounts for them.
 */
const STAFF_LINKED_ROLES = new Set(["admin", "teacher", "staff", "pilot"]);

function validate({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword) return "Enter your current password";
  if (newPassword.length < 8) return "The new password must be at least 8 characters";
  if (newPassword !== confirmPassword) return "The two new passwords do not match";
  return null;
}

function DetailRow({ label, value }) {
  return (
    <div className="profile-detail-row">
      <span className="profile-detail-label">{label}</span>
      <span className="profile-detail-value">{value}</span>
    </div>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      toast(problem);
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      toast("Your password has been changed");
      // Clear the box rather than leaving a now-stale current password in it.
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast(err?.response?.data?.detail || "Could not change the password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card white" onSubmit={submit} style={{ maxWidth: 460 }}>
      <div className="section-label">Change password</div>
      <div className="field">
        <label htmlFor="profile-current-password">Current password</label>
        <input
          id="profile-current-password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="profile-new-password">New password</label>
        <input
          id="profile-new-password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set("newPassword")}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="profile-confirm-password">Confirm new password</label>
        <input
          id="profile-confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          required
        />
      </div>
      <button className="btn primary" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => authApi.me(), []);

  const Shell = SHELLS[user?.role] || BareShell;
  // Where "Back" goes. The signed-in role's own home rather than history(),
  // so a page opened directly from a bookmark still lands somewhere real.
  const home = HOME_BY_ROLE[user?.role] || "/";
  const displayName = data?.display_name || user?.name || user?.username || "Your account";
  const role = data?.role || user?.role;
  const logo = resolveMediaUrl(data?.school_logo_url || user?.schoolLogoUrl);

  return (
    <Shell>
      <div className="scr-title">My profile</div>
      <div className="scr-sub">
        The account you are signed in with. Your name and email are maintained on
        the {role === "parent" || role === "pilot" ? "staff and family record" : "staff record"},
        so ask your administrator to correct them.
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <div className="profile-details-wrap">
          <div className="card white profile-identity">
            <div className="profile-avatar">
              {logo ? (
                <img
                  src={logo}
                  alt={`${data?.school_name || "School"} logo`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.removeAttribute("hidden");
                  }}
                />
              ) : null}
              <span hidden={!!logo} aria-hidden="true">
                {(data?.school_name || displayName)
                  .split(/\s+/)
                  .filter((w) => /[a-z0-9]/i.test(w))
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join("")}
              </span>
            </div>
            <div>
              <div className="profile-identity-name">{displayName}</div>
              <div className="profile-identity-role">{ROLE_LABEL[role] || role}</div>
            </div>
          </div>

          <div className="card white profile-details">
            <DetailRow label="Name" value={displayName} />
            <DetailRow label="Username" value={data?.username || user?.username || "—"} />
            <DetailRow
              label="Email"
              value={data?.email || "No email address on file"}
            />
            <DetailRow
              label="School"
              value={data?.school_name || "Not tied to a school"}
            />
            <DetailRow label="Role" value={ROLE_LABEL[role] || role || "—"} />
          </div>

          <PasswordForm />

          {STAFF_LINKED_ROLES.has(role) && <StaffSelfSummary />}

          <button
            className="btn ghost"
            onClick={() => navigate(home)}
            style={{ marginTop: 16 }}
          >
            Back
          </button>
        </div>
      )}
    </Shell>
  );
}
