import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as timetableApi from "../../api/timetable";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherTimetable() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();

  const { data, loading, error } = useApi(
    () => (selectedClassId ? timetableApi.classTimetable(selectedClassId) : Promise.resolve([])),
    [selectedClassId]
  );

  return (
    <TeacherShell>
      <div className="scr-title">Timetable</div>
      <div className="scr-sub">Weekly schedule</div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card white" style={{ overflowX: "auto" }}>
          {data && data.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{DAYS.map((d) => <th key={d} style={{ padding: 6, fontSize: 11 }}>{d}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  {DAYS.map((d) => {
                    const entries = data.filter((e) => e.day_of_week === d);
                    return (
                      <td key={d} style={{ verticalAlign: "top", padding: 6 }}>
                        {entries.map((e) => (
                          <div
                            key={e.entry_id}
                            className="pill"
                            style={{
                              display: "block",
                              marginBottom: 4,
                              background: e.is_holiday_override ? "var(--ok-green-light)" : "var(--paper)",
                            }}
                          >
                            {e.subject_id ? `Subj #${e.subject_id}` : "—"}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          ) : (
            <Empty>No timetable entries yet.</Empty>
          )}
        </div>
      )}
    </TeacherShell>
  );
}
