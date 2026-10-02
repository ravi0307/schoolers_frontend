import { Inbox } from "lucide-react";
import styles from "./EmptyState.module.css";

export default function EmptyState({ children = "Nothing here yet.", className = "" }) {
  return (
    <div className={`${styles.empty} empty ${className}`.trim()} role="status">
      <Inbox aria-hidden="true" size={22} />
      <span>{children}</span>
    </div>
  );
}
