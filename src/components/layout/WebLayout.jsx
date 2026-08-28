import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
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
