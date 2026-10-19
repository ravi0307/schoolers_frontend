import { useMemo, useState } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import Select from "../../components/ui/Select";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import * as marksApi from "../../api/marks";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage, friendlyApiMessage } from "../../api/client";

const SESSION_STATUSES = ["present", "absent", "missing", "exempt"];

export default function TeacherMarks() {
  const { load, classIds, selectedClassId, setSelectedClassId, subjectsForSelectedClass, loading: loadLoading } =
    useTeacherContext();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // {studentId, subjectId}
  const [scoreInput, setScoreInput] = useState("");
  const [extraScores, setExtraScores] = useState({});
  // Session mode (Phase 6): examination-based entry alongside the legacy
  // term grid below. The legacy path is untouched.
  const [mode, setMode] = useState("term");
  const [examId, setExamId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState({});

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

  const exams = useApi(
    () => (mode === "session" ? academicsApi.listExaminations() : Promise.resolve([])),
    [mode]
  );
  const examSessions = useApi(
    () => (mode === "session" && examId
      ? academicsApi.listExaminationSessions(examId)
      : Promise.resolve([])),
    [mode, examId]
  );
  const taughtPairs = useMemo(
    () => new Set(load.map((l) => `${l.class_id}:${l.subject_id}`)),
    [load]
  );
  // Only sessions the teacher grades (class AND subject) — mirrors the
  // backend grader check so a wrong-subject session never appears and 403s.
  const mySessions = useMemo(
    () => (examSessions.data || [])
      .filter((s) => taughtPairs.has(`${s.class_id}:${s.subject_id}`)),
    [examSessions.data, taughtPairs]
  );
  const activeSession = mySessions.find((s) => s.session_id === Number(sessionId));
  const activeExam = (exams.data || []).find((e) => e.exam_id === Number(examId));
  const sessionResults = useApi(
    // view=entry: the teacher must see their own drafts (and submitted
    // rows) — a published-only view hides work in progress and makes
    // re-editing look like "no entry yet".
    // Gate on the chosen session: fetching at exam selection 403s for exams
    // this teacher isn't in and shows a raw error instead of the empty state.
    () => (mode === "session" && activeSession
      ? marksApi.examinationResults(examId, "entry")
      : Promise.resolve(null)),
    [mode, activeSession?.session_id]
  );
  const sessionMarksByStudent = useMemo(() => {
    const map = {};
    for (const r of sessionResults.data?.results || []) {
      for (const s of r.subjects || []) {
        if (s.examination_session_id === Number(sessionId)) map[r.student_id] = s;
      }
    }
    return map;
  }, [sessionResults.data, sessionId]);
  const sessionStudents = useApi(
    () => (mode === "session" && activeSession
      ? peopleApi.listStudents({ class_id: activeSession.class_id })
      : Promise.resolve([])),
    [activeSession?.session_id]
  );
  const sessionError = friendlyApiMessage(
    exams.error || examSessions.error || sessionResults.error || sessionStudents.error
  );

  async function saveSessionCell(studentId) {
    const raw = sessionDrafts[studentId];
    if (raw === undefined || raw === "") return;
    const existing = sessionMarksByStudent[studentId];
    const payload = { assessment_status: "present" };
    if (activeExam?.result_format_expectation === "grade") payload.grade_label = String(raw).trim();
    else payload.score = Number(raw);
    try {
      if (existing && existing.workflow_status === "draft") {
        await marksApi.updateSessionMark(existing.mark_id, payload);
        toast("Draft updated");
      } else if (!existing) {
        await marksApi.createSessionMark({
          session_id: Number(sessionId),
          student_id: studentId,
          subject_id: activeSession.subject_id,
          ...payload,
        });
        toast("Draft saved");
      } else {
        toast("Only drafts can change here");
        return;
      }
      setSessionDrafts((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      sessionResults.refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function saveSessionStatus(studentId, status) {
    const existing = sessionMarksByStudent[studentId];
    try {
      if (existing && existing.workflow_status === "draft") {
        await marksApi.updateSessionMark(existing.mark_id, { assessment_status: status });
        toast(`Marked ${status}`);
      } else if (!existing) {
        await marksApi.createSessionMark({
          session_id: Number(sessionId),
          student_id: studentId,
          subject_id: activeSession.subject_id,
          assessment_status: status,
        });
        toast(`Marked ${status}`);
      } else {
        toast("Only drafts can change here");
        return;
      }
      sessionResults.refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <TeacherShell>
      <div className="scr-title">Marks</div>
      <div className="scr-sub">
        {subjectsForSelectedClass.length
          ? `You can edit: ${subjectsForSelectedClass.map((id) => subjectName[id] || `Subj #${id}`).join(", ")}`
          : "You don't teach a subject in this class"}
      </div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={changeClass} />}

      <div className="meta" style={{ margin: "8px 0" }}>
        <button className={mode === "term" ? "btn primary sm" : "btn sm"} onClick={() => setMode("term")}>
          Term marks
        </button>
        <button className={mode === "session" ? "btn primary sm" : "btn sm"} onClick={() => setMode("session")}>
          Examination sessions
        </button>
      </div>

      {mode === "session" && (
        <div className="card">
          <ErrorBanner message={sessionError} />
          {!exams.loading && !exams.error && !(exams.data || []).length && (
            <Empty>No examinations scheduled yet.</Empty>
          )}
          <div className="grid2">
            <div className="field">
              <label>Examination</label>
              <Select value={examId} onChange={(e) => { setExamId(e.target.value); setSessionId(""); }} aria-label="Examination">
                <option value="">Select examination</option>
                {(exams.data || []).map((e) => (
                  <option key={e.exam_id} value={e.exam_id}>{e.name} · {e.status}</option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label>Session (your classes only)</label>
              <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)} aria-label="Session" disabled={!examId}>
                <option value="">Select session</option>
                {mySessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.date} · max {s.max_marks} · {s.status}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {examId && !examSessions.loading && !examSessions.error && !mySessions.length && (
            <Empty>No sessions for your classes in this examination.</Empty>
          )}
          {activeSession && (
            <>
              <div className="meta">
                <span>{activeExam?.result_format_expectation === "grade" ? "Grade entry" : `Scores out of ${activeSession.max_marks}`}</span>
                <button
                  className="btn primary sm"
                  onClick={async () => {
                    try {
                      const out = await marksApi.submitSessionMarks(activeSession.session_id);
                      toast(`Submitted${out.missing_student_ids?.length ? ` · missing: ${out.missing_student_ids.join(", ")}` : ""}`);
                      sessionResults.refetch();
                    } catch (err) {
                      toast(apiErrorMessage(err));
                    }
                  }}
                >
                  Submit session
                </button>
              </div>
              <div className="meta">
                <span>
                  Drafts stay editable here. Once submitted, marks are read-only for teachers —
                  publishing, corrections, and withholding are handled by admin.
                </span>
              </div>
              {sessionResults.loading && <Spinner />}
              {activeSession && !sessionResults.loading && !sessionStudents.loading
                && !sessionError && !(sessionStudents.data || []).length && (
                <Empty>No students in this class.</Empty>
              )}
              {(sessionStudents.data || []).map((s) => {
                const m = sessionMarksByStudent[s.student_id];
                const val = sessionDrafts[s.student_id] ?? (m?.assessment_status === "present" ? (m.score ?? "") : "");
                return (
                  <div key={s.student_id} className="listitem">
                    <div className="meta">
                      <b>{s.name}</b>
                      <span>{m ? `${m.assessment_status} · ${m.workflow_status}` : "no entry yet"}</span>
                    </div>
                    {(!m || m.workflow_status === "draft") && (
                      <>
                        <input
                          value={val}
                          onChange={(e) => setSessionDrafts({ ...sessionDrafts, [s.student_id]: e.target.value })}
                          onBlur={() => saveSessionCell(s.student_id)}
                          placeholder={activeExam?.result_format_expectation === "grade" ? "Grade" : "Score"}
                          className="score-input"
                          aria-label={`Mark for ${s.name}`}
                        />
                        <Select
                          value={m?.assessment_status || "present"}
                          onChange={(e) => saveSessionStatus(s.student_id, e.target.value)}
                          aria-label={`Status for ${s.name}`}
                        >
                          {SESSION_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                        </Select>
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {mode === "term" && loading && <Spinner />}
      {mode === "term" && <ErrorBanner message={friendlyApiMessage(error) || friendlyApiMessage(marksError)} />}
      {mode === "term" && !loading && !error && !marksError && (
        <div className="card white table-scroll">
          <table className="data-table">
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