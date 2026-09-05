import { useState, useEffect } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as websiteApi from "../../api/website";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Spinner, Empty } from "../../components/ui/Primitives";
import ImageUpload from "../../components/ui/ImageUpload";
import { apiErrorMessage } from "../../api/client";

export default function AdminWebsite() {
  const { user } = useAuth();
  const { data: settings, loading, refetch } = useApi(() => websiteApi.getSettings().catch(() => null), []);
  const { data: homePage, refetch: refetchHome } = useApi(
    () => websiteApi.getPage("home").catch(() => null),
    []
  );
  const { data: testimonials, refetch: refetchTestimonials } = useApi(
    () => websiteApi.listTestimonials().catch(() => []),
    []
  );
  const toast = useToast();

  const [form, setForm] = useState({ school_name: "", tagline: "", icon_url: "", accent_color: "#023859" });
  const [homeForm, setHomeForm] = useState({
    banner_url: "",
    heading: "",
    subheading: "",
    body: "",
  });
  const [tName, setTName] = useState("");
  const [tRole, setTRole] = useState("");
  const [tQuote, setTQuote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");

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

  useEffect(() => {
    if (homePage) {
      setHomeForm({
        banner_url: homePage.banner_url || "",
        heading: homePage.heading || "",
        subheading: homePage.subheading || "",
        body: homePage.body || "",
      });
    }
  }, [homePage]);

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

  async function saveHome(e) {
    e.preventDefault();
    if (!homeForm.heading.trim()) {
      toast("Enter a home page heading");
      return;
    }
    try {
      await websiteApi.upsertPage("home", homeForm);
      toast("Home page updated");
      refetchHome();
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
    try {
      await websiteApi.deleteTestimonial(id);
      toast("Testimonial removed");
      refetchTestimonials();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function goLive() {
    if (!homeForm.heading.trim()) {
      toast("Enter a home page heading before going live");
      return;
    }

    setPublishing(true);
    try {
      await Promise.all([
        websiteApi.updateSettings(form),
        websiteApi.upsertPage("home", homeForm),
      ]);
      await websiteApi.goLive();
      setLiveUrl(`${window.location.origin}/site/${user.schoolId}`);
      toast("Website is live");
      refetch();
      refetchHome();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setPublishing(false);
    }
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
        <ImageUpload
          label="School icon"
          hint="Shown after login and on your public site. JPEG, PNG, GIF, WebP, or SVG up to 5 MB."
          value={form.icon_url}
          onChange={(icon_url) => setForm({ ...form, icon_url })}
          onError={toast}
          schoolId={user?.schoolId}
        />
        <div className="field">
          <label>Accent color</label>
          <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} style={{ height: 40 }} />
        </div>
        <button className="btn primary sm" type="submit">Save Header</button>
      </form>

      <div className="section-label">Home page</div>
      <form className="card white" onSubmit={saveHome}>
        <ImageUpload
          label="Banner image"
          hint="Hero image at the top of your home page."
          value={homeForm.banner_url}
          onChange={(banner_url) => setHomeForm({ ...homeForm, banner_url })}
          onError={toast}
          schoolId={user?.schoolId}
        />
        <div className="field">
          <label>Heading</label>
          <input value={homeForm.heading} onChange={(e) => setHomeForm({ ...homeForm, heading: e.target.value })} required />
        </div>
        <div className="field">
          <label>Subheading</label>
          <input value={homeForm.subheading} onChange={(e) => setHomeForm({ ...homeForm, subheading: e.target.value })} />
        </div>
        <div className="field">
          <label>Body</label>
          <textarea value={homeForm.body} onChange={(e) => setHomeForm({ ...homeForm, body: e.target.value })} rows={4} />
        </div>
        <button className="btn primary sm" type="submit">Save Home Page</button>
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
      <button className="btn primary sm" type="button" onClick={goLive} disabled={publishing}>
        {publishing ? "Publishing..." : "Go Live"}
      </button>
      {liveUrl ? (
        <div className="public-site-link">
          <span>Your website is live:</span>
          <a href={liveUrl} target="_blank" rel="noreferrer">{liveUrl}</a>
        </div>
      ) : null}
      <form className="card white" onSubmit={addTestimonial}>
        <div className="field"><label>Name</label><input value={tName} onChange={(e) => setTName(e.target.value)} /></div>
        <div className="field"><label>Role</label><input value={tRole} onChange={(e) => setTRole(e.target.value)} placeholder="e.g. Parent, Grade 3" /></div>
        <div className="field"><label>Quote</label><textarea value={tQuote} onChange={(e) => setTQuote(e.target.value)} /></div>
        <button className="btn primary sm" type="submit">Add Testimonial</button>
      </form>
    </AdminShell>
  );
}
