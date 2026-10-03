import { useMemo, useState } from "react";
import ParentShell from "../../components/layout/ParentShell";
import WeekSelector from "../../components/ui/WeekSelector";
import TimetableWeekHeader from "../../components/ui/TimetableWeekHeader";
import { useParentContext } from "../../context/ParentContext";
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

export default function ParentTimetable() {
  const { selectedChild } = useParentContext();
  const classId = selectedChild?.class_id ?? null;
  // Defaults to the week containing today; parents can page back or forward.
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());

  const { data: week, loading, error } = useApi(
    () => (classId ? timetableApi.classTimetableWeek(classId, weekStart) : Promise.resolve(null)),
    [classId, weekStart]
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
    <ParentShell>
      <div className="scr-title">Timetable</div>
      <div className="scr-sub">
        {selectedChild ? `${selectedChild.name}'s weekly schedule` : "Weekly schedule"}
      </div>

      {classId && <WeekSelector weekStart={weekStart} onChange={setWeekStart} busy={loading} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!classId && <div className="empty">No class has been assigned to this child yet.</div>}
      {classId && !loading && !error && (
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
                            {timeLabel ? (
                              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{timeLabel}</div>
                            ) : null}
                          </div>
                        );
                      })}
                      {column.isHoliday && (
                        <span className="timetable-day-note">{column.holidayName || "Holiday"}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <Empty>No timetable has been published for this class yet.</Empty>
          )}
        </div>
      )}
    </ParentShell>
  );
}
