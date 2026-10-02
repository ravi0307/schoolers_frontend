import styles from "./GalleryCard.module.css";

export default function GalleryCard({ children, className = "", as: Element = "article" }) {
  return <Element className={`${styles.card} ${className}`.trim()}>{children}</Element>;
}
