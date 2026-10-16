import { useMemo, useRef, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as marksApi from "../../api/marks";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { apiErrorMessage } from "../../api/client";

/**
 * Marks entry: pick an examination and session, enter scores or grades per
 * student, submit for review, then publish. Published marks change only
 * through corrections with a reason; withholding hides without deleting.
 */

const STATUSES = ["present", "absent", "missing", "exempt"];

export default function AdminMarksEntry() {
  const exams = useApi(() => academicsApi.listExaminations(), []);
  const [examId, setExamId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [applyPartial, setApplyPartial] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();

  const sessions = useApi(
    () => (examId ? academicsApi.listExaminationSessions(examId) : Promise.resolve([])),
    [examId]
  );
  const session = (sessions.data || []).find((s) => s.session_id === Number(sessionId));
  const exam = (exams.data || []).find((e) => e.exam_id === Number(examId));
  const students = useApi(
    () => (session ? peopleApi.listStudents({ class_id: session.class_id }) : Promise.resolve([])),
    [session?.session_id]
  );
  const results = useApi(
    () => (examId ? marksApi.examinationResults(examId) : Promise.resolve(null)),
    [examId, sessionId]
  );
  const [drafts, setDrafts] = useState({});

  const marksByStudent = useMemo(() => {
    const map = {};
    for (const r of results.data?.results || []) {
      for (const s of r.subjects || []) {
        if (s.examination_session_id === Number(sessionId)) map[r.student_id] = s;
      }
    }
    return map;
  }, [results.data, sessionId]);

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast(message);
      sessions.refetch();
      students.refetch();
      results.refetch();
      setDrafts({});
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function cellValue(studentId) {
    if (drafts[studentId] !== undefined) return drafts[studentId];
    const m = marksByStudent[studentId];
    if (!m || m.assessment_status !== "present") return "";
    return m.score ?? "";
  }

  async function saveCell(studentId) {
    const raw = drafts[studentId];
    if (raw === undefined || raw === "") return;
    const existing = marksByStudent[studentId];
    const payload = { assessment_status: "present" };
    if (exam?.result_format_expectation === "grade") payload.grade_label = String(raw).trim();
    else payload.score = Number(raw);
    if (existing && existing.workflow_status === "draft") {
      await run(() => marksApi.updateSessionMark(existing.mark_id, payload), "Draft updated");
    } else if (!existing) {
      await run(
        () => marksApi.createSessionMark({
          session_id: Number(sessionId),
          student_id: studentId,
          subject_id: session.subject_id,
          ...payload,
        }),
        "Draft saved"
      );
    } else {
      toast("Submitted marks return to draft on edit; published marks need a correction");
    }
  }

  async function markStatus(studentId, status) {
    const existing = marksByStudent[studentId];
    const payload = { assessment_status: status };
    if (existing && existing.workflow_status === "draft") {
      await run(() => marksApi.updateSessionMark(existing.mark_id, payload), `Marked ${status}`);
    } else if (!existing) {
      await run(
        () => marksApi.createSessionMark({
          session_id: Number(sessionId),
          student_id: studentId,
          subject_id: session.subject_id,
          ...payload,
        }),
        `Marked ${status}`
      );
    } else {
      toast("Only drafts can change status here");
    }
  }

  async function downloadExport() {
    try {
      const text = await marksApi.exportSessionMarks(sessionId);
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `marks-session-${sessionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function uploadFile(file) {
    if (!file) return;
    setBusy(true);
    try {
      const preview = await marksApi.previewImport(sessionId, file);
      setImportPreview(preview);
      const bad = (preview.rows || []).filter((r) => r.verdict === "invalid").length;
      toast(bad ? `${bad} invalid rows — fix the file or commit partial as admin` : "All rows valid — ready to commit");
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const studentList = students.data || [];

  return (
    <AdminShell>
      <PageHeader title="Marks Entry" subtitle="Draft, submit, publish, correct" />
      {exams.loading && <Spinner />}
      <ErrorBanner message={exams.error} />
      {!exams.loading && !exams.error && (
        <>
          <div className="card">
            <div className="grid2">
              <div className="field">
                <label>Examination</label>
                <Select value={examId} onChange={(e) => { setExamId(e.target.value); setSessionId(""); setImportPreview(null); }} aria-label="Examination">
                  <option value="">Select examination</option>
                  {(exams.data || []).map((e) => (
                    <option key={e.exam_id} value={e.exam_id}>{e.name} · {e.status}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label>Session</label>
                <Select value={sessionId} onChange={(e) => { setSessionId(e.target.value); setImportPreview(null); }} aria-label="Session" disabled={!examId}>
                  <option value="">Select session</option>
                  {(sessions.data || []).map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.date} · max {s.max_marks} · {s.status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {session && (
              <div className="meta">
                <button className="btn sm primary" disabled={busy} onClick={() => run(
                  () => marksApi.submitSessionMarks(session.session_id), "Submitted for review (missing students listed in response)"
                )}>
                  Submit session
                </button>
                <button className="btn sm primary" disabled={busy} onClick={() => run(
                  () => marksApi.publishSessionMarks(session.session_id), "Published"
                )}>
                  Publish
                </button>
                <button className="btn sm" disabled={busy} onClick={downloadExport}>Export CSV</button>
                <label className="btn sm">
                  Import CSV
                  <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => uploadFile(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>

          {importPreview && (
            <div className="card">
              <div className="section-label">
                Import preview: {(importPreview.summary?.valid || 0)} valid, {(importPreview.summary?.invalid || 0)} invalid
              </div>
              {(importPreview.rows || []).filter((r) => r.verdict !== "valid").map((r) => (
                <div key={r.row_no} className="meta">
                  <span>Row {r.row_no}: {(r.errors || []).join("; ")}</span>
                </div>
              ))}
              <div className="meta">
                <label>
                  <input type="checkbox" checked={applyPartial} onChange={(e) => setApplyPartial(e.target.checked)} />
                  {" "}Apply valid rows only (admin partial commit)
                </label>
                <button
                  className="btn primary sm"
                  disabled={busy}
                  onClick={() => run(
                    () => marksApi.commitImport(importPreview.batch_id, applyPartial)
                      .then(() => setImportPreview(null)),
                    "Import committed"
                  )}
                >
                  Commit
                </button>
              </div>
            </div>
          )}

          {session && (
            <div className="card">
              <div className="section-label">
                Students · {exam?.result_format_expectation === "grade" ? "grade entry" : `scores out of ${session.max_marks}`}
              </div>
              {students.loading && <Spinner />}
              <ErrorBanner message={students.error || results.error} />
              {!students.loading && !studentList.length && <Empty>No students in this class.</Empty>}
              {studentList.map((s) => {
                const m = marksByStudent[s.student_id];
                return (
                  <div key={s.student_id} className="listitem">
                    <div className="meta">
                      <b>{s.name}</b>
                      <span>
                        {m ? `${m.assessment_status} · ${m.workflow_status}${m.is_withheld ? " · withheld" : ""}` : "no entry yet"}
                        {m?.assessment_status === "present" && m.score != null ? ` · ${m.score}/${m.max_marks}` : ""}
                      </span>
                    </div>
                    {(!m || m.workflow_status === "draft") && (
                      <>
                        <input
                          value={cellValue(s.student_id)}
                          onChange={(e) => setDrafts({ ...drafts, [s.student_id]: e.target.value })}
                          onBlur={() => saveCell(s.student_id)}
                          placeholder={exam?.result_format_expectation === "grade" ? "Grade" : "Score"}
                          className="score-input"
                          aria-label={`Mark for ${s.name}`}
                        />
                        <Select
                          value={m?.assessment_status || "present"}
                          onChange={(e) => markStatus(s.student_id, e.target.value)}
                          aria-label={`Status for ${s.name}`}
                        >
                          {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                        </Select>
                      </>
                    )}
                    {m?.workflow_status === "published" && !m.is_withheld && (
                      <>
                        <button
                          className="btn sm"
                          disabled={busy}
                          onClick={() => run(
                            () => marksApi.withholdMarks([m.mark_id], "Withheld by admin"),
                            "Withheld (reversible, row preserved)"
                          )}
                        >
                          Withhold
                        </button>
                        <button
                          className="btn sm"
                          disabled={busy}
                          onClick={() => setConfirming({ kind: "correct", mark: m, student: s })}
                        >
                          Correct
                        </button>
                      </>
                    )}
                    {m?.is_withheld && (
                      <button
                        className="btn sm"
                        disabled={busy}
                        onClick={() => run(() => marksApi.unwithholdMarks([m.mark_id]), "Withholding lifted")}
                      >
                        Unwithhold
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!confirming}
        title="Correct published mark"
        message={confirming ? `Enter the corrected value for ${confirming.student.name}. The original stays auditable.` : ""}
        confirmLabel="Correct"
        destructive={false}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const c = confirming;
          setConfirming(null);
          if (!c) return;
          const raw = window.prompt(`Corrected value (${exam?.result_format_expectation === "grade" ? "grade" : `0–${session.max_marks}`}):`, "");
          if (raw === null || raw === "") return;
          const reason = window.prompt("Reason (recorded in history):", "");
          if (reason === null || !reason.trim()) {
            toast("A reason is required");
            return;
          }
          const payload = { assessment_status: "present", reason: reason.trim() };
          if (exam?.result_format_expectation === "grade") payload.grade_label = raw.trim();
          else payload.score = Number(raw);
          run(() => marksApi.correctMark(c.mark.mark_id, payload), "Correction recorded");
        }}
      />
    </AdminShell>
  );
}
