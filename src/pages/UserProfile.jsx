import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/layout/AdminShell";
import TeacherShell from "../components/layout/TeacherShell";
import StaffShell from "../components/layout/StaffShell";
import PilotShell from "../components/layout/PilotShell";
import MasterShell from "../components/layout/MasterShell";
import StaffSelfSummary from "../components/profile/StaffSelfSummary";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import DescriptionList from "../components/ui/DescriptionList";
import FormActions from "../components/ui/FormActions";
import LoadingState from "../components/ui/LoadingState";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApi } from "../hooks/useApi";
import * as authApi from "../api/auth";
import { ErrorBanner } from "../components/ui/Primitives";
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
  parent: ParentContent,
  teacher: TeacherShell,
  staff: StaffShell,
  admin: AdminShell,
  pilot: PilotShell,
  master: MasterShell,
};

const HOME_BY_ROLE = {
  parent: "/parent/home",
  teacher: "/teacher/dashboard",
  staff: "/staff/broadcast",
  admin: "/admin/dashboard",
  pilot: "/pilot/pickdrop",
  master: "/master/schools",
};

/** A role with no registered shell still renders its details, just without nav. */
function BareShell({ children }) {
  return <div className="web-content">{children}</div>;
}

function ParentContent({ children }) {
  return children;
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

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFormError("");
  };

  async function submit(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
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
      const message = err?.response?.data?.detail || "Could not change the password";
      setFormError(message);
      toast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="form" className="card white password-form" onSubmit={submit}>
      <div className="section-label">Change password</div>
      <PasswordInput
        id="profile-current-password"
        label="Current password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={set("currentPassword")}
      />
      <PasswordInput
        id="profile-new-password"
        label="New password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={set("newPassword")}
        hint="Use at least 8 characters."
      />
      <PasswordInput
        id="profile-confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
      />
      {formError && <p className="profile-form-error" role="alert">{formError}</p>}
      <FormActions>
        <Button type="submit" className="btn primary" loading={saving}>
          {saving ? "Saving..." : "Change password"}
        </Button>
      </FormActions>
    </Card>
  );
}

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => authApi.me(), []);
  const [logoFailed, setLogoFailed] = useState(false);

  const Shell = SHELLS[user?.role] || BareShell;
  // Where "Back" goes. The signed-in role's own home rather than history(),
  // so a page opened directly from a bookmark still lands somewhere real.
  const home = HOME_BY_ROLE[user?.role] || "/";
  const displayName = data?.display_name || user?.name || null;
  const role = data?.role || user?.role;
  const logo = resolveMediaUrl(data?.school_logo_url || user?.schoolLogoUrl);
  useEffect(() => setLogoFailed(false), [logo]);
  const roleLabel = ROLE_LABEL[role] || role || "Role not provided";
  // An admin account is often created before the staff row it acts for, so the
  // role alone does not mean there is a register or a payslip behind it. With
  // no linked person the self-report endpoint answers 403, so the summary is
  // not mounted at all rather than rendering that refusal as a page error.
  const hasStaffRecord = Boolean(data?.linked_person_id);

  return (
    <Shell>
      <PageHeader
        className="profile-heading"
        title="My profile"
        subtitle={
          <>
            Your name and email are maintained on the {role === "parent" || role === "pilot" ? "staff and family record" : "staff record"}, so ask your administrator to correct them.
          </>
        }
        action={
          <Button variant="outline" className="btn ghost profile-back" onClick={() => navigate(home)}>
            <ArrowLeft aria-hidden="true" size={16} />
            Back to dashboard
          </Button>
        }
      />

      {loading && <LoadingState />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <div className="profile-grid">
          <Card className="card white profile-account">
            <div className="section-label">Your account</div>

            <div className="profile-identity">
              <div className="profile-avatar">
                {logo && !logoFailed ? (
                  <img
                    src={logo}
                    alt={`${data?.school_name || "School"} logo`}
                    onError={() => setLogoFailed(true)}
                  />
                ) : null}
                <span hidden={!!logo && !logoFailed} aria-hidden="true">
                  {(data?.school_name || displayName || data?.username || user?.username || "U")
                    .split(/\s+/)
                    .filter((w) => /[a-z0-9]/i.test(w))
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join("")}
                </span>
              </div>
              <div>
                <div className={`profile-identity-name${displayName ? "" : " profile-detail-empty"}`}>
                  {displayName || "Name not provided"}
                </div>
                <div className={`profile-identity-role${role ? "" : " profile-detail-empty"}`}>
                  {roleLabel}
                </div>
              </div>
            </div>

            <DescriptionList
              items={[
                { label: "Name", value: displayName },
                { label: "Username", value: data?.username || user?.username },
                { label: "Email", value: data?.email },
                { label: "School", value: data?.school_name, emptyLabel: "Not tied to a school" },
              ]}
            />
          </Card>

          <PasswordForm />

          {STAFF_LINKED_ROLES.has(role) && hasStaffRecord && <StaffSelfSummary />}

        </div>
      )}
    </Shell>
  );
}
