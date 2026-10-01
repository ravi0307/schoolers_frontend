import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../../api/client";

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
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // School branding sits above the portal label for every role scoped to a
  // school (admin, teacher, parent, pilot). Master has no school of its own,
  // so it keeps the product brand instead of inventing one.
  const schoolName = user?.schoolName;
  // logo_url is stored server-relative (/api/v1/schools/uploads/...); the dev
  // server has no /api proxy, so it must be resolved against the API origin
  // or the <img> receives the SPA's index.html and silently fails to decode.
  const schoolLogo = resolveMediaUrl(user?.schoolLogoUrl);
  const initials = schoolName
    ? schoolName
        .split(/\s+/)
        .filter((w) => /[a-z0-9]/i.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "";

  return (
    <div className="web-shell">
      <div className="sidebar">
        <div className="sidebar-head">
        <div className="brand">
          {schoolName ? (
            <div className="school-brand">
              {schoolLogo ? (
                <img
                  className="school-logo"
                  src={schoolLogo}
                  alt={`${schoolName} logo`}
                  onError={(e) => {
                    // A stale or missing file must not leave a broken image
                    // icon; fall back to the monogram.
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.removeAttribute("hidden");
                  }}
                />
              ) : null}
              <span className="school-monogram" hidden={!!schoolLogo}>
                {initials}
              </span>
              <span className="school-name">{schoolName}</span>
            </div>
          ) : (
            <b>Schoolers</b>
          )}
        </div>
        <div className="portal-label">{portalLabel}</div>
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
