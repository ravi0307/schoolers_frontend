import { sanitizeRichText } from "../ui/richText";
import styles from "./PublicSiteCanvas.module.css";
import { MOCK_ACTIVE_TESTIMONIALS } from "../../utils/websiteBuilder";
import { useRef, useState } from "react";

export default function PublicSiteCanvas({
  nodes = [],
  canvasSize,
  testimonials = MOCK_ACTIVE_TESTIMONIALS,
  onBannerDragOver,
  onBannerDrop,
  uploadingBannerId = null,
}) {
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const canvasRef = useRef(null);
  if (!nodes.length) return null;

  function scrollToSection(event, anchorId) {
    const targetId = anchorId || "";
    const target = Array.from(canvasRef.current?.querySelectorAll("[id]") || [])
      .find((element) => element.id === targetId);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <section
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Website sections"
      style={canvasSize ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` } : undefined}
    >
      {nodes.map((node) => (
        <section
          key={node.id}
          id={node.anchorId || node.id}
          className={`${styles.node} ${styles[node.type] || ""}`}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.width}%`,
            height: `${node.height}%`,
          }}
        >
          {node.type === "header" ? (
            <nav className={styles.nav} aria-label="Website navigation">
              <a className={styles.siteBrand} href="#top" onClick={(event) => scrollToSection(event, "top")}>SUNRISE SCHOOL</a>
              <span className={styles.navSpacer} />
              {node.labels.filter((label) => label.text).map((label) => (
                <a key={label.id} href={`#${label.anchorId || node.anchorId || node.id}`} onClick={(event) => scrollToSection(event, label.anchorId || node.anchorId || node.id)}>{label.text}</a>
              ))}
            </nav>
          ) : null}
          {node.type === "banner" ? (
            <div
              className={styles.banner}
              style={{ backgroundImage: `linear-gradient(90deg, rgba(15,23,42,.75), rgba(15,23,42,.12)), url("${node.slides?.[0]?.imageUrl || ""}")` }}
              onDragOver={(event) => onBannerDragOver?.(event, node.id)}
              onDrop={(event) => onBannerDrop?.(event, node.id)}
            >
              <div className={styles.bannerCopy}>
                <span className={styles.eyebrow}>SUNRISE SCHOOL · LEARN TO SHINE</span>
                <h1>{node.slides?.[0]?.title || "A bright beginning for every learner"}</h1>
                <p>{node.slides?.[0]?.subtitle || "Curiosity, confidence and community—every day."}</p>
                <a className={styles.bannerCta} href="#about" onClick={(event) => scrollToSection(event, "about")}>Discover our school</a>
              </div>
              <div className={styles.slideDots} aria-label={`${node.slides?.length || 1} banner slides`}>
                {(node.slides || [node]).map((slide, index) => <span key={slide.id || index} className={index === 0 ? styles.activeDot : ""} />)}
              </div>
              {uploadingBannerId === node.id ? (
                <div className={styles.uploadOverlay} role="status">
                  <span className={styles.spinner} aria-hidden="true" />
                  <strong>Uploading media layout asset...</strong>
                  <small>Simulating a local image placement</small>
                </div>
              ) : null}
            </div>
          ) : null}
          {node.type === "testimonials" ? (
            <div className={styles.testimonialsSection}>
              <div className={styles.testimonialHeading}>
                <span className={styles.eyebrow}>OUR COMMUNITY</span>
                <h2>{node.title || "Families say it best"}</h2>
              </div>
              <div className={styles.testimonialGrid}>
                {testimonials.map((testimonial) => (
                  <blockquote key={testimonial.id} className={styles.testimonialCard}>
                    <span className={styles.quoteMark} aria-hidden="true">“</span>
                    <p>{testimonial.quote}</p>
                    <footer><strong>{testimonial.name}</strong><span>{testimonial.role}</span></footer>
                  </blockquote>
                ))}
                {!testimonials.length ? <p className={styles.noReviews}>New family stories will appear here.</p> : null}
              </div>
            </div>
          ) : null}
          {node.html ? <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(node.html, { allowAlignment: true }) }} /> : null}
          {node.type === "contact" ? (
            <div className={styles.contactBlock}>
              <span className={styles.eyebrow}>LET’S CONNECT</span>
              <h2>{node.title || "Come say hello"}</h2>
              <p>Tell us a little about your family. Our admissions team would love to meet you.</p>
              <form onSubmit={(event) => {
                event.preventDefault();
                window.alert("Success: Contact form message payload parsed successfully! Simulation dispatched to admin mailbox.");
                setContact({ name: "", email: "", message: "" });
              }}>
                <label>Your name<input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
                <label>Email address<input required type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
                <label>Message<textarea required rows="3" value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} /></label>
                <button type="submit">Submit Message</button>
              </form>
            </div>
          ) : null}
          {node.type === "footer" ? (
            <nav className={styles.nav} aria-label="Footer links">
              {node.labels.filter((label) => label.text).map((label) => (
                <a key={label.id} href={`#${label.anchorId || node.anchorId || node.id}`} onClick={(event) => scrollToSection(event, label.anchorId || node.anchorId || node.id)}>{label.text}</a>
              ))}
            </nav>
          ) : null}
        </section>
      ))}
    </section>
  );
}
