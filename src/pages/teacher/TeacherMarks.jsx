import { useState } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as marksApi from "../../api/marks";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function TeacherMarks() {
  const { classIds, selectedClassId, setSelectedClassId, subjectsForSelectedClass, loading: loadLoading } =
    useTeacherContext();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // {studentId, subjectId}
  const [scoreInput, setScoreInput] = useState("");

  const { data: students, loading, error } = useApi(
    () => (selectedClassId ? peopleApi.listStudents({ class_id: selectedClassId }) : Promise.resolve([])),
    [selectedClassId]
  );

  async function save(studentId, subjectId) {
    const score = Number(scoreInput);
    if (isNaN(score) || score < 0 || score > 100) {
      toast("Enter a score between 0 and 100");
      return;
    }
    try {
      await marksApi.upsertMark(studentId, subjectId, "Term 1", score);
      toast("Marks updated");
      setEditing(null);
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <TeacherShell>
      <div className="scr-title">Marks</div>
      <div className="scr-sub">
        {subjectsForSelectedClass.length
          ? `You can edit subjects: ${subjectsForSelectedClass.join(", ")}`
          : "You don't teach a subject in this class"}
      </div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card white" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, fontSize: 11 }}>Student</th>
                {subjectsForSelectedClass.map((subId) => (
                  <th key={subId} style={{ padding: 8, fontSize: 11 }}>Subj #{subId}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students && students.length ? (
                students.map((s) => (
                  <tr key={s.student_id}>
                    <td style={{ padding: 8, fontSize: 12.5, fontWeight: 600 }}>{s.name}</td>
                    {subjectsForSelectedClass.map((subId) => {
                      const isEditing = editing?.studentId === s.student_id && editing?.subjectId === subId;
                      return (
                        <td key={subId} style={{ padding: 8, textAlign: "center" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 4 }}>
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
                                setScoreInput("");
                              }}
                            >
                              —
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
        </div>
      )}
    </TeacherShell>
  );
}
