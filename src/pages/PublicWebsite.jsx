import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getPublicSite } from "../api/website";
import { resolveMediaUrl } from "../api/client";
import { ErrorBanner, Spinner } from "../components/ui/Primitives";

export default function PublicWebsite() {
  const { schoolId } = useParams();
  const { data: site, loading, error } = useApi(() => getPublicSite(schoolId), [schoolId]);

  if (loading) return <div className="public-site-state"><Spinner /></div>;
  if (error) return <div className="public-site-state"><ErrorBanner message={error} /></div>;

  const settings = site?.settings;
  const home = site?.pages?.home;

  return (
    <main className="public-site" style={{ "--site-accent": settings.accent_color }}>
      <header className="public-site-header">
        {settings.icon_url ? (
          <img src={resolveMediaUrl(settings.icon_url)} alt="" className="public-site-icon" />
        ) : null}
        <div>
          <h1>{settings.school_name}</h1>
          {settings.tagline ? <p>{settings.tagline}</p> : null}
        </div>
      </header>

      <section className="public-site-hero">
        {home?.banner_url ? (
          <img src={resolveMediaUrl(home.banner_url)} alt="" className="public-site-banner" />
        ) : null}
        <div className="public-site-hero-content">
          <h2>{home?.heading || settings.school_name}</h2>
          {home?.subheading ? <p className="public-site-subheading">{home.subheading}</p> : null}
          {home?.body ? <p className="public-site-body">{home.body}</p> : null}
        </div>
      </section>

      {site.testimonials?.length ? (
        <section className="public-site-section">
          <h2>What families say</h2>
          <div className="public-site-testimonials">
            {site.testimonials.map((testimonial) => (
              <blockquote key={testimonial.testimonial_id}>
                <p>"{testimonial.quote}"</p>
                <cite>{testimonial.name} · {testimonial.role}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      {settings.footer_address || settings.footer_phone || settings.footer_email || settings.footer_copyright ? (
        <footer className="public-site-footer">
          {settings.footer_address ? <span>{settings.footer_address}</span> : null}
          {settings.footer_phone ? <span>{settings.footer_phone}</span> : null}
          {settings.footer_email ? <span>{settings.footer_email}</span> : null}
          {settings.footer_copyright ? <span>{settings.footer_copyright}</span> : null}
        </footer>
      ) : null}
    </main>
  );
}
