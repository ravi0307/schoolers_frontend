import { sanitizeRichText } from "../ui/richText";
import styles from "./PublicSiteCanvas.module.css";

const LABELS = {
  header: "Header",
  footer: "Footer",
  testimonial: "Testimonials",
  center: "Content",
};

export default function PublicSiteCanvas({ nodes = [] }) {
  if (!nodes.length) return null;
  return (
    <section className={styles.canvas} aria-label="Website sections">
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
              {node.labels.filter((label) => label.text).map((label) => (
                <a key={label.id} href={`#${label.anchorId || node.id}`}>{label.text}</a>
              ))}
            </nav>
          ) : null}
          {node.type === "testimonial" ? <h2>{node.title || LABELS[node.type]}</h2> : null}
          {node.html ? <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(node.html, { allowAlignment: true }) }} /> : null}
          {node.type === "footer" ? (
            <nav className={styles.nav} aria-label="Footer links">
              {node.labels.filter((label) => label.text).map((label) => (
                <a key={label.id} href={`#${label.anchorId || node.id}`}>{label.text}</a>
              ))}
            </nav>
          ) : null}
        </section>
      ))}
    </section>
  );
}
