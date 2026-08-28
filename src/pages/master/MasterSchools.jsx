import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as schoolsApi from "../../api/schools";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function MasterSchools() {
  const { data, loading, error, refetch } = useApi(() => schoolsApi.listSchools(), []);
  const toast = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", pincode: "", city: "", state: "", country: "India",
    primary_contact: "", primary_email: "",
  });

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Enter a school name");
      return;
    }
    try {
      await schoolsApi.createSchool(form);
      toast("School added");
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <MasterShell>
      <div className="scr-title">Schools</div>
      <div className="scr-sub">{data ? `${data.length} schools under management` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((s) => (
              <div key={s.school_id} className="listitem" onClick={() => navigate(`/master/schools/${s.school_id}`)} style={{ cursor: "pointer" }}>
                <div className={`avatar ${s.status === "Active" ? "g" : "r"}`}>{s.name[0]}</div>
                <div className="meta">
                  <b>{s.name}</b>
                  <span>{s.city}, {s.state}</span>
                </div>
                <Pill tone={s.status === "Active" ? "ok" : "mute"}>{s.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No schools yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field"><label>School name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid2">
            <div className="field"><label>Pincode</label><input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="field"><label>Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Primary Contact</label><input value={form.primary_contact} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} /></div>
            <div className="field"><label>Primary Email</label><input value={form.primary_email} onChange={(e) => setForm({ ...form, primary_email: e.target.value })} /></div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit">Add School</button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add School</button>
      )}
    </MasterShell>
  );
}
