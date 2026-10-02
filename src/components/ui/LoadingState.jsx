import styles from "./LoadingState.module.css";

export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className={`${styles.loading} spinner`} role="status" aria-live="polite">
      <span className={styles.indicator} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
