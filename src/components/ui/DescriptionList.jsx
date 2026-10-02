import styles from "./DescriptionList.module.css";

export default function DescriptionList({ items, emptyLabel = "Not provided" }) {
  return (
    <dl className={styles.list}>
      {items.map(({ label, value, emptyLabel: itemEmptyLabel }) => {
        const hasValue = value !== null && value !== undefined && value !== "";
        return (
          <div className={styles.row} key={label}>
            <dt>{label}</dt>
            <dd className={hasValue ? "" : styles.empty}>
              {hasValue ? value : itemEmptyLabel || emptyLabel}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
