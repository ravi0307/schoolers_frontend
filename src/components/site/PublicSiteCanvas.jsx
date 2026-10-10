import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sanitizeRichText } from "../ui/richText";
import styles from "./PublicSiteCanvas.module.css";
import { MOCK_ACTIVE_TESTIMONIALS, normalizeWebsiteBackground } from "../../utils/websiteBuilder";

function groupPublicNodes(nodes) {
  const groups = [];
  nodes.forEach((node) => {
    const lastGroup = groups.at(-1);
    const canShareRow = node.type === "center"
      && lastGroup?.every((item) => item.type === "center")
      && Math.abs(lastGroup[0].y - node.y) <= 3;
    if (canShareRow) lastGroup.push(node);
    else groups.push([node]);
  });
  return groups;
}

export default function PublicSiteCanvas({
  nodes = [],
  canvasBackground,
  testimonials = MOCK_ACTIVE_TESTIMONIALS,
  schoolName = "School",
  onBannerDragOver,
  onBannerDrop,
  onContactSubmit,
  uploadingBannerId = null,
}) {
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactFeedback, setContactFeedback] = useState(null);
  const [activeSlides, setActiveSlides] = useState({});
  const canvasRef = useRef(null);
  const orderedNodes = [...nodes].sort((first, second) => first.y - second.y || first.x - second.x);
  const nodeGroups = groupPublicNodes(orderedNodes);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (!orderedNodes.some((node) => node.type === "banner" && node.slides?.length > 1)) return undefined;
    const interval = window.setInterval(() => {
      setActiveSlides((current) => {
        const next = { ...current };
        orderedNodes.filter((node) => node.type === "banner" && node.slides?.length > 1).forEach((node) => {
          next[node.id] = ((current[node.id] || 0) + 1) % node.slides.length;
        });
        return next;
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [nodes]);

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

  function setSlide(nodeId, index, count) {
    setActiveSlides((current) => ({ ...current, [nodeId]: (index + count) % count }));
  }

  return (
    <section
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Website sections"
      style={{ backgroundColor: normalizeWebsiteBackground(canvasBackground) }}
    >
      {nodeGroups.map((group) => (
        <div key={group.map((node) => node.id).join("-")} className={styles.nodeRow}>
          {group.map((node) => {
        const variant = ["minimal", "centered", "accented"].includes(node.variant) ? node.variant : "minimal";
        const slides = node.slides?.length ? node.slides : [{ id: `${node.id}-default`, title: "", subtitle: "", imageUrl: "" }];
        const slideIndex = (activeSlides[node.id] || 0) % slides.length;
        const slide = slides[slideIndex];
        const relativeSpan = Math.round((node.width / group.reduce((total, item) => total + item.width, 0)) * 12);
        return (
          <section
            key={node.id}
            id={node.anchorId || node.id}
            className={`${styles.node} ${styles[node.type] || ""} ${styles[`${node.type}-${variant}`] || ""}`}
            style={{ "--desktop-span": group.length > 1 ? Math.max(1, relativeSpan) : 12 }}
          >
            {node.type === "header" ? (
              <nav className={styles.nav} aria-label="Website navigation">
                <a className={styles.siteBrand} href="#top" onClick={(event) => scrollToSection(event, "top")}>{schoolName}</a>
                {node.labels.filter((label) => label.text).map((label) => (
                  <a key={label.id} href={`#${label.anchorId || node.anchorId || node.id}`} onClick={(event) => scrollToSection(event, label.anchorId || node.anchorId || node.id)}>{label.text}</a>
                ))}
              </nav>
            ) : null}
            {node.type === "banner" ? (
              <div
                className={styles.banner}
                style={{ backgroundImage: `linear-gradient(90deg, rgba(15,23,42,.75), rgba(15,23,42,.12)), url("${slide.imageUrl}")` }}
                onDragOver={(event) => onBannerDragOver?.(event, node.id)}
                onDrop={(event) => onBannerDrop?.(event, node.id)}
              >
                <div className={styles.bannerCopy}>
                  <span className={styles.eyebrow}>{schoolName} · LEARN TO SHINE</span>
                  <h1>{slide.title || "A bright beginning for every learner"}</h1>
                  <p>{slide.subtitle || "Curiosity, confidence and community—every day."}</p>
                  <a className={styles.bannerCta} href="#about" onClick={(event) => scrollToSection(event, "about")}>Discover our school</a>
                </div>
                {slides.length > 1 ? (
                  <>
                    <button className={`${styles.slideArrow} ${styles.slidePrevious}`} type="button" aria-label="Previous banner slide" onClick={() => setSlide(node.id, slideIndex - 1, slides.length)}><ChevronLeft aria-hidden="true" /></button>
                    <button className={`${styles.slideArrow} ${styles.slideNext}`} type="button" aria-label="Next banner slide" onClick={() => setSlide(node.id, slideIndex + 1, slides.length)}><ChevronRight aria-hidden="true" /></button>
                    <div className={styles.slideDots} aria-label="Choose banner slide">
                      {slides.map((item, index) => (
                        <button key={item.id || index} type="button" className={index === slideIndex ? styles.activeDot : ""} aria-label={`Show banner slide ${index + 1}`} aria-current={index === slideIndex ? "true" : undefined} onClick={() => setSlide(node.id, index, slides.length)} />
                      ))}
                    </div>
                  </>
                ) : null}
                {uploadingBannerId === node.id ? (
                  <div className={styles.uploadOverlay} role="status">
                    <span className={styles.spinner} aria-hidden="true" />
                    <strong>Uploading media layout asset...</strong>
                    <small>Simulating a local image placement</small>
                  </div>
                ) : null}
              </div>
            ) : null}
            {node.type === "school-profile" ? (
              <div className={styles.schoolProfile}>
                {node.profileLogo ? <img src={node.profileLogo} alt={`${node.profileName || schoolName} logo`} /> : <div className={styles.logoPlaceholder} aria-hidden="true">{(node.profileName || schoolName).slice(0, 1)}</div>}
                <div><h1>{node.profileName || schoolName}</h1>{node.profileMotto ? <p>{node.profileMotto}</p> : null}</div>
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
            {node.html ? <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizeRichText(node.html, { allowAlignment: true }) }} /> : null}
            {node.type === "contact" ? (
              <div className={styles.contactBlock}>
                <span className={styles.eyebrow}>LET’S CONNECT</span>
                <h2>{node.title || "Come say hello"}</h2>
                <p>Tell us a little about your family. Our admissions team would love to meet you.</p>
                <form onSubmit={async (event) => {
                  event.preventDefault();
                  if (!onContactSubmit || contactSubmitting) return;
                  setContactSubmitting(true);
                  setContactFeedback(null);
                  try {
                    await onContactSubmit(contact);
                    setContact({ name: "", email: "", message: "" });
                    setContactFeedback({ type: "success", message: "Thank you. Your message has been sent to the school." });
                  } catch (error) {
                    setContactFeedback({
                      type: "error",
                      message: error?.response?.data?.detail || error?.message || "Your message could not be sent. Please try again.",
                    });
                  } finally {
                    setContactSubmitting(false);
                  }
                }}>
                  <label>Your name<input required maxLength={120} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
                  <label>Email address<input required type="email" maxLength={254} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
                  <label>Message<textarea required maxLength={5000} rows="3" value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} /></label>
                  <button type="submit" disabled={!onContactSubmit || contactSubmitting}>
                    {contactSubmitting ? "Sending..." : "Submit Message"}
                  </button>
                  {contactFeedback ? (
                    <p className={`${styles.contactFeedback} ${styles[contactFeedback.type]}`} role={contactFeedback.type === "error" ? "alert" : "status"}>
                      {contactFeedback.message}
                    </p>
                  ) : null}
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
        );
          })}
        </div>
      ))}
    </section>
  );
}
