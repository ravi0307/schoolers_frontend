import styles from "./Button.module.css";

export default function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${styles.button} ${styles[variant] || ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
