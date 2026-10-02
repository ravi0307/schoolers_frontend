import styles from "./PageHeader.module.css";

export default function PageHeader({ title, subtitle, action, className = "" }) {
  return (
    <header className={`${styles.header} ${className}`.trim()}>
      <div className={styles.copy}>
        <h1 className="scr-title">{title}</h1>
        {subtitle && <p className={`scr-sub ${styles.subtitle}`}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  );
}
