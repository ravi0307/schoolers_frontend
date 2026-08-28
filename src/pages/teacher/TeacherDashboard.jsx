import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";

export default function TeacherDashboard() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();

  const { data, loading, error } = useApi(
    () => (selectedClassId ? peopleApi.listStudents({ class_id: selectedClassId }) : Promise.resolve([])),
    [selectedClassId]
  );

  return (
    <TeacherShell>
      <div className="scr-title">Student List</div>
      <div className="scr-sub">{selectedClassId ? `Class #${selectedClassId}` : "No class assigned yet"}</div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((s) => (
              <div key={s.student_id} className="listitem">
                <div className="avatar">{initials(s.name)}</div>
                <div className="meta">
                  <b>{s.name}</b>
                  <span>{s.admission_no}</span>
                </div>
                <Pill tone={s.present_today ? "ok" : "warn"}>{s.present_today ? "Present" : "Absent"}</Pill>
              </div>
            ))
          ) : (
            <Empty>No students in this class yet.</Empty>
          )}
        </div>
      )}
    </TeacherShell>
  );
}
