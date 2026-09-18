import { useMemo } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { TIMETABLE_DAYS as DAYS, getEntryTime } from "../../utils/timetableFlow";

export default function TeacherTimetable() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();

  const { data, loading, error } = useApi(
    () => (selectedClassId ? timetableApi.classTimetable(selectedClassId) : Promise.resolve([])),
    [selectedClassId]
  );

  const { data: subjects } = useApi(() => academicsApi.listSubjects(), []);
  const { data: periods } = useApi(() => academicsApi.listPeriods(), []);

  const subjectNames = useMemo(
    () => new Map((subjects || []).map((item) => [String(item.subject_id), item.name])),
    [subjects]
  );
  const periodById = useMemo(
    () => new Map((periods || []).map((item) => [String(item.period_id), item])),
    [periods]
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
            <table className="data-table">
              <thead>
                <tr>{DAYS.map((day) => <th key={day}>{day}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  {DAYS.map((day) => (
                    <td key={day} style={{ verticalAlign: "top" }}>
                      {data
                        .filter((entry) => entry.day_of_week === day)
                        .map((entry) => {
                          const timeLabel = getEntryTime(entry, periodById);
                          return (
                            <div
                              key={entry.entry_id}
                              className="pill"
                              style={{ display: "block", marginBottom: 4, background: "var(--paper)" }}
                            >
                              <div style={{ fontWeight: 700 }}>
                                {entry.subject_id
                                  ? subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`
                                  : "Unassigned"}
                              </div>
                              {timeLabel ? <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{timeLabel}</div> : null}
                            </div>
                          );
                        })}
                    </td>
                  ))}
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