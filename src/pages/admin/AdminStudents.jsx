import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi(() => peopleApi.listStudents({ search: search || undefined }), [search]);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !classId) {
      toast("Enter a name and pick a class");
      return;
    }
    setSubmitting(true);
    try {
      await peopleApi.createStudent({ name, class_id: Number(classId) });
      toast(name + " added");
      setName("");
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
      await peopleApi.deleteStudent(id);
      toast("Student removed");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
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
            data.map((s) => (
              <div key={s.student_id} className="listitem">
                <div className="avatar">{initials(s.name)}</div>
                <div className="meta">
                  <b>{s.name}</b>
                  <span>{s.admission_no}</span>
                </div>
                <Pill tone={s.present_today ? "ok" : "warn"}>{s.present_today ? "Present" : "Absent"}</Pill>
                <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => remove(s.student_id)}>
                  Remove
                </button>
              </div>
            ))
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
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Student"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Student</button>
      )}
    </AdminShell>
  );
}
