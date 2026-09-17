import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import DurationSelect from "../../components/ui/DurationSelect";
import { apiErrorMessage } from "../../api/client";
import {
  TIMETABLE_DAYS as DAYS,
  toTimeInput,
  displayTime,
  isValidTimeRange,
  buildCreatePeriodPayload,
  buildUpdateEntryPayload,
  getEntryTime,
} from "../../utils/timetableFlow";

// Add an integer number of hours and minutes to an "HH:MM" string and return
// the result as a zero-padded "HH:MM" string. Rolls past midnight (capped at
// 23:59). Returns "" when the input is invalid.
function addDurationToTime(start, hours, minutes) {
  if (!start || !/^\d{1,2}:\d{2}$/.test(start)) return "";
  const [sh, sm] = start.split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm)) return "";
  const total = (sh * 60 + sm) + (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const eh = Math.floor(wrapped / 60);
  const em = wrapped % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

// Compute the difference between two "HH:MM" times as { hours, minutes }.
// Used to populate the duration dropdowns when the edit form is opened with
// an existing start/end pair.
function timeDifference(start, end) {
  if (!start || !end) return { hours: "0", minutes: "0" };
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return { hours: "0", minutes: "0" };
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return { hours: String(Math.floor(mins / 60)), minutes: String(mins % 60) };
}

export default function AdminTimetable() {
  const { data: classes, loading: classesLoading, error: classesError } = useApi(
    () => academicsApi.listClasses(),
    []
  );
  const [selectedClassId, setSelectedClassId] = useState("");
  const [viewingEntry, setViewingEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDurationHours, setEditDurationHours] = useState("1");
  const [editDurationMinutes, setEditDurationMinutes] = useState("0");
  const [newStartTime, setNewStartTime] = useState("");
  const [newDurationHours, setNewDurationHours] = useState("1");
  const [newDurationMinutes, setNewDurationMinutes] = useState("0");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newDayOfWeek, setNewDayOfWeek] = useState("");
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
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

  // End time is always start time + the chosen duration — derived, not state.
  const newEndTime = useMemo(
    () => addDurationToTime(newStartTime, newDurationHours, newDurationMinutes),
    [newStartTime, newDurationHours, newDurationMinutes]
  );
  const editEndTime = useMemo(() => {
    if (!editingEntry) return "";
    const fallbackStart = editingEntry.period_start_time || "";
    return addDurationToTime(editStartTime || fallbackStart, editDurationHours, editDurationMinutes);
  }, [editingEntry, editStartTime, editDurationHours, editDurationMinutes]);

  // Build an index of busy teacher/time/day slots across all classes so we
  // can hide teachers who are already booked in the dropdown. We also build a
  // class-level index so the form can detect "this class already has a period
  // at that time on that day" — without that, two overlapping periods could
  // be created for the same class.
  const { teacherBusyIndex, classBusyIndex } = useMemo(() => {
    const teacherBusy = new Map(); // key = `${teacherId}|${dayOfWeek}` -> [startMin, endMin]
    const classBusy = new Map();   // key = `${classId}|${dayOfWeek}` -> [startMin, endMin]
    const push = (map, key, start, end) => {
      if (!key || !start || !end) return;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      if (!Number.isFinite(sh) || !Number.isFinite(eh)) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push([sh * 60 + sm, eh * 60 + em]);
    };
    const resolveTimes = (entry) => {
      if (entry.period_start_time && entry.period_end_time) {
        return [entry.period_start_time, entry.period_end_time];
      }
      const period = periodById.get(String(entry.period_id));
      if (period?.period_time) {
        const [s, e] = period.period_time.split(" - ");
        return [toTimeInput(s), toTimeInput(e)];
      }
      return [null, null];
    };
    (classTimetables || []).forEach((record) => {
      (record.entries || []).forEach((entry) => {
        const [s, e] = resolveTimes(entry);
        // Prefer the entry's own class_id; fall back to the record's classId
        // (which we set when we issued the request for that class).
        const classId = entry.class_id ?? record.classId;
        if (entry.teacher_id) {
          push(teacherBusy, `${entry.teacher_id}|${entry.day_of_week}`, s, e);
        }
        if (classId != null) {
          push(classBusy, `${classId}|${entry.day_of_week}`, s, e);
        }
      });
    });
    return { teacherBusyIndex: teacherBusy, classBusyIndex: classBusy };
  }, [classTimetables, periodById]);

  // Subject index: subject -> set of teachers already teaching it for this school.
  // Teachers with no entry teaching a given subject are still "valid" — we only
  // block by time/day, not by subject assignment.
  function teacherIsBusy(teacherId, day, start, end) {
    if (!day || !start || !end) return false;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(eh)) return false;
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return false;
    // When "All days" is selected, a teacher is busy if they're booked in ANY day at this time.
    const slots = [];
    if (day === "ALL") {
      for (const [key, ranges] of teacherBusyIndex.entries()) {
        const [tid, d] = key.split("|");
        if (String(tid) !== String(teacherId)) continue;
        ranges.forEach((r) => slots.push(r));
      }
    } else {
      (teacherBusyIndex.get(`${teacherId}|${day}`) || []).forEach((r) => slots.push(r));
    }
    return slots.some(([bs, be]) => startMin < be && endMin > bs);
  }

  // Returns the first day (and the conflicting entry) on which the chosen
  // class already has a period overlapping the given start/end times. Used
  // to block the form and produce a popup with a specific day.
  function classConflict(classId, day, start, end, ignoreEntryId) {
    if (!classId || !start || !end) return null;
    const daysToCheck = !day || day === "ALL"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : [day];
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (![sh, sm, eh, em].every(Number.isFinite)) return null;
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return null;
    for (const d of daysToCheck) {
      const slots = classBusyIndex.get(`${classId}|${d}`) || [];
      if (!slots.some(([bs, be]) => startMin < be && endMin > bs)) continue;
      // Found a conflict on this day — locate the offending entry for a
      // friendlier popup.
      const record = (classTimetables || []).find(
        (rec) => String(rec.classId) === String(classId)
      );
      const conflictingEntry = (record?.entries || []).find((entry) => {
        if (ignoreEntryId && String(entry.entry_id) === String(ignoreEntryId)) return false;
        if (entry.day_of_week !== d) return false;
        const [s, e] = entry.period_start_time && entry.period_end_time
          ? [entry.period_start_time, entry.period_end_time]
          : (() => {
              const period = periodById.get(String(entry.period_id));
              if (period?.period_time) {
                const [a, b] = period.period_time.split(" - ");
                return [toTimeInput(a), toTimeInput(b)];
              }
              return [null, null];
            })();
        if (!s || !e) return false;
        const [ssh, ssm] = s.split(":").map(Number);
        const [eeh, eem] = e.split(":").map(Number);
        return startMin < eeh * 60 + eem && endMin > ssh * 60 + ssm;
      });
      return { day: d, entry: conflictingEntry };
    }
    return null;
  }

  function minutesToHHMM(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const availableTeachersForNew = useMemo(() => {
    return (teachers || []).map((teacher) => ({
      ...teacher,
      busy: teacherIsBusy(teacher.teacher_id, newDayOfWeek, newStartTime, newEndTime),
    }));
  }, [teachers, newDayOfWeek, newStartTime, newEndTime, teacherBusyIndex]);

  const availableTeachersForEdit = useMemo(() => {
    if (!editingEntry) return [];
    const effectiveStart = editStartTime || editingEntry.period_start_time || "";
    const effectiveEnd = editEndTime || editingEntry.period_end_time || "";
    return (teachers || []).map((teacher) => {
      // For edit, the current entry is being updated — don't flag its own
      // teacher as busy just because of itself.
      const isSelf = String(teacher.teacher_id) === String(editingEntry.teacher_id);
      if (isSelf) return { ...teacher, busy: false };
      return {
        ...teacher,
        busy: teacherIsBusy(teacher.teacher_id, editingEntry.day_of_week, effectiveStart, effectiveEnd),
      };
    });
  }, [teachers, editingEntry, editStartTime, editEndTime, periodById, teacherBusyIndex]);

  function openViewer(entry) {
    setViewingEntry(entry);
    setEditingEntry(null);
  }

  function closeViewer() {
    setViewingEntry(null);
  }

  function openEditor(entry) {
    const period = periodById.get(String(entry.period_id));
    setViewingEntry(null);
    setEditingEntry(entry);
    setEditSubjectId(entry.subject_id ? String(entry.subject_id) : "");
    setEditTeacherId(entry.teacher_id ? String(entry.teacher_id) : "");
    const [start = "", end = ""] = entry.period_start_time && entry.period_end_time
      ? [entry.period_start_time, entry.period_end_time]
      : (period?.period_time || "").split(" - ");
    const startInput = toTimeInput(start);
    const endInput = toTimeInput(end);
    setEditStartTime(startInput);
    const { hours, minutes } = timeDifference(startInput, endInput);
    setEditDurationHours(hours || "1");
    setEditDurationMinutes(minutes || "0");
  }

  function closeEditor() {
    setEditingEntry(null);
    setEditSubjectId("");
    setEditTeacherId("");
    setEditStartTime("");
    setEditDurationHours("1");
    setEditDurationMinutes("0");
  }

  async function removeEntry() {
    const target = editingEntry || viewingEntry;
    if (!target || removing) return;
    if (!window.confirm("Remove this period? This cannot be undone.")) return;
    setRemoving(true);
    try {
      await timetableApi.deleteEntry(target.entry_id);
      toast("Period removed");
      setEditingEntry(null);
      setViewingEntry(null);
      setEditSubjectId("");
      setEditTeacherId("");
      setEditStartTime("");
      setEditDurationHours("1");
      setEditDurationMinutes("0");
      refetchEntries();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  function entryTime(entry) {
    return getEntryTime(entry, periodById);
  }

  async function addPeriod(event) {
    event.preventDefault();
    if (!selectedClassId || !newStartTime || !newEndTime) {
      toast("Select a class, start time, and a duration");
      return;
    }
    const totalMinutes = (Number(newDurationHours) || 0) * 60 + (Number(newDurationMinutes) || 0);
    if (totalMinutes <= 0) {
      toast("Duration must be at least 1 minute");
      return;
    }
    // 1) Class-level conflict — a class cannot have two periods at the same
    //    time on the same day. We surface this first because it is the more
    //    user-visible problem ("why is this slot even suggested?") and the
    //    teacher conflict depends on the user having picked one.
    const clsConflict = classConflict(selectedClassId, newDayOfWeek, newStartTime, newEndTime);
    if (clsConflict) {
      const subjectLabel = clsConflict.entry?.subject_id
        ? subjectNames.get(String(clsConflict.entry.subject_id)) || "another subject"
        : "another period";
      const teacherLabel = clsConflict.entry?.teacher_id
        ? teacherNames.get(String(clsConflict.entry.teacher_id)) || "another teacher"
        : "";
      const dayLabel = newDayOfWeek || "any day";
      const detail = teacherLabel ? ` with ${teacherLabel}` : "";
      toast(
        `This class already has ${subjectLabel}${detail} on ${clsConflict.day} at an overlapping time. Pick a different time slot for ${dayLabel}.`
      );
      return;
    }
    // 2) Teacher-level conflict — a teacher cannot be in two places at once.
    const selectedTeacher = availableTeachersForNew.find(t => String(t.teacher_id) === String(newTeacherId));
    if (newTeacherId && selectedTeacher?.busy) {
      const dayLabel = newDayOfWeek || "any day";
      toast(
        `${selectedTeacher.name} is already teaching another class at this time on ${dayLabel}. Pick a different teacher or change the time slot.`
      );
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
      setNewDurationHours("1");
      setNewDurationMinutes("0");
      setNewSubjectId("");
      setNewTeacherId("");
      setNewDayOfWeek("");
      setShowAddPeriod(false);
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
    if (!editSubjectId || !editTeacherId || !editStartTime || !editEndTime) {
      toast("Select a subject, teacher, start time, and duration");
      return;
    }
    const totalMinutes = (Number(editDurationHours) || 0) * 60 + (Number(editDurationMinutes) || 0);
    if (totalMinutes <= 0) {
      toast("Duration must be at least 1 minute");
      return;
    }
    // Class conflict: ignore the entry being edited so the form doesn't
    // conflict with itself when the user is just adjusting other fields.
    const clsConflict = classConflict(
      editingEntry.class_id,
      editingEntry.day_of_week,
      editStartTime,
      editEndTime,
      editingEntry.entry_id
    );
    if (clsConflict) {
      const subjectLabel = clsConflict.entry?.subject_id
        ? subjectNames.get(String(clsConflict.entry.subject_id)) || "another subject"
        : "another period";
      const teacherLabel = clsConflict.entry?.teacher_id
        ? teacherNames.get(String(clsConflict.entry.teacher_id)) || "another teacher"
        : "";
      const detail = teacherLabel ? ` with ${teacherLabel}` : "";
      toast(
        `This class already has ${subjectLabel}${detail} on ${clsConflict.day} at an overlapping time. Pick a different time slot.`
      );
      return;
    }
    const selectedTeacher = availableTeachersForEdit.find(t => String(t.teacher_id) === String(editTeacherId));
    if (selectedTeacher?.busy) {
      toast(
        `${selectedTeacher.name} is already teaching another class at this time on ${editingEntry.day_of_week}. Pick a different teacher or change the time slot.`
      );
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
      <div className="section-sub">Weekly timetable summary — click a class to manage its periods</div>
      {classesLoading || classTimetablesLoading ? (
        <Spinner />
      ) : (
        <div className="timetable-class-grid">
          {(classes || []).map((item) => {
            const timetable = (classTimetables || []).find(
              (record) => String(record.classId) === String(item.class_id)
            );
            const timetableEntries = (timetable?.entries || []).filter(Boolean);
            // Build unique time slots from entries
            const timeSlots = [...new Set(
              timetableEntries.map((e) => e.period_start_time || "")
            )].filter(Boolean).sort();
            // Build a lookup map: `${day}|${startTime}` -> entry
            const entryMap = new Map();
            timetableEntries.forEach((entry) => {
              const start = entry.period_start_time || "";
              entryMap.set(`${entry.day_of_week}|${start}`, entry);
            });
            const selected = String(selectedClassId) === String(item.class_id);
            return (
              <button
                className={`timetable-class-card${selected ? " selected" : ""}`}
                type="button"
                key={item.class_id}
                onClick={() => {
                  setSelectedClassId(String(item.class_id));
                  closeEditor();
                  closeViewer();
                }}
              >
                <span className="timetable-class-card-title">{item.name}</span>
                <span className="timetable-class-card-meta">
                  {timetable?.entries?.length || 0} periods scheduled
                </span>
                <span className="timetable-class-preview">
                  {timeSlots.length ? (
                    <div className="card white timetable-weekly-summary-card">
                      <span className="timetable-weekly-summary-title">Weekly summary</span>
                      <table className="timetable-preview-table">
                        <thead>
                          <tr>
                            <th className="time-col-header">Time</th>
                            {DAYS.map((day) => <th key={day}>{day}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map((start) => (
                            <tr key={start}>
                              <td className="time-cell">{displayTime(start)}</td>
                              {DAYS.map((day) => {
                                const entry = entryMap.get(`${day}|${start}`);
                                return (
                                  <td key={day} className={entry ? "active-cell" : ""}>
                                    {entry
                                      ? (subjectNames.get(String(entry.subject_id)) || "Unassigned")
                                      : ""}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
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
                          onClick={() => openViewer(entry)}
                          title="Click to view timetable entry"
                        >
                          <span className="entry-subject">{entry.subject_id ? (subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`) : "Unassigned"}</span>
                          <span className="entry-time">
                            {entry.period_start_time
                              ? displayTime(entry.period_start_time)
                              : periodById.get(String(entry.period_id))?.period_time?.split(" - ")[0] || ""}
                          </span>
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

      {!selectedClassId && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", margin: "0 0 8px" }}>
          Weekly timetable summary — select a class to manage periods
        </div>
      )}
      {selectedClassId && !viewingEntry && !editingEntry && !showAddPeriod && (
        <div className="add-period-toolbar">
          <button
            className="btn primary"
            type="button"
            onClick={() => setShowAddPeriod(true)}
            title="Add period for the week"
          >
            + Add period for the week
          </button>
        </div>
      )}

      {selectedClassId && showAddPeriod && (
        <form className="card white" onSubmit={addPeriod} style={{ marginBottom: 14 }}>
          <div className="grid4">
            <div className="field">
              <label>Days</label>
              <select value={newDayOfWeek} onChange={(event) => setNewDayOfWeek(event.target.value)}>
                <option value="">All days</option>
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={newStartTime} onChange={(event) => setNewStartTime(event.target.value)} />
            </div>
            <DurationSelect
              label="Duration"
              hours={newDurationHours}
              minutes={newDurationMinutes}
              onHoursChange={setNewDurationHours}
              onMinutesChange={setNewDurationMinutes}
            />
            <div className="field">
              <label>End time</label>
              <input
                type="time"
                value={newEndTime}
                readOnly
                tabIndex={-1}
                style={{ background: "var(--paper)", color: "var(--ink-soft)" }}
              />
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
                {availableTeachersForNew.map((teacher) => (
                  <option key={teacher.teacher_id} value={teacher.teacher_id} disabled={teacher.busy}>
                    {teacher.name}{teacher.busy ? " (busy)" : ""}
                  </option>
                ))}
              </select>
              {newTeacherId && availableTeachersForNew.find(t => String(t.teacher_id) === String(newTeacherId))?.busy && (
                <span className="field-error">This teacher already has a class at this time</span>
              )}
            </div>
            <div className="add-period-actions">
              <button className="btn primary" type="submit" disabled={addingPeriod}>
                {addingPeriod ? "Adding..." : "Add period"}
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={addingPeriod}
                onClick={() => {
                  setShowAddPeriod(false);
                  setNewStartTime("");
                  setNewDurationHours("1");
                  setNewDurationMinutes("0");
                  setNewSubjectId("");
                  setNewTeacherId("");
                  setNewDayOfWeek("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {viewingEntry && !editingEntry && (
        <div className="card white" style={{ marginTop: 14 }}>
          <div className="section-label">Period details</div>
          <div className="grid3">
            <div className="field">
              <label>Day</label>
              <input type="text" value={viewingEntry.day_of_week || ""} readOnly />
            </div>
            <div className="field">
              <label>Start time</label>
              <input
                type="text"
                value={
                  viewingEntry.period_start_time
                    ? displayTime(viewingEntry.period_start_time)
                    : periodById.get(String(viewingEntry.period_id))?.period_time?.split(" - ")[0] || ""
                }
                readOnly
              />
            </div>
            <div className="field">
              <label>End time</label>
              <input
                type="text"
                value={
                  viewingEntry.period_end_time
                    ? displayTime(viewingEntry.period_end_time)
                    : periodById.get(String(viewingEntry.period_id))?.period_time?.split(" - ")[1] || ""
                }
                readOnly
              />
            </div>
            <div className="field">
              <label>Subject</label>
              <input
                type="text"
                value={
                  viewingEntry.subject_id
                    ? subjectNames.get(String(viewingEntry.subject_id)) || `Subject #${viewingEntry.subject_id}`
                    : "Unassigned"
                }
                readOnly
              />
            </div>
            <div className="field">
              <label>Teacher</label>
              <input
                type="text"
                value={
                  viewingEntry.teacher_id
                    ? teacherNames.get(String(viewingEntry.teacher_id)) || `Teacher #${viewingEntry.teacher_id}`
                    : "Unassigned"
                }
                readOnly
              />
            </div>
            <div className="field">
              <label>Class</label>
              <input
                type="text"
                value={
                  (classes || []).find((c) => String(c.class_id) === String(viewingEntry.class_id))?.name ||
                  `Class #${viewingEntry.class_id}`
                }
                readOnly
              />
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="button" onClick={() => openEditor(viewingEntry)}>
              Edit
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={removeEntry}
              disabled={removing}
            >
              {removing ? "Removing..." : "Remove"}
            </button>
            <button className="btn ghost" type="button" onClick={closeViewer} disabled={removing}>
              Close
            </button>
          </div>
        </div>
      )}

      {editingEntry && (
        <form className="card white" onSubmit={saveEntry} style={{ marginTop: 14 }}>
          <div className="section-label">Edit timetable entry</div>
          <div className="grid3">
            <div className="field">
              <label>Day</label>
              <input type="text" value={editingEntry.day_of_week || ""} readOnly />
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={editStartTime} onChange={(event) => setEditStartTime(event.target.value)} />
            </div>
            <DurationSelect
              label="Duration"
              hours={editDurationHours}
              minutes={editDurationMinutes}
              onHoursChange={setEditDurationHours}
              onMinutesChange={setEditDurationMinutes}
            />
            <div className="field">
              <label>End time</label>
              <input
                type="time"
                value={editEndTime}
                readOnly
                tabIndex={-1}
                style={{ background: "var(--paper)", color: "var(--ink-soft)" }}
              />
            </div>
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
                {availableTeachersForEdit.map((teacher) => (
                  <option key={teacher.teacher_id} value={teacher.teacher_id} disabled={teacher.busy}>
                    {teacher.name}{teacher.busy ? " (busy)" : ""}
                  </option>
                ))}
              </select>
              {editTeacherId && availableTeachersForEdit.find(t => String(t.teacher_id) === String(editTeacherId))?.busy && (
                <span className="field-error">This teacher already has a class at this time</span>
              )}
            </div>
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            <button
              className="btn danger"
              type="button"
              onClick={removeEntry}
              disabled={removing || saving}
            >
              {removing ? "Removing..." : "Remove"}
            </button>
            <button className="btn ghost" type="button" onClick={closeEditor} disabled={saving || removing}>Cancel</button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
