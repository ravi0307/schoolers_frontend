import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as attendanceApi from "../../api/attendance";
import { Spinner, ErrorBanner, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";

export default function ParentAttendance() {
  const { selectedChild } = useParentContext();
  const { data, loading, error } = useApi(
    () => (selectedChild ? attendanceApi.getAttendance(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  const pager = usePagination(data);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={selectedChild ? `${selectedChild.name}'s attendance history` : ""}
      />
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <Card className="card">
          {data && data.length ? (
            pager.pageItems.map((a) => (
              <div key={a.attendance_id} className="listitem">
                <div className="meta">
                  <b>{a.date}</b>
                </div>
                <Pill tone={a.status === "Present" ? "ok" : "warn"}>{a.status}</Pill>
              </div>
            ))
          ) : (
            <EmptyState>No attendance records yet.</EmptyState>
          )}
          <Pagination {...pager} />
        </Card>
      )}
    </>
  );
}
