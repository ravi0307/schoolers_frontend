import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as reportsApi from "../../api/reports";
import { Spinner, ErrorBanner, Kpi } from "../../components/ui/Primitives";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi(() => reportsApi.schoolOverview(user.schoolId), [user.schoolId]);

  return (
    <AdminShell>
      <div className="scr-title">School Dashboard</div>
      <div className="scr-sub">Overview</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {data && (
        <>
          <div className="grid3" style={{ marginBottom: 12 }}>
            <Kpi n={data.students} label="Students" />
            <Kpi n={data.teachers} label="Teachers" />
            <Kpi n={data.staff} label="Staff" />
          </div>
          <div className="grid3">
            <Kpi n={data.classes} label="Classes" />
            <Kpi n={data.pending_leave_requests} label="Pending Leave" />
            <Kpi n={data.active_routes} label="Active Routes" />
          </div>
        </>
      )}
    </AdminShell>
  );
}
