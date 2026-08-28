import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as systemHealthApi from "../../api/systemHealth";
import { Spinner, ErrorBanner, Pill } from "../../components/ui/Primitives";

const SERVICE_LABELS = {
  auth: "Auth",
  schools: "Schools",
  academics: "Academics",
  people: "People",
  attendance: "Attendance",
  marks: "Marks",
  timetable: "Timetable",
  transport: "Transport",
  leave: "Leave",
  communication: "Communication",
  barter: "Barter",
  activities: "Activities",
  website: "Website",
  notifications: "Notifications",
  reports: "Reports",
};

export default function MasterSystemHealth() {
  const { data, loading, error, refetch } = useApi(() => systemHealthApi.servicesHealth(), []);

  const upCount = data ? Object.values(data).filter((s) => s.status === "up").length : 0;
  const total = data ? Object.keys(data).length : 0;

  return (
    <MasterShell>
      <div className="scr-title">System Health</div>
      <div className="scr-sub">
        Live status of every microservice behind the API gateway
        {data ? ` · ${upCount}/${total} up` : ""}
      </div>

      <button className="btn ghost sm" onClick={refetch} style={{ marginBottom: 14 }}>
        Refresh
      </button>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && data && (
        <div className="card">
          {Object.entries(data).map(([key, info]) => (
            <div key={key} className="listitem">
              <div className={`avatar ${info.status === "up" ? "g" : "r"}`}>
                {(SERVICE_LABELS[key] || key)[0]}
              </div>
              <div className="meta">
                <b>{SERVICE_LABELS[key] || key}</b>
                <span>{info.status === "up" ? "Responding normally" : String(info.detail).slice(0, 60)}</span>
              </div>
              <Pill tone={info.status === "up" ? "ok" : "warn"}>{info.status}</Pill>
            </div>
          ))}
        </div>
      )}
    </MasterShell>
  );
}
