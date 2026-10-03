import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import WeekSelector from "../../components/ui/WeekSelector";
import TimetableWeekHeader from "../../components/ui/TimetableWeekHeader";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import {
  getEntryTime,
  startOfWeekIso,
  buildWeekColumns,
  mergeWeekColumns,
} from "../../utils/timetableFlow";
import styles from "./ParentTimetable.module.css";

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
    <>
      <PageHeader
        title="Timetable"
        subtitle={selectedChild ? `${selectedChild.name}'s weekly schedule` : "Weekly schedule"}
      />

      {classId && <WeekSelector weekStart={weekStart} onChange={setWeekStart} busy={loading} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!classId && <EmptyState>No class has been assigned to this child yet.</EmptyState>}
      {classId && !loading && !error && (
        <Card className={`card white ${styles.tableCard}`}>
          {hasEntries ? (
            <DataTable label="Weekly class timetable">
              <table className="data-table">
                <TimetableWeekHeader columns={weekColumns} weekStart={weekStart} />
                <tbody>
                  <tr>
                  {/* Matches the header's caption column; without it the day
                      cells shift left and holiday notes land on the wrong day. */}
                  <td className="timetable-week-corner" />
                  {weekColumns.map((column) => (
                    <td key={column.day} className={`${styles.timetableCell} ${column.isHoliday ? "timetable-day-holiday" : ""}`}>
                      {column.entries.map((entry) => {
                        const timeLabel = getEntryTime(entry, periodById);
                        return (
                          <div key={entry.entry_id} className={`pill ${styles.timetableEntry}`}>
                            <div className={styles.entrySubject}>
                              {entry.subject_id
                                ? subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`
                                : "Unassigned"}
                            </div>
                            {timeLabel ? (
                              <div className={styles.entryTime}>{timeLabel}</div>
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
            </DataTable>
          ) : (
            <EmptyState>No timetable has been published for this class yet.</EmptyState>
          )}
        </Card>
      )}
    </>
  );
}
