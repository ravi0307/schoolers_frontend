import styles from "./FormField.module.css";

export default function FormField({ id, label, hint, error, required = false, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <p className={styles.hint} id={`${id}-hint`}>{hint}</p>}
      {error && <p className={styles.error} id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
