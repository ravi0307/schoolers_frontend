import styles from "./Skeleton.module.css";

export default function Skeleton({ lines = 3, label = "Loading content" }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={label}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <span key={index} className={index === lines - 1 ? styles.short : ""} />
      ))}
    </div>
  );
}
