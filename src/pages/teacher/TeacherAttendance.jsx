import { useState, useEffect } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as attendanceApi from "../../api/attendance";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

const today = new Date().toISOString().slice(0, 10);

export default function TeacherAttendance() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();
  const toast = useToast();
  const [statuses, setStatuses] = useState({}); // student_id -> 'Present' | 'Absent'
  const [submitting, setSubmitting] = useState(false);

  const { data: students, loading, error } = useApi(
    () => (selectedClassId ? peopleApi.listStudents({ class_id: selectedClassId }) : Promise.resolve([])),
    [selectedClassId]
  );

  useEffect(() => {
    if (students) {
      const init = {};
      students.forEach((s) => (init[s.student_id] = s.present_today ? "Present" : "Absent"));
      setStatuses(init);
    }
  }, [students]);

  function toggle(studentId) {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "Present" ? "Absent" : "Present",
    }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const entries = Object.entries(statuses).map(([student_id, status]) => ({
        student_id: Number(student_id),
        status,
      }));
      await attendanceApi.markAttendance(selectedClassId, today, entries);
      toast("Attendance submitted");
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === "Present").length;
  const total = Object.keys(statuses).length;

  return (
    <TeacherShell>
      <div className="scr-title">Mark Attendance</div>
      <div className="scr-sub">{today}</div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      {!loading && total > 0 && (
        <div className="grid3" style={{ marginBottom: 16 }}>
          <div className="kpi"><div className="n">{presentCount}</div><div className="l">Present</div></div>
          <div className="kpi"><div className="n">{total - presentCount}</div><div className="l">Absent</div></div>
          <div className="kpi"><div className="n">{total ? Math.round((presentCount / total) * 100) : 0}%</div><div className="l">Attendance</div></div>
        </div>
      )}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {students && students.length ? (
            students.map((s) => (
              <div key={s.student_id} className="listitem" onClick={() => toggle(s.student_id)} style={{ cursor: "pointer" }}>
                <div className="meta">
                  <b>{s.name}</b>
                </div>
                <span className={`pill ${statuses[s.student_id] === "Present" ? "ok" : "warn"}`}>
                  {statuses[s.student_id] || "—"}
                </span>
              </div>
            ))
          ) : (
            <Empty>No students in this class yet.</Empty>
          )}
        </div>
      )}

      {students && students.length > 0 && (
        <button className="btn primary block" onClick={submit} disabled={submitting} style={{ marginTop: 12 }}>
          {submitting ? "Submitting..." : "Submit Attendance"}
        </button>
      )}
    </TeacherShell>
  );
}
