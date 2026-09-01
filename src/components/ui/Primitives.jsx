export function Spinner({ label = "Loading..." }) {
  return <div className="spinner">{label}</div>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="error-banner">{message}</div>;
}

export function Empty({ children = "Nothing here yet." }) {
  return <div className="empty">{children}</div>;
}

export function Kpi({ n, label, onClick }) {
  return (
    <div
      className="kpi"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}

export function Pill({ tone = "mute", children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function initials(name = "") {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function ListItem({ onClick, avatarTone, avatarText, title, subtitle, right }) {
  return (
    <div
      className="listitem"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className={`avatar ${avatarTone || ""}`}>{avatarText}</div>
      <div className="meta">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      {right}
    </div>
  );
}
