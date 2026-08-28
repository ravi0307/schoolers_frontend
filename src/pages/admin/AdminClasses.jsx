import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function AdminClasses() {
  const { data, loading, error, refetch } = useApi(() => academicsApi.listClasses(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Enter a class name");
      return;
    }
    setSubmitting(true);
    try {
      await academicsApi.createClass({ name });
      toast("Class created: " + name);
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
      await academicsApi.deleteClass(id);
      toast("Class removed");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Class List</div>
      <div className="scr-sub">{data ? `${data.length} classes` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((c) => (
              <div key={c.class_id} className="listitem">
                <div className="avatar g">{c.name[0]}</div>
                <div className="meta">
                  <b>{c.name}</b>
                  <span>{c.student_count} students</span>
                </div>
                <button className="btn ghost sm" onClick={() => remove(c.class_id)}>Remove</button>
              </div>
            ))
          ) : (
            <Empty>No classes yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Class name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 5 - A" />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Class"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Class</button>
      )}
    </AdminShell>
  );
}
