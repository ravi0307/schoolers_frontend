import styles from "./FormActions.module.css";

export default function FormActions({ children, align = "end" }) {
  return <div className={`${styles.actions} ${styles[align] || ""}`}>{children}</div>;
}
