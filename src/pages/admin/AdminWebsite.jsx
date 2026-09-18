import { useMemo, useState, useEffect } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as websiteApi from "../../api/website";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Spinner, Empty } from "../../components/ui/Primitives";
import ImageUpload from "../../components/ui/ImageUpload";
import PublicSiteView from "../../components/site/PublicSiteView";
import RichTextEditor from "../../components/ui/RichTextEditor";
import { richTextToPlainText, sanitizeRichText } from "../../components/ui/richText";
import { publicSitePath } from "../../utils/siteFlow";
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

  const [form, setForm] = useState({
    school_name: "",
    tagline: "",
    icon_url: "",
    accent_color: "#023859",
    footer_address: "",
    footer_phone: "",
    footer_email: "",
    footer_copyright: "",
  });
  const [homeForm, setHomeForm] = useState({
    banner_url: "",
    heading: "",
    subheading: "",
    body: "",
  });
  const [tName, setTName] = useState("");
  const [tRole, setTRole] = useState("");
  const [tQuote, setTQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [live, setLive] = useState(false);

  // The saved (draft) state shown in the preview overlay. This mirrors the
  // public site payload so the admin can verify their changes look right
  // before visitors see them.
  const draftSite = useMemo(
    () => ({ settings: form, pages: { home: homeForm }, testimonials: testimonials || [] }),
    [form, homeForm, testimonials]
  );

  const siteUrl = publicSitePath(form.school_name || settings?.school_name || "");

  useEffect(() => {
    if (settings) {
      setForm({
        school_name: settings.school_name || "",
        tagline: settings.tagline || "",
        icon_url: settings.icon_url || "",
        accent_color: settings.accent_color || "#023859",
        footer_address: settings.footer_address || "",
        footer_phone: settings.footer_phone || "",
        footer_email: settings.footer_email || "",
        footer_copyright: settings.footer_copyright || "",
      });
      setLive(!!settings.is_active);
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
    if (!richTextToPlainText(homeForm.heading).trim()) {
      toast("Enter a home page heading");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        websiteApi.updateSettings({
          ...form,
          tagline: sanitizeRichText(form.tagline),
          footer_address: sanitizeRichText(form.footer_address),
          footer_copyright: sanitizeRichText(form.footer_copyright),
        }),
        websiteApi.upsertPage("home", {
          ...homeForm,
          heading: sanitizeRichText(homeForm.heading),
          subheading: sanitizeRichText(homeForm.subheading),
          body: sanitizeRichText(homeForm.body),
        }),
      ]);
      toast("Website updated");
      setPreviewEnabled(true);
      refetch();
      refetchHome();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    try {
      await websiteApi.goLive();
      setLive(true);
      toast("Your website is now live");
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function addTestimonial() {
    if (!richTextToPlainText(tQuote).trim()) {
      toast("Enter a testimonial quote");
      return;
    }
    try {
      await websiteApi.addTestimonial({
        name: tName.trim() || "Anonymous",
        role: tRole.trim() || "Parent",
        quote: sanitizeRichText(tQuote),
      });
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

  if (loading) return <AdminShell><Spinner /></AdminShell>;

  return (
    <AdminShell>
      <div className="scr-title">School Website</div>
      <div className="scr-sub">Edit your public single-page website</div>

      <div className="cta-row" style={{ marginBottom: 14 }}>
        <button
          className="btn primary"
          type="button"
          onClick={() => setShowPreview(true)}
          disabled={!previewEnabled}
          title={previewEnabled ? "Preview your saved website" : "Save your changes first to preview the website"}
        >
          Preview Website
        </button>
        {!previewEnabled && (
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Save your changes to preview the website.</span>
        )}
      </div>

      <form className="card white" onSubmit={save}>
        <div className="section-label">School info</div>
        <div className="field">
          <label>School name</label>
          <input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Tagline</label>
          <RichTextEditor value={form.tagline} onChange={(tagline) => setForm({ ...form, tagline })} minHeight={80} />
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

        <div className="section-label">Home page</div>
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
          <RichTextEditor value={homeForm.heading} onChange={(heading) => setHomeForm({ ...homeForm, heading })} minHeight={60} />
        </div>
        <div className="field">
          <label>Subheading</label>
          <RichTextEditor value={homeForm.subheading} onChange={(subheading) => setHomeForm({ ...homeForm, subheading })} minHeight={80} />
        </div>
        <div className="field">
          <label>Body</label>
          <RichTextEditor value={homeForm.body} onChange={(body) => setHomeForm({ ...homeForm, body })} />
        </div>

        <div className="section-label">Testimonials</div>
        {testimonials && testimonials.length ? (
          <div className="card">
            {testimonials.map((testimonial) => (
              <div key={testimonial.testimonial_id} className="listitem">
                <div className="meta">
                  <b>{testimonial.name} · {testimonial.role}</b>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(testimonial.quote) }} />
                </div>
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={() => removeTestimonial(testimonial.testimonial_id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No testimonials yet.</Empty>
        )}
        <div className="field">
          <label>Name</label>
          <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Parent's name" />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={tRole} onChange={(e) => setTRole(e.target.value)} placeholder="Parent, alumni, etc." />
        </div>
        <div className="field">
          <label>Quote</label>
          <RichTextEditor value={tQuote} onChange={setTQuote} minHeight={90} />
        </div>
        <button className="btn primary sm" type="button" onClick={addTestimonial}>
          Add Testimonial
        </button>

        <div className="section-label">Footer</div>
        <div className="field">
          <label>Address</label>
          <RichTextEditor value={form.footer_address} onChange={(footer_address) => setForm({ ...form, footer_address })} minHeight={60} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.footer_phone} onChange={(e) => setForm({ ...form, footer_phone: e.target.value })} placeholder="+91 12345 67890" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.footer_email} onChange={(e) => setForm({ ...form, footer_email: e.target.value })} placeholder="office@school.edu" />
        </div>
        <div className="field">
          <label>Copyright</label>
          <RichTextEditor value={form.footer_copyright} onChange={(footer_copyright) => setForm({ ...form, footer_copyright })} minHeight={60} />
        </div>

        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Website"}
        </button>
      </form>

      {showPreview && (
        <div className="website-preview-overlay">
          <div className="website-preview-toolbar">
            <span>Website preview</span>
            {live ? (
              <a className="btn primary sm" href={siteUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                Live · {siteUrl}
              </a>
            ) : (
              <button className="btn primary sm" type="button" onClick={publish}>
                Go Live
              </button>
            )}
            <button className="btn ghost sm" type="button" onClick={() => setShowPreview(false)}>
              Close preview
            </button>
          </div>
          <div className="website-preview-frame">
            <PublicSiteView site={draftSite} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}