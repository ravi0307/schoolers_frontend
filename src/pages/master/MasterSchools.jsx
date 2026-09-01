import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as schoolsApi from "../../api/schools";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import { LOCATION_DATA, countries } from "../../data/locations";
import { isValidPhone, isValidEmail } from "../../utils/validation";

export default function MasterSchools() {
  const { data, loading, error, refetch } = useApi(() => schoolsApi.listSchools(), []);
  const toast = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [form, setForm] = useState({
    name: "", address: "", pincode: "", city: "", state: "", country: "India",
    primary_contact: "", primary_email: "", alternate_contact: "", alternate_email: "",
  });
  const states = locationData?.[form.country] ? Object.keys(locationData[form.country]) : [];
  const cities = locationData?.[form.country]?.[form.state] || [];

  function openForm() {
    setLocationData(LOCATION_DATA);
    setFormOpen(true);
  }

  function updateLocation(field, value) {
    if (field === "country") {
      setForm({ ...form, country: value, state: "", city: "" });
    } else {
      setForm({ ...form, state: value, city: "" });
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Enter a school name");
      return;
    }
    if (!isValidPhone(form.primary_contact)) {
      toast("Enter a valid primary contact number");
      return;
    }
    if (!isValidEmail(form.primary_email)) {
      toast("Enter a valid primary email address");
      return;
    }
    if (form.alternate_contact && !isValidPhone(form.alternate_contact)) {
      toast("Enter a valid alternate contact number");
      return;
    }
    if (form.alternate_email && !isValidEmail(form.alternate_email)) {
      toast("Enter a valid alternate email address");
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
          <div className="field"><label>School name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          <div className="grid2">
            <div className="field"><label>Pincode</label><input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required /></div>
            <div className="field">
              <label>Country</label>
              <select value={form.country} onChange={(e) => updateLocation("country", e.target.value)} required>
                <option value="">Select country</option>
                {countries.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>State</label>
              <select value={form.state} onChange={(e) => updateLocation("state", e.target.value)} disabled={!states.length} required>
                <option value="">Select state</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            <div className="field">
              <label>City</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!cities.length} required>
                <option value="">Select city</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>Primary Contact</label>
              <input type="tel" value={form.primary_contact} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} required inputMode="numeric" maxLength={15} />
            </div>
            <div className="field">
              <label>Primary Email</label>
              <input type="email" value={form.primary_email} onChange={(e) => setForm({ ...form, primary_email: e.target.value })} required />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label>Alternate Contact</label>
              <input type="tel" value={form.alternate_contact} onChange={(e) => setForm({ ...form, alternate_contact: e.target.value })} inputMode="numeric" maxLength={15} />
            </div>
            <div className="field">
              <label>Alternate Email</label>
              <input type="email" value={form.alternate_email} onChange={(e) => setForm({ ...form, alternate_email: e.target.value })} />
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit">Add School</button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={openForm}>+ Add School</button>
      )}
    </MasterShell>
  );
}
