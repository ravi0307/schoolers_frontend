import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import Modal from "./Modal";

export function Spinner({ label = "Loading..." }) {
  return <LoadingState label={label} />;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="error-banner" role="alert">{message}</div>;
}

export function Empty({ children = "Nothing here yet." }) {
  return <EmptyState>{children}</EmptyState>;
}

export function Kpi({ n, label, onClick }) {
  const Content = (
    <>
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </>
  );
  if (onClick) {
    return <button className="kpi kpi-interactive" type="button" onClick={onClick}>{Content}</button>;
  }
  return (
    <div className="kpi">{Content}</div>
  );
}

export function Pill({ tone = "mute", children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function initials(name = "") {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function ListItem({ onClick, avatarTone, avatarText, title, subtitle, right }) {
  const Content = (
    <>
      <div className={`avatar ${avatarTone || ""}`}>{avatarText}</div>
      <div className="meta">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      {right}
    </>
  );
  if (onClick) {
    return <button className="listitem listitem-interactive" type="button" onClick={onClick}>{Content}</button>;
  }
  return (
    <div className="listitem">{Content}</div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Remove", destructive = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <Modal
      onClose={onCancel}
      titleId="confirm-title"
      overlayClassName="confirm-overlay"
      panelClassName="confirm-box"
    >
        <div className="confirm-title" id="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className={destructive ? "btn danger" : "btn primary"} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
    </Modal>
  );
}
