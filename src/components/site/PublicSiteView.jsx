import { resolveMediaUrl } from "../../api/client";
import { sanitizeRichText } from "../../components/ui/richText";

export default function PublicSiteView({ site }) {
  const settings = site?.settings || {};
  const home = site?.pages?.home;
  const testimonials = site?.testimonials || [];

  return (
    <main className="public-site" style={{ "--site-accent": settings.accent_color }}>
      <header className="public-site-header">
        {settings.icon_url ? (
          <img src={resolveMediaUrl(settings.icon_url)} alt="" className="public-site-icon" />
        ) : null}
        <div>
          <h1>{settings.school_name}</h1>
          {settings.tagline ? (
            <p dangerouslySetInnerHTML={{ __html: sanitizeRichText(settings.tagline) }} />
          ) : null}
        </div>
      </header>

      <section className="public-site-hero">
        {home?.banner_url ? (
          <img src={resolveMediaUrl(home.banner_url)} alt="" className="public-site-banner" />
        ) : null}
        <div className="public-site-hero-content">
          <h2
            className="public-site-heading"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(home?.heading || settings.school_name) }}
          />
          {home?.subheading ? (
            <p className="public-site-subheading" dangerouslySetInnerHTML={{ __html: sanitizeRichText(home.subheading) }} />
          ) : null}
          {home?.body ? (
            <p className="public-site-body" dangerouslySetInnerHTML={{ __html: sanitizeRichText(home.body) }} />
          ) : null}
        </div>
      </section>

      {testimonials.length ? (
        <section className="public-site-section">
          <h2>What families say</h2>
          <div className="public-site-testimonials">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.testimonial_id}>
                <p dangerouslySetInnerHTML={{ __html: sanitizeRichText(testimonial.quote) }} />
                <cite>{testimonial.name} · {testimonial.role}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      {settings.footer_address || settings.footer_phone || settings.footer_email || settings.footer_copyright ? (
        <footer className="public-site-footer">
          {settings.footer_address ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(settings.footer_address) }} />
          ) : null}
          {settings.footer_phone ? <span>{settings.footer_phone}</span> : null}
          {settings.footer_email ? <span>{settings.footer_email}</span> : null}
          {settings.footer_copyright ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(settings.footer_copyright) }} />
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}