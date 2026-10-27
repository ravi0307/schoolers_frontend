import { useState } from "react";
import { Navigate } from "react-router-dom";
import MasterShell from "../../components/layout/MasterShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as accountsApi from "../../api/privilegedAccounts";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import { apiErrorMessage } from "../../api/client";

const EMPTY_FORM = { username: "", email: "", password: "" };

export default function MasterAccounts() {
  const { user } = useAuth();
  const toast = useToast();
  const isMaster = user?.role === "master";

  // A Sub-Master may not even load the roster: the API would refuse with
  // 403, and bouncing before the request keeps that off the wire.
  const { data, loading, error, refetch } = useApi(
    () => (isMaster ? accountsApi.listPrivilegedAccounts() : Promise.resolve(null)),
    [isMaster]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  // The create response is the only time the password exists outside the
  // account holder's head; it stays on screen until dismissed, then is gone.
  const [freshCredentials, setFreshCredentials] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", password: "" });

  if (!isMaster) return <Navigate to="/master/schools" replace />;

  function startEdit(account) {
    setEditing(account);
    setEditForm({ email: account.email || "", password: "" });
  }

  async function submit(e) {
    e.preventDefault();
    const username = form.username.trim();
    if (!username) {
      toast("Enter a username");
      return;
    }
    if (form.password && form.password.length < 8) {
      toast("The password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const payload = { username };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.password) payload.password = form.password;
      const created = await accountsApi.createPrivilegedAccount(payload);
      setFreshCredentials(created);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      // Empty email clears the address (None-means-unchanged is the API's
      // rule for omitted fields; the form always sends an explicit value).
      const payload = { email: editForm.email.trim() };
      if (editForm.password) payload.password = editForm.password;
      await accountsApi.updatePrivilegedAccount(editing.user_id, payload);
      setEditing(null);
      toast("Account updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(account) {
    const ok = window.confirm(
      `Deactivate ${account.username}? They will not be able to sign in until reactivated.`
    );
    if (!ok) return;
    try {
      await accountsApi.deactivatePrivilegedAccount(account.user_id);
      toast(`${account.username} deactivated`);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function activate(account) {
    try {
      await accountsApi.updatePrivilegedAccount(account.user_id, { is_active: true });
      toast(`${account.username} activated`);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  const accounts = data || [];

  return (
    <MasterShell>
      <PageHeader
        title="Master Users"
        subtitle={
          accounts.length
            ? `${accounts.filter((a) => a.role === "submaster").length} Sub-Master, ${
                accounts.filter((a) => a.role === "master").length
              } Master`
            : "Master and Sub-Master users"
        }
        action={!formOpen && !editing && (
          <button className="btn gold" type="button" onClick={() => setFormOpen(true)}>
            + New Sub-Master
          </button>
        )}
      />

      {freshCredentials && (
        <div className="card white" role="alert">
          <b>{freshCredentials.username}&rsquo;s sign-in details</b>
          <p>
            Password: <code>{freshCredentials.password}</code>
          </p>
          <p className="scr-sub">Copy it now — it is shown only once and cannot be retrieved.</p>
          <div className="cta-row">
            <button className="btn primary" type="button" onClick={() => setFreshCredentials(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <form className="card white" onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. ops.lead"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid2">
            <div className="field">
              <label>Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="For password recovery"
              />
            </div>
            <div className="field">
              <label>Password (optional)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to generate one"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={busy}>
              Create Sub-Master
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form className="card white" onSubmit={saveEdit}>
          <b>Edit {editing.username}</b>
          <div className="grid2">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Leave blank to clear"
              />
            </div>
            <div className="field">
              <label>New password (optional)</label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep the current one"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={busy}>
              Save
            </button>
            <button className="btn ghost" type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ErrorBanner message={error} />
      {loading && <Spinner />}
      {!loading && !error && accounts.length === 0 && (
        <Empty>No master users yet.</Empty>
      )}
      {!loading && accounts.length > 0 && (
        <div className="card">
          {accounts.map((account) => (
            <div key={account.user_id} className="listitem">
              <div className={`avatar ${account.is_active ? "g" : "r"}`}>
                {account.username[0]?.toUpperCase() || "?"}
              </div>
              <div className="meta">
                <b>{account.username}</b>
                <span>{account.email || "No email on file"}</span>
              </div>
              <Pill tone={account.role === "master" ? "mute" : "info"}>
                {account.role === "master" ? "Master" : "Sub-Master"}
              </Pill>
              <Pill tone={account.is_active ? "ok" : "warn"}>
                {account.is_active ? "Active" : "Inactive"}
              </Pill>
              {account.role === "submaster" && (
                <div className="table-actions">
                  <button className="btn ghost sm" type="button" onClick={() => startEdit(account)}>
                    Edit
                  </button>
                  {account.is_active ? (
                    <button className="btn ghost sm" type="button" onClick={() => deactivate(account)}>
                      Deactivate
                    </button>
                  ) : (
                    <button className="btn ghost sm" type="button" onClick={() => activate(account)}>
                      Activate
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MasterShell>
  );
}
