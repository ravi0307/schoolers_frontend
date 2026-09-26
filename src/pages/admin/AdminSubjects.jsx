import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

export default function AdminSubjects() {
  const { data, loading, error, refetch } = useApi(() => academicsApi.listSubjects(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pager = usePagination(data);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Enter a subject name");
      return;
    }
    setSubmitting(true);
    try {
      await academicsApi.createSubject({ name: name.trim() });
      toast("Subject created: " + name.trim());
      setName("");
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function update(id) {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast("Enter a subject name");
      return;
    }
    try {
      await academicsApi.updateSubject(id, { name: trimmed });
      toast("Subject updated");
      setEditingId(null);
      setEditName("");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function remove(id) {
    try {
      await academicsApi.deleteSubject(id);
      toast("Subject removed");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Subjects</div>
      <div className="scr-sub">{data ? `${data.length} subjects` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            pager.pageItems.map((s) => (
              <div key={s.subject_id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <div className="listitem">
                  <div className="avatar g">{s.name[0]}</div>
                  <div className="meta" style={{ flex: 1 }}>
                    <b>{s.name}</b>
                  </div>
                  <div className="cta-row" style={{ gap: 8 }}>
                    <button className="btn ghost sm" onClick={() => { setEditingId(s.subject_id); setEditName(s.name); }}>Edit</button>
                    <button className="btn ghost sm" onClick={() => remove(s.subject_id)}>Remove</button>
                  </div>
                </div>
                {editingId === s.subject_id && (
                  <div className="card white" style={{ margin: "8px 0 10px" }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Subject name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="cta-row" style={{ marginTop: 10 }}>
                      <button className="btn primary sm" onClick={() => update(s.subject_id)}>Save</button>
                      <button className="btn ghost sm" onClick={() => { setEditingId(null); setEditName(""); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty>No subjects yet.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Subject name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Subject"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Subject</button>
      )}
    </AdminShell>
  );
}