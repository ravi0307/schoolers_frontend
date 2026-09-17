import { useMemo, useState } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import * as marksApi from "../../api/marks";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

export default function TeacherMarks() {
  const { classIds, selectedClassId, setSelectedClassId, subjectsForSelectedClass, loading: loadLoading } =
    useTeacherContext();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // {studentId, subjectId}
  const [scoreInput, setScoreInput] = useState("");
  const [extraScores, setExtraScores] = useState({});

  const { data: students, loading, error } = useApi(
    () => (selectedClassId ? peopleApi.listStudents({ class_id: selectedClassId }) : Promise.resolve([])),
    [selectedClassId]
  );

  const { data: subjects } = useApi(() => academicsApi.listSubjects(), []);

  const { data: marks, error: marksError, refetch: refetchMarks } = useApi(
    () => (selectedClassId ? marksApi.classMarks(selectedClassId, "Term 1") : Promise.resolve([])),
    [selectedClassId]
  );

  const subjectName = useMemo(() => {
    const map = {};
    if (subjects) for (const s of subjects) map[s.subject_id] = s.name;
    return map;
  }, [subjects]);

  const scores = useMemo(() => {
    const map = {};
    if (marks) for (const m of marks) map[`${m.student_id}:${m.subject_id}`] = m.score;
    return { ...map, ...extraScores };
  }, [marks, extraScores]);

  async function save(studentId, subjectId) {
    const raw = Number(scoreInput);
    if (scoreInput.trim() === "" || Number.isNaN(raw) || raw < 0 || raw > 100) {
      toast("Enter a score between 0 and 100");
      return;
    }
    const score = Math.round(raw); // the API stores whole marks
    try {
      await marksApi.upsertMark(studentId, subjectId, "Term 1", score);
      setExtraScores((prev) => ({ ...prev, [`${studentId}:${subjectId}`]: score }));
      toast("Marks updated");
      setEditing(null);
      refetchMarks();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function changeClass(classId) {
    if (editing && !window.confirm("You have an unsaved mark. Discard it and switch class?")) return;
    setEditing(null);
    setScoreInput("");
    setSelectedClassId(classId);
  }

  const pager = usePagination(students);

  return (
    <TeacherShell>
      <div className="scr-title">Marks</div>
      <div className="scr-sub">
        {subjectsForSelectedClass.length
          ? `You can edit: ${subjectsForSelectedClass.map((id) => subjectName[id] || `Subj #${id}`).join(", ")}`
          : "You don't teach a subject in this class"}
      </div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={changeClass} />}

      {loading && <Spinner />}
      <ErrorBanner message={error || marksError} />
      {!loading && !error && !marksError && (
        <div className="card white" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, fontSize: 11 }}>Student</th>
                {subjectsForSelectedClass.map((subId) => (
                  <th key={subId} style={{ padding: 8, fontSize: 11 }}>
                    {subjectName[subId] || `Subj #${subId}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students && students.length ? (
                pager.pageItems.map((s) => (
                  <tr key={s.student_id}>
                    <td style={{ padding: 8, fontSize: 12.5, fontWeight: 600 }}>{s.name}</td>
                    {subjectsForSelectedClass.map((subId) => {
                      const key = `${s.student_id}:${subId}`;
                      const isEditing = editing?.studentId === s.student_id && editing?.subjectId === subId;
                      const current = scores[key];
                      return (
                        <td key={subId} style={{ padding: 8, textAlign: "center" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                autoFocus
                                value={scoreInput}
                                onChange={(e) => setScoreInput(e.target.value)}
                                style={{ width: 50, padding: 4 }}
                              />
                              <button className="btn primary sm" onClick={() => save(s.student_id, subId)}>✓</button>
                            </div>
                          ) : (
                            <span
                              style={{ cursor: "pointer", fontWeight: 700 }}
                              onClick={() => {
                                setEditing({ studentId: s.student_id, subjectId: subId });
                                setScoreInput(current != null ? String(current) : "");
                              }}
                            >
                              {current != null ? current : "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr><td><Empty /></td></tr>
              )}
            </tbody>
          </table>
          <Pagination {...pager} />
        </div>
      )}
    </TeacherShell>
  );
}