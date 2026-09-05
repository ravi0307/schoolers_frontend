import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import {
  TIMETABLE_DAYS as DAYS,
  toTimeInput,
  isValidTimeRange,
  buildCreatePeriodPayload,
  buildUpdateEntryPayload,
  getEntryTime,
} from "../../utils/timetableFlow";

export default function AdminTimetable() {
  const { data: classes, loading: classesLoading, error: classesError } = useApi(
    () => academicsApi.listClasses(),
    []
  );
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newDayOfWeek, setNewDayOfWeek] = useState("");
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { data: entries, loading, error, refetch: refetchEntries } = useApi(
    () => (selectedClassId ? timetableApi.classTimetable(selectedClassId) : Promise.resolve([])),
    [selectedClassId]
  );
  const { data: classTimetables, loading: classTimetablesLoading } = useApi(
    () => Promise.all((classes || []).map(async (item) => ({
      classId: item.class_id,
      entries: await timetableApi.classTimetable(item.class_id),
    }))),
    [classes]
  );
  const { data: subjects } = useApi(() => academicsApi.listSubjects(), []);
  const { data: periods, refetch: refetchPeriods } = useApi(() => academicsApi.listPeriods(), []);
  const { data: teachers } = useApi(() => peopleApi.listTeachers(), []);

  const subjectNames = useMemo(
    () => new Map((subjects || []).map((item) => [String(item.subject_id), item.name])),
    [subjects]
  );
  const teacherNames = useMemo(
    () => new Map((teachers || []).map((item) => [String(item.teacher_id), item.name])),
    [teachers]
  );
  const periodById = useMemo(
    () => new Map((periods || []).map((item) => [String(item.period_id), item])),
    [periods]
  );

  function openEditor(entry) {
    const period = periodById.get(String(entry.period_id));
    setEditingEntry(entry);
    setEditSubjectId(entry.subject_id ? String(entry.subject_id) : "");
    setEditTeacherId(entry.teacher_id ? String(entry.teacher_id) : "");
    const [start = "", end = ""] = entry.period_start_time && entry.period_end_time
      ? [entry.period_start_time, entry.period_end_time]
      : (period?.period_time || "").split(" - ");
    setEditStartTime(toTimeInput(start));
    setEditEndTime(toTimeInput(end));
  }

  function closeEditor() {
    setEditingEntry(null);
    setEditSubjectId("");
    setEditTeacherId("");
    setEditStartTime("");
    setEditEndTime("");
  }

  function entryTime(entry) {
    return getEntryTime(entry, periodById);
  }

  async function addPeriod(event) {
    event.preventDefault();
    if (!selectedClassId || !isValidTimeRange(newStartTime, newEndTime)) {
      toast("Select a class and enter both start and end times");
      return;
    }
    setAddingPeriod(true);
    try {
      await timetableApi.createWeekPeriod(
        selectedClassId,
        buildCreatePeriodPayload({
          start: newStartTime,
          end: newEndTime,
          subjectId: newSubjectId,
          teacherId: newTeacherId,
          day: newDayOfWeek,
        })
      );
      setNewStartTime("");
      setNewEndTime("");
      setNewSubjectId("");
      setNewTeacherId("");
      setNewDayOfWeek("");
      toast("New weekly period added");
      refetchEntries();
      refetchPeriods();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setAddingPeriod(false);
    }
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!editingEntry) return;
    if (!editSubjectId || !editTeacherId || !isValidTimeRange(editStartTime, editEndTime)) {
      toast("Select a subject, teacher, and both period times");
      return;
    }
    setSaving(true);
    try {
      await timetableApi.updateEntry(
        editingEntry.entry_id,
        buildUpdateEntryPayload({
          start: editStartTime,
          end: editEndTime,
          subjectId: editSubjectId,
          teacherId: editTeacherId,
        })
      );
      toast("Timetable entry updated");
      closeEditor();
      refetchEntries();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Manage Timetable</div>
      <div className="scr-sub">View the weekly schedule for each class</div>

      <div className="section-label">Classes</div>
      {classesLoading || classTimetablesLoading ? (
        <Spinner />
      ) : (
        <div className="timetable-class-grid">
          {(classes || []).map((item) => {
            const timetable = (classTimetables || []).find(
              (record) => String(record.classId) === String(item.class_id)
            );
            const previewEntries = (timetable?.entries || [])
              .filter((entry) => entry.subject_id || entry.teacher_id || entry.period_start_time || entry.period_id)
              .sort((a, b) => String(a.day_of_week).localeCompare(String(b.day_of_week)) || a.period_id - b.period_id)
              .slice(0, 4);
            const selected = String(selectedClassId) === String(item.class_id);
            return (
              <button
                className={`timetable-class-card${selected ? " selected" : ""}`}
                type="button"
                key={item.class_id}
                onClick={() => {
                  setSelectedClassId(String(item.class_id));
                  closeEditor();
                }}
              >
                <span className="timetable-class-card-title">{item.name}</span>
                <span className="timetable-class-card-meta">
                  {timetable?.entries?.length || 0} periods scheduled
                </span>
                <span className="timetable-class-preview">
                  {previewEntries.length ? previewEntries.map((entry) => (
                    <span className="timetable-preview-row" key={entry.entry_id}>
                      <strong>{entry.day_of_week}</strong>
                      <span>
                        {subjectNames.get(String(entry.subject_id)) || "Unassigned"}
                        {entryTime(entry) ? ` · ${entryTime(entry)}` : ""}
                      </span>
                    </span>
                  )) : (
                    <span className="timetable-preview-empty">No entries yet</span>
                  )}
                </span>
                <span className="timetable-class-card-action">
                  {selected ? "Selected" : "View timetable"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!classesLoading && !classTimetablesLoading && !(classes || []).length && (
        <Empty>No classes available.</Empty>
      )}
      {selectedClassId && (
        <div className="selected-timetable-label">
          Managing timetable for {(classes || []).find((item) => String(item.class_id) === String(selectedClassId))?.name}
        </div>
      )}

      {selectedClassId && (
        <form className="card white" onSubmit={addPeriod} style={{ marginBottom: 14 }}>
          <div className="section-label">Add period for the week</div>
          <div className="grid4">
            <div className="field">
              <label>Day</label>
              <select value={newDayOfWeek} onChange={(event) => setNewDayOfWeek(event.target.value)}>
                <option value="">All days</option>
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Subject</label>
              <select value={newSubjectId} onChange={(event) => setNewSubjectId(event.target.value)}>
                <option value="">Select subject</option>
                {(subjects || []).map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Teacher</label>
              <select value={newTeacherId} onChange={(event) => setNewTeacherId(event.target.value)}>
                <option value="">Select teacher</option>
                {(teachers || []).map((teacher) => (
                  <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={newStartTime} onChange={(event) => setNewStartTime(event.target.value)} />
            </div>
            <div className="field">
              <label>End time</label>
              <input type="time" value={newEndTime} onChange={(event) => setNewEndTime(event.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button className="btn primary" type="submit" disabled={addingPeriod}>
                {addingPeriod ? "Adding..." : "Add period"}
              </button>
            </div>
          </div>
        </form>
      )}

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
                        <button
                          key={entry.entry_id}
                          className="pill info timetable-entry-button"
                          type="button"
                          onClick={() => openEditor(entry)}
                          title="Click to edit timetable entry"
                        >
                          {entry.subject_id ? (subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`) : "Unassigned"}
                          {entry.teacher_id ? ` · ${teacherNames.get(String(entry.teacher_id)) || `Teacher #${entry.teacher_id}`}` : ""}
                          {entryTime(entry) ? ` · ${entryTime(entry)}` : ""}
                        </button>
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

      {editingEntry && (
        <form className="card white" onSubmit={saveEntry} style={{ marginTop: 14 }}>
          <div className="section-label">Edit timetable entry</div>
          <div className="grid3">
            <div className="field">
              <label>Subject</label>
              <select value={editSubjectId} onChange={(event) => setEditSubjectId(event.target.value)}>
                <option value="">Select subject</option>
                {(subjects || []).map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Teacher</label>
              <select value={editTeacherId} onChange={(event) => setEditTeacherId(event.target.value)}>
                <option value="">Select teacher</option>
                {(teachers || []).map((teacher) => (
                  <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={editStartTime} onChange={(event) => setEditStartTime(event.target.value)} />
            </div>
            <div className="field">
              <label>End time</label>
              <input type="time" value={editEndTime} onChange={(event) => setEditEndTime(event.target.value)} />
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            <button className="btn ghost" type="button" onClick={closeEditor} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
