import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Same per-role prefix as the sidebar link, so both layouts agree on where a
// user's own profile lives.
const PROFILE_PATH = {
  parent: "/parent/profile",
  teacher: "/teacher/profile",
  admin: "/admin/profile",
  pilot: "/pilot/profile",
  master: "/master/profile",
};

export default function MobileLayout({ tabs, children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mobile-frame">
      <div className="mobile-topbar">
        <b>Schoolers</b>
        {/* Icon-only on a phone: the label would crowd the brand out, but it
            stays as the accessible name. */}
        <NavLink
          to={PROFILE_PATH[user?.role] || "/"}
          aria-label="My Profile"
          title="My Profile"
          className={({ isActive }) => (isActive ? "active" : "")}
          style={{ color: "#fff", textDecoration: "none", fontSize: 18 }}
        >
          👤
        </NavLink>
        <button
          className="btn ghost sm"
          style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Sign Out
        </button>
      </div>
      <div className="mobile-content">{children}</div>
      <div className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
