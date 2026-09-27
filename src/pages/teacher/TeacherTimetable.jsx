import { useMemo, useState } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import WeekSelector from "../../components/ui/WeekSelector";
import TimetableWeekHeader from "../../components/ui/TimetableWeekHeader";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import {
  getEntryTime,
  startOfWeekIso,
  buildWeekColumns,
  mergeWeekColumns,
} from "../../utils/timetableFlow";

export default function TeacherTimetable() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();
  // Defaults to the week containing today; teachers can page back or forward.
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());

  const { data: week, loading, error } = useApi(
    () =>
      selectedClassId
        ? timetableApi.classTimetableWeek(selectedClassId, weekStart)
        : Promise.resolve(null),
    [selectedClassId, weekStart]
  );
  const weekColumns = useMemo(
    () => mergeWeekColumns(buildWeekColumns(weekStart), week),
    [weekStart, week]
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

  const hasEntries = weekColumns.some((column) => column.entries.length > 0);

  return (
    <TeacherShell>
      <div className="scr-title">Timetable</div>
      <div className="scr-sub">Weekly schedule</div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      <WeekSelector weekStart={weekStart} onChange={setWeekStart} busy={loading} />

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card white" style={{ overflowX: "auto" }}>
          {hasEntries ? (
            <table className="data-table">
              <TimetableWeekHeader columns={weekColumns} weekStart={weekStart} />
              <tbody>
                <tr>
                  {/* Matches the header's caption column; without it the day
                      cells shift left and holiday notes land on the wrong day. */}
                  <td className="timetable-week-corner" />
                  {weekColumns.map((column) => (
                    <td
                      key={column.day}
                      style={{ verticalAlign: "top" }}
                      className={column.isHoliday ? "timetable-day-holiday" : undefined}
                    >
                      {column.entries.map((entry) => {
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
                      {column.isHoliday && (
                        <span className="timetable-day-note">
                          {column.holidayName || "Holiday"}
                        </span>
                      )}
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
