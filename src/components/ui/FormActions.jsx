import styles from "./FormActions.module.css";

export default function FormActions({ children, align = "start" }) {
  return <div className={`${styles.actions} ${styles[align] || ""}`}>{children}</div>;
}
