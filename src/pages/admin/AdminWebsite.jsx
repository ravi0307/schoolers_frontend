import { useState, useEffect } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as websiteApi from "../../api/website";
import { useToast } from "../../context/ToastContext";
import { Spinner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function AdminWebsite() {
  const { data: settings, loading, refetch } = useApi(() => websiteApi.getSettings().catch(() => null), []);
  const { data: testimonials, refetch: refetchTestimonials } = useApi(
    () => websiteApi.listTestimonials().catch(() => []),
    []
  );
  const toast = useToast();

  const [form, setForm] = useState({ school_name: "", tagline: "", icon_url: "", accent_color: "#023859" });
  const [tName, setTName] = useState("");
  const [tRole, setTRole] = useState("");
  const [tQuote, setTQuote] = useState("");

  useEffect(() => {
    if (settings) {
      setForm({
        school_name: settings.school_name || "",
        tagline: settings.tagline || "",
        icon_url: settings.icon_url || "",
        accent_color: settings.accent_color || "#023859",
      });
    }
  }, [settings]);

  async function save(e) {
    e.preventDefault();
    try {
      await websiteApi.updateSettings(form);
      toast("Website updated");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function addTestimonial(e) {
    e.preventDefault();
    if (!tName.trim() || !tQuote.trim()) {
      toast("Enter a name and a quote");
      return;
    }
    try {
      await websiteApi.addTestimonial({ name: tName, role: tRole || "Parent", quote: tQuote });
      toast("Testimonial added");
      setTName("");
      setTRole("");
      setTQuote("");
      refetchTestimonials();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function removeTestimonial(id) {
    await websiteApi.deleteTestimonial(id);
    toast("Testimonial removed");
    refetchTestimonials();
  }

  if (loading) return <AdminShell><Spinner /></AdminShell>;

  return (
    <AdminShell>
      <div className="scr-title">School Website</div>
      <div className="scr-sub">Edit your public single-page website</div>

      <div className="section-label">Header</div>
      <form className="card white" onSubmit={save}>
        <div className="field">
          <label>School name</label>
          <input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Tagline</label>
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <div className="field">
          <label>Icon (image URL) — shown post-login, defaults to the platform icon</label>
          <input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="field">
          <label>Accent color</label>
          <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} style={{ height: 40 }} />
        </div>
        <button className="btn primary sm" type="submit">Save Header</button>
      </form>

      <div className="section-label">Testimonials</div>
      <div className="card">
        {testimonials && testimonials.length ? (
          testimonials.map((t) => (
            <div key={t.testimonial_id} className="listitem">
              <div className="meta">
                <b>{t.name} · {t.role}</b>
                <span>"{t.quote}"</span>
              </div>
              <button className="btn ghost sm" onClick={() => removeTestimonial(t.testimonial_id)}>Remove</button>
            </div>
          ))
        ) : (
          <Empty>No testimonials yet.</Empty>
        )}
      </div>
      <form className="card white" onSubmit={addTestimonial}>
        <div className="field"><label>Name</label><input value={tName} onChange={(e) => setTName(e.target.value)} /></div>
        <div className="field"><label>Role</label><input value={tRole} onChange={(e) => setTRole(e.target.value)} placeholder="e.g. Parent, Grade 3" /></div>
        <div className="field"><label>Quote</label><textarea value={tQuote} onChange={(e) => setTQuote(e.target.value)} /></div>
        <button className="btn primary sm" type="submit">Add Testimonial</button>
      </form>
    </AdminShell>
  );
}
