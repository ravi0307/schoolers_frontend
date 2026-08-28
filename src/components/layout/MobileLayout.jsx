import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function MobileLayout({ tabs, children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mobile-frame">
      <div className="mobile-topbar">
        <b>Schoolers</b>
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
