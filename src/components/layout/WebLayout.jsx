import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Turn a nav array into a render list, inserting a heading whenever the
 * `group` changes. Portals that pass a flat array (no `group` key) get exactly
 * the previous behaviour: no headings, same order.
 */
function buildNavEntries(navItems) {
  const entries = [];
  let currentGroup = null;
  for (const item of navItems) {
    if (item.group && item.group !== currentGroup) {
      currentGroup = item.group;
      entries.push({ type: "group", key: `group-${currentGroup}`, label: currentGroup });
    }
    if (item.to) {
      entries.push({ type: "link", key: item.to, item });
    }
  }
  return entries;
}

export default function WebLayout({ navItems, portalLabel, children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="web-shell">
      <div className="sidebar">
        <div className="brand">
          <b>Schoolers</b>
        </div>
        <div style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--pencil-yellow)", marginBottom: 20 }}>
          {portalLabel}
        </div>
        <nav>
          {buildNavEntries(navItems).map((entry) =>
            entry.type === "group" ? (
              <div key={entry.key} className="sidebar-group">
                {entry.label}
              </div>
            ) : (
              <NavLink
                key={entry.key}
                to={entry.item.to}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <span>{entry.item.icon}</span> {entry.item.label}
              </NavLink>
            )
          )}
        </nav>
        <button
          className="signout"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Sign Out
        </button>
      </div>
      <div className="web-content">{children}</div>
    </div>
  );
}
