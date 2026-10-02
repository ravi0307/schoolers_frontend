import styles from "./Toast.module.css";

export default function Toast({ children }) {
  return (
    <div className={`${styles.toast} toast`} role="status" aria-live="polite">
      {children}
    </div>
  );
}
