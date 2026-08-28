import ParentShell from "../../components/layout/ParentShell";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as attendanceApi from "../../api/attendance";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";

export default function ParentAttendance() {
  const { selectedChild } = useParentContext();
  const { data, loading, error } = useApi(
    () => (selectedChild ? attendanceApi.getAttendance(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );

  return (
    <ParentShell>
      <div className="scr-title">Attendance</div>
      <div className="scr-sub">{selectedChild ? `${selectedChild.name}'s attendance history` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((a) => (
              <div key={a.attendance_id} className="listitem">
                <div className="meta">
                  <b>{a.date}</b>
                </div>
                <Pill tone={a.status === "Present" ? "ok" : "warn"}>{a.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No attendance records yet.</Empty>
          )}
        </div>
      )}
    </ParentShell>
  );
}
