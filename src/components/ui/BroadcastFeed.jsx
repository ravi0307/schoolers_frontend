import { Spinner, ErrorBanner, Empty } from "./Primitives";

function toPlainText(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function createdAtOf(item) {
  return item.created_at || item.createdAt || item.created || item.timestamp || null;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function audienceLabel(item) {
  if (item.scope === "class") return "Class update";
  if (item.scope === "route") return `Transport route${item.route_id ? ` #${item.route_id}` : ""}`;
  if (item.scope === "pilot") return "Pilot notice";
  return "School-wide";
}

export default function BroadcastFeed({ data, loading, error, limit, empty = "No announcements yet." }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  const items = Array.isArray(data) ? data : [];
  const visible = limit ? items.slice(0, limit) : items;
  if (!visible.length) return <Empty>{empty}</Empty>;

  return (
    <div className="card">
      {visible.map((item) => (
        <div key={item.broadcast_id} className="listitem">
          <div className="avatar y">📣</div>
          <div className="meta">
            <b>{item.sender_name || item.role_name || "School"}</b>
            <span>{toPlainText(item.message)}</span>
            <span style={{ display: "block", marginTop: 4, color: "#64748b", fontSize: 12 }}>
              {item.role_name || "School"} · {audienceLabel(item)} · {formatDate(createdAtOf(item))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}