import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as reportsApi from "../../api/reports";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";

const busIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h11a4 4 0 0 1 4 4v7a1 1 0 0 1-1 1h-2" />
    <path d="M4 16h11a2 2 0 0 0 2-2v-3H4v5Z" />
    <path d="M4 6h11v5H4V6Z" />
    <circle cx="7" cy="16" r="1.6" />
    <circle cx="12" cy="16" r="1.6" />
    <path d="M2 4v3m19-1v3" />
  </svg>
);

const ICONS = {
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  ),
  teachers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M22 9v5" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
      <path d="M8 15.5h.01M16 15.5h.01" />
    </svg>
  ),
  parents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M3.5 19c0-2.8 2.4-4.6 5.5-4.6s5.5 1.8 5.5 4.6" />
      <path d="M14.5 14.6c2.2.1 4 .9 4.7 2.4" />
    </svg>
  ),
  classes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  routes: busIcon,
};

const METRICS = [
  { key: "students", label: "Students", caption: "Enrolled", to: "/admin/students", tone: 0 },
  { key: "teachers", label: "Teachers", caption: "Teaching staff", to: "/admin/teachers", tone: 1 },
  { key: "staff", label: "Staff", caption: "Non-teaching", to: "/admin/staff", tone: 2 },
  { key: "parents", label: "Parents", caption: "Guardians on record", to: "/admin/students", tone: 3 },
  { key: "classes", label: "Classes", caption: "Active classes", to: "/admin/classes", tone: 0 },
  { key: "pending_leave_requests", label: "Pending Leave", caption: "Awaiting review", to: "/admin/leave", tone: 1 },
  { key: "active_routes", label: "Active Routes", caption: "Pickup & drop", to: "/admin/routes", tone: 2 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => reportsApi.schoolOverview(user.schoolId), [user.schoolId]);

  return (
    <AdminShell>
      <div className="scr-title">School Dashboard</div>
      <div className="scr-sub">Overview</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {data && (
        <div className="stat-grid">
          {METRICS.map((m) => (
            <div key={m.key} className={`stat-card tone-${m.tone}`} onClick={() => navigate(m.to)}>
              <span className="stat-icon">{ICONS[m.key]}</span>
              <span className="stat-body">
                <span className="stat-num">{data[m.key]}</span>
                <span className="stat-label">{m.label}</span>
                <span className="stat-cap">{m.caption}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}