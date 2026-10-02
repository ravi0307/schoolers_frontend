import styles from "./DataTable.module.css";

export default function DataTable({ label, className = "", children }) {
  return (
    <div
      className={`${styles.viewport} ${className}`.trim()}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
