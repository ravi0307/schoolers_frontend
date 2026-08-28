import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, initials } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function AdminTeachers() {
  const { data, loading, error, refetch } = useApi(() => peopleApi.listTeachers(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Enter a name");
      return;
    }
    setSubmitting(true);
    try {
      await peopleApi.createTeacher({ name, role_title: roleTitle || "Subject Teacher", phone: phone || "—" });
      toast(name + " added");
      setName("");
      setRoleTitle("");
      setPhone("");
      setFormOpen(false);
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
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Teacher's List</div>
      <div className="scr-sub">{data ? `${data.length} teaching staff` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((t) => (
              <div key={t.teacher_id} className="listitem">
                <div className="avatar y">{initials(t.name)}</div>
                <div className="meta">
                  <b>{t.name}</b>
                  <span>{t.role_title}</span>
                </div>
                <button className="btn ghost sm" onClick={() => remove(t.teacher_id)}>Remove</button>
              </div>
            ))
          ) : (
            <Empty>No teachers yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mr. Kapoor" />
          </div>
          <div className="field">
            <label>Subject / Role</label>
            <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Class Teacher · Grade 5-A" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98xxxx0000" />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Teacher"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Teacher</button>
      )}
    </AdminShell>
  );
}
