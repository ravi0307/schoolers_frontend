import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as reportsApi from "../../api/reports";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import * as leaveApi from "../../api/leave";
import * as transportApi from "../../api/transport";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import styles from "./AdminDashboard.module.css";

const ICONS = {
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  ),
  teachers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  ),
  parents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M3.5 19c0-2.8 2.4-4.6 5.5-4.6s5.5 1.8 5.5 4.6" />
    </svg>
  ),
  classes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  routes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="11" height="12" rx="2" />
      <path d="M4 9h14" />
      <circle cx="8" cy="18" r="1.8" />
      <circle cx="13" cy="18" r="1.8" />
    </svg>
  ),
};

const TONE_CLASS = {
  ok: styles.toneOk,
  warn: styles.toneWarn,
  mute: styles.toneMute,
};

function QuickCard({ icon, title, summary, rows, onNavigate }) {
  return (
    <button className={`card ${styles.quickCard}`} onClick={onNavigate}>
      <div className={styles.quickHeader}>
        <b className={styles.quickTitle}>
          <span className={styles.quickIcon}>
            {icon}
          </span>
          {title}
        </b>
        <span className={styles.openLabel}>Open →</span>
      </div>
      <div className={styles.summary}>{summary}</div>
      {rows && rows.length > 0 && (
        <div className={styles.recent}>
          <div className={styles.recentHeading}>Recent</div>
          {rows.map((row, i) => (
            <div key={i} className={styles.recentRow}>
              <span className={styles.recentLabel}>
                {row.label}
              </span>
              <span className={`${styles.recentValue} ${TONE_CLASS[row.tone] || ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: overview, loading, error } = useApi(() => reportsApi.schoolOverview(user.schoolId), [user.schoolId]);
  const { data: students } = useApi(() => peopleApi.listStudents(), []);
  const { data: teachers } = useApi(() => peopleApi.listTeachers(), []);
  const { data: staff } = useApi(() => peopleApi.listStaff(), []);
  const { data: parents } = useApi(() => peopleApi.listParents(), []);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const { data: leaves } = useApi(() => leaveApi.listLeave(), []);
  const { data: routes } = useApi(() => transportApi.listRoutes(), []);

  const classNames = useMemo(
    () => new Map((classes || []).map((c) => [c.class_id, c.name])),
    [classes]
  );

  const cards = useMemo(() => {
    if (!overview) return [];
    const studentRows = (students || []).slice(0, 5).map((s) => ({
      label: s.name,
      value: classNames.get(s.class_id) || "Unassigned",
    }));
    const teacherRows = (teachers || []).slice(0, 5).map((t) => ({
      label: t.name,
      value: t.role_title || "Teacher",
    }));
    const staffRows = (staff || []).slice(0, 5).map((p) => ({
      label: p.name,
      value: p.role_title || "Other staff",
    }));
    const parentRows = (parents || []).slice(0, 5).map((p) => ({
      label: p.name,
      value: "Parent",
    }));
    const classRows = (classes || []).slice(0, 5).map((c) => ({
      label: c.name,
      value: "Class",
    }));
    const pendingRows = (leaves || [])
      .filter((l) => l.status === "Pending")
      .slice(0, 5)
      .map((l) => ({
        label: l.requester_name,
        value: l.from_date,
        tone: "warn",
      }));
    const routeRows = (routes || [])
      .slice(0, 5)
      .map((r) => ({
        label: r.name,
        value: r.status || "On route",
        tone: r.status === "On route" || !r.status ? "ok" : "mute",
      }));

    return [
      {
        to: "/admin/students",
        icon: ICONS.students,
        title: "Students",
        summary: `${overview.students} enrolled`,
        rows: studentRows,
      },
      {
        to: "/admin/teachers",
        icon: ICONS.teachers,
        title: "Teachers",
        summary: `${overview.teachers} teachers`,
        rows: teacherRows,
      },
      {
        to: "/admin/staff",
        icon: ICONS.staff,
        title: "Staff",
        summary: `${overview.staff} staff`,
        rows: staffRows,
      },
      {
        to: "/admin/students",
        icon: ICONS.parents,
        title: "Parents",
        summary: `${overview.parents} guardians`,
        rows: parentRows,
      },
      {
        to: "/admin/classes",
        icon: ICONS.classes,
        title: "Classes",
        summary: `${overview.classes} classes`,
        rows: classRows,
      },
      {
        to: "/admin/leave",
        icon: ICONS.leave,
        title: "Pending Leave",
        summary: `${overview.pending_leave_requests} awaiting review`,
        rows: pendingRows,
      },
      {
        to: "/admin/routes",
        icon: ICONS.routes,
        title: "Active Routes",
        summary: `${overview.active_routes} on route`,
        rows: routeRows,
      },
    ];
  }, [overview, students, teachers, staff, parents, classes, leaves, routes, classNames]);

  return (
    <AdminShell>
      <div className="scr-title">School Dashboard</div>
      <div className="scr-sub">Overview</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && (
        <>
          <div className="section-label">Quick access</div>
          <div className="grid2">
            {cards.map((card) => (
              <QuickCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                summary={card.summary}
                rows={card.rows}
                onNavigate={() => navigate(card.to)}
              />
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}