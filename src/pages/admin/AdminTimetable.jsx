import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminTimetable() {
  const { data: classes, loading: classesLoading, error: classesError } = useApi(
    () => academicsApi.listClasses(),
    []
  );
  const [selectedClassId, setSelectedClassId] = useState("");
  const { data: entries, loading, error } = useApi(
    () => (selectedClassId ? timetableApi.classTimetable(selectedClassId) : Promise.resolve([])),
    [selectedClassId]
  );

  return (
    <AdminShell>
      <div className="scr-title">Manage Timetable</div>
      <div className="scr-sub">View the weekly schedule for each class</div>

      <div className="field">
        <label>Class</label>
        <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
          <option value="">Select a class</option>
          {(classes || []).map((item) => (
            <option key={item.class_id} value={item.class_id}>{item.name}</option>
          ))}
        </select>
      </div>

      {classesLoading && <Spinner />}
      <ErrorBanner message={classesError || error} />
      {!classesLoading && !classesError && selectedClassId && !loading && !error && (
        <div className="card white" style={{ overflowX: "auto" }}>
          {entries?.length ? (
            <table className="data-table">
              <thead><tr>{DAYS.map((day) => <th key={day}>{day}</th>)}</tr></thead>
              <tbody>
                <tr>
                  {DAYS.map((day) => (
                    <td key={day} style={{ verticalAlign: "top" }}>
                      {(entries.filter((entry) => entry.day_of_week === day)).map((entry) => (
                        <div key={entry.entry_id} className="pill info" style={{ display: "block", marginBottom: 6 }}>
                          {entry.subject_id ? `Subject #${entry.subject_id}` : "Unassigned"}
                          {entry.teacher_id ? ` · Teacher #${entry.teacher_id}` : ""}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <Empty>No timetable entries for this class.</Empty>
          )}
        </div>
      )}
    </AdminShell>
  );
}
