import { createContext, useContext, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../../api/client";
import styles from "./WebLayout.module.css";

const PortalShellContext = createContext(false);

// Each role's profile lives under its own portal prefix, so the link is
// derived from the session rather than passed down by every shell.
const PROFILE_PATH = {
  parent: "/parent/profile",
  teacher: "/teacher/profile",
  admin: "/admin/profile",
  pilot: "/pilot/profile",
  master: "/master/profile",
  staff: "/staff/profile",
};

export default function WebLayout({ navItems, portalLabel, children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profilePath = PROFILE_PATH[user?.role] || "/";
  const parentShellMounted = useContext(PortalShellContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const toggleRef = useRef(null);
  const sidebarRef = useRef(null);
  const [schoolLogoFailed, setSchoolLogoFailed] = useState(false);

  useEffect(() => {
    if (parentShellMounted) return undefined;
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setDrawerOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [parentShellMounted]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => setSchoolLogoFailed(false), [user?.schoolLogoUrl]);

  useEffect(() => {
    if (!isMobile || !drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const toggleButton = toggleRef.current;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      sidebarRef.current?.querySelectorAll(
        'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])'
      ) || [];
    const firstFocusable = focusable()[0];
    firstFocusable?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(focusable());
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (toggleButton?.isConnected) toggleButton.focus();
    };
  }, [drawerOpen, isMobile]);

  if (parentShellMounted) return children ?? <Outlet />;

  // School branding sits above the portal label for every role scoped to a
  // school (admin, teacher, parent, pilot). Master has no school of its own,
  // so it keeps the product brand instead of inventing one.
  const schoolName = user?.schoolName;
  // logo_url is stored server-relative (/api/v1/schools/uploads/...); the dev
  // server has no /api proxy, so it must be resolved against the API origin
  // or the <img> receives the SPA's index.html and silently fails to decode.
  const schoolLogo = resolveMediaUrl(user?.schoolLogoUrl);
  // Greeting the user by first name. The full name arrives from /auth/me as
  // display_name (the login response carries none) and falls back to the
  // username, so this never renders blank on a fresh session.
  const firstName = (user?.displayName || user?.name || user?.username || "")
    .trim()
    .split(/\s+/)[0];
  const initials = schoolName
    ? schoolName
        .split(/\s+/)
        .filter((w) => /[a-z0-9]/i.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "";

  return (
    <PortalShellContext.Provider value>
      <div className={`${styles.shell} web-shell`}>
        {isMobile && (
          <header className={styles.mobileHeader}>
            <button
              ref={toggleRef}
              type="button"
              className={styles.menuButton}
              aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={drawerOpen}
              aria-controls="portal-sidebar"
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
            <span className={styles.mobileBrand}>{schoolName || "Schoolers"}</span>
            <span className={styles.mobilePortal}>{portalLabel}</span>
          </header>
        )}
        {isMobile && drawerOpen && (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          id="portal-sidebar"
          className={`${styles.sidebar} sidebar ${drawerOpen ? styles.sidebarOpen : ""}`}
          aria-label="Primary navigation"
          aria-hidden={isMobile && !drawerOpen}
          aria-modal={isMobile && drawerOpen ? "true" : undefined}
          role={isMobile ? "dialog" : undefined}
          inert={isMobile && !drawerOpen}
        >
          <div className={`${styles.sidebarHead} sidebar-head`}>
            <button
              type="button"
              className={styles.drawerClose}
              aria-label="Close navigation menu"
              onClick={() => {
                setDrawerOpen(false);
                toggleRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
            <div className="brand">
              {schoolName ? (
                <div className="school-brand">
                  {schoolLogo && !schoolLogoFailed ? (
                    <img
                      className="school-logo"
                      src={schoolLogo}
                      alt={`${schoolName} logo`}
                      onError={() => setSchoolLogoFailed(true)}
                    />
                  ) : null}
                  <span className="school-monogram" hidden={!!schoolLogo && !schoolLogoFailed}>{initials}</span>
                  <span className="school-name">{schoolName}</span>
                </div>
              ) : (
                <b>Schoolers</b>
              )}
            </div>
            {firstName && <div className="sidebar-welcome">Welcome {firstName}</div>}
            <div className="portal-label">{portalLabel}</div>
          </div>
          <nav aria-label="Portal">
            {navItems.filter((item) => item.to).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <item.icon className={styles.navIcon} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <footer className={styles.footer}>
            <NavLink
              to={profilePath}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `${styles.profileLink} profile-link${isActive ? " active" : ""}`}
            >
              <UserRound className={styles.navIcon} aria-hidden="true" />
              <span>My Profile</span>
            </NavLink>
            <button
              type="button"
              className={`${styles.signout} signout`}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className={styles.navIcon} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </footer>
        </aside>
        <main id="main-content" tabIndex={-1} className={`${styles.content} web-content`}>
          {children ?? <Outlet />}
        </main>
      </div>
    </PortalShellContext.Provider>
  );
}
