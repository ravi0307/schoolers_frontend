import styles from "./Card.module.css";

export default function Card({ as: Element = "div", className = "", children, ...props }) {
  return (
    <Element {...props} className={`${styles.card} ${className}`.trim()}>
      {children}
    </Element>
  );
}
