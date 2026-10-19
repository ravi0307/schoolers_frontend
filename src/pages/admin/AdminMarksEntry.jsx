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
import Modal from "../../components/ui/Modal";
import { apiErrorMessage, friendlyApiMessage } from "../../api/client";

/**
 * Marks entry: pick an examination and session, enter scores or grades per
 * student, submit for review, then publish. Published marks change only
 * through corrections with a reason; withholding hides without deleting.
 * The grid uses the entry view so drafts and submitted rows are visible
 * with their workflow state, and every correction is auditable via History.
 */

const STATUSES = ["present", "absent", "missing", "exempt"];

function fmtTime(iso) {
  if (!iso) return "";
  return String(iso).replace("T", " ").slice(0, 16);
}

export default function AdminMarksEntry() {
  const exams = useApi(() => academicsApi.listExaminations(), []);
  const [examId, setExamId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [correcting, setCorrecting] = useState(null); // { mark, student }
  const [correctValue, setCorrectValue] = useState("");
  const [correctReason, setCorrectReason] = useState("");
  const [correctError, setCorrectError] = useState(null);
  const [history, setHistory] = useState(null); // { mark, student }
  const [importPreview, setImportPreview] = useState(null);
  const [applyPartial, setApplyPartial] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const [importResult, setImportResult] = useState(null); // commit receipt
  const [commitConfirm, setCommitConfirm] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // {submitted, missing_student_ids}
  const fileRef = useRef(null);
  const toast = useToast();

  function clearImportState() {
    setImportPreview(null);
    setImportNotice(null);
    setImportResult(null);
    setSubmitResult(null);
    setApplyPartial(false);
    setCommitConfirm(false);
  }

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
    // view=entry: drafts/submitted/withheld rows must show with their
    // workflow state — a published-only grid hides work in progress.
    () => (examId ? marksApi.examinationResults(examId, "entry") : Promise.resolve(null)),
    [examId, sessionId]
  );
  const gradeLevels = useApi(
    () => (exam?.result_format_expectation === "grade" && exam.grade_scale_id
      ? academicsApi.listGradeLevels(exam.grade_scale_id)
      : Promise.resolve([])),
    [exam?.grade_scale_id, exam?.result_format_expectation]
  );
  const gradeLabel = (levelId) =>
    (gradeLevels.data || []).find((l) => l.level_id === levelId)?.label
    || (levelId ? `#${levelId}` : "—");
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

  function openCorrect(mark, student) {
    setCorrecting({ mark, student });
    setCorrectValue("");
    setCorrectReason("");
    setCorrectError(null);
  }

  async function submitCorrection() {
    const c = correcting;
    if (!c) return;
    const value = correctValue.trim();
    const reason = correctReason.trim();
    if (!value) {
      setCorrectError("Enter the corrected value.");
      return;
    }
    if (!reason) {
      setCorrectError("A reason is required — it is stored in the audit history.");
      return;
    }
    const payload = { assessment_status: "present", reason };
    if (exam?.result_format_expectation === "grade") {
      payload.grade_label = value;
    } else {
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) {
        setCorrectError("Enter a valid score.");
        return;
      }
      if (session?.max_marks != null && n > session.max_marks) {
        setCorrectError(`Score must be between 0 and ${session.max_marks}.`);
        return;
      }
      payload.score = Math.round(n);
    }
    setBusy(true);
    try {
      await marksApi.correctMark(c.mark.mark_id, payload);
      setCorrecting(null);
      toast("Correction recorded — open History for the audit trail");
      results.refetch();
    } catch (err) {
      setCorrectError(friendlyApiMessage(apiErrorMessage(err)));
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

  async function downloadTemplate() {
    if (!sessionId || busy) return;
    setBusy(true);
    try {
      const text = await marksApi.importTemplate(sessionId);
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `marks-session-${sessionId}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Template downloaded — one row per active student");
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function downloadExport() {
    if (busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file) {
    if (!file || busy) return;
    setBusy(true);
    setImportNotice(null);
    setImportResult(null);
    setApplyPartial(false);
    try {
      const preview = await marksApi.previewImport(sessionId, file);
      setImportPreview(preview);
      const bad = preview.summary?.invalid || 0;
      const warn = preview.summary?.warning || 0;
      if (preview.status && preview.status !== "preview") {
        setImportNotice(
          `Batch ${preview.batch_id} was already processed (${preview.status}) — this exact file hashes to it, so a commit here only reports a duplicate receipt and writes nothing.`
        );
      } else if (bad) {
        setImportNotice(
          `${bad} invalid row(s)${warn ? ` and ${warn} warning(s)` : ""} — nothing is written yet. Fix the file and re-upload, or choose partial application below (admin only; invalid rows are skipped and reported, never written).`
        );
      } else {
        toast(warn ? `All rows valid, ${warn} warning(s) — review and commit` : "All rows valid — ready to commit");
      }
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function doCommit() {
    setCommitConfirm(false);
    if (!importPreview || busy) return;
    setBusy(true);
    setImportNotice(null);
    try {
      const receipt = await marksApi.commitImport(importPreview.batch_id, applyPartial);
      setImportResult(receipt);
      setImportPreview(null);
      setApplyPartial(false);
      if (receipt.duplicate_receipt) {
        toast("Already committed — duplicate receipt, no new writes");
      } else {
        toast(`Import applied: ${receipt.applied} row(s)`);
      }
      sessions.refetch();
      students.refetch();
      results.refetch();
      setDrafts({});
    } catch (err) {
      // Keep the preview on failure so the partial tick can be adjusted
      // and the commit retried without re-uploading the file.
      setImportNotice(friendlyApiMessage(apiErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  async function submitSession() {
    if (!session || busy) return;
    setBusy(true);
    try {
      const res = await marksApi.submitSessionMarks(session.session_id);
      setSubmitResult(res);
      toast(`Submitted ${res.submitted} draft(s) for review`);
      sessions.refetch();
      results.refetch();
      setDrafts({});
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const studentList = students.data || [];

  return (
    <AdminShell>
      <PageHeader title="Marks Entry" subtitle="Draft, submit, publish, correct" />
      {exams.loading && <Spinner />}
      <ErrorBanner message={friendlyApiMessage(exams.error)} />
      {!exams.loading && !exams.error && (
        <>
          <div className="card">
            <div className="grid2">
              <div className="field">
                <label>Examination</label>
                <Select value={examId} onChange={(e) => { setExamId(e.target.value); setSessionId(""); clearImportState(); }} aria-label="Examination">
                  <option value="">Select examination</option>
                  {(exams.data || []).map((e) => (
                    <option key={e.exam_id} value={e.exam_id}>{e.name} · {e.status}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label>Session</label>
                <Select value={sessionId} onChange={(e) => { setSessionId(e.target.value); clearImportState(); }} aria-label="Session" disabled={!examId}>
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
                <button className="btn sm primary" disabled={busy} onClick={submitSession}>
                  Submit session
                </button>
                <button className="btn sm primary" disabled={busy} onClick={() => run(
                  () => marksApi.publishSessionMarks(session.session_id), "Published"
                )}>
                  Publish
                </button>
                <button className="btn sm" disabled={busy} onClick={downloadTemplate}>Template CSV</button>
                <button className="btn sm" disabled={busy} onClick={downloadExport}>Export CSV</button>
                <label className="btn sm">
                  Import CSV
                  <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => uploadFile(e.target.files[0])} />
                </label>
              </div>
            )}
            {submitResult && (
              <div className="meta">
                <span>
                  Submitted {submitResult.submitted} mark(s)
                  {submitResult.missing_student_ids?.length
                    ? ` · no entry for ${submitResult.missing_student_ids.length} student(s): ${
                        submitResult.missing_student_ids
                          .map((id) => studentList.find((s) => s.student_id === id)?.name || `#${id}`)
                          .join(", ")
                      }`
                    : " · every student has an entry"}
                </span>
                <button className="btn sm" onClick={() => setSubmitResult(null)}>Dismiss</button>
              </div>
            )}
          </div>

          {importPreview && (
            <div className="card">
              <div className="section-label">
                Import preview · batch #{importPreview.batch_id}: {importPreview.summary?.valid || 0} valid, {importPreview.summary?.invalid || 0} invalid, {importPreview.summary?.warning || 0} warning
                {importPreview.status && importPreview.status !== "preview" ? ` · ${importPreview.status}` : ""}
              </div>
              <ErrorBanner message={importNotice} />
              {(importPreview.rows || []).filter((r) => r.verdict !== "valid").map((r) => (
                <div key={r.row_no} className="meta">
                  <span>Row {r.row_no} [{r.verdict}]: {(r.errors || []).join("; ")}</span>
                </div>
              ))}
              <div className="meta">
                <span>
                  Nothing is written until Commit. All-or-nothing refuses while any row
                  is invalid; partial application (admin) applies valid rows and skips
                  invalid ones — skipped rows appear in the receipt and never write.
                </span>
              </div>
              <div className="meta">
                <label>
                  <input
                    type="checkbox"
                    checked={applyPartial}
                    disabled={(importPreview.summary?.invalid || 0) === 0}
                    onChange={(e) => setApplyPartial(e.target.checked)}
                  />
                  {" "}Apply valid rows only, skip invalid (admin)
                </label>
                <button
                  className="btn primary sm"
                  disabled={busy || ((importPreview.summary?.invalid || 0) > 0 && !applyPartial)}
                  onClick={() => setCommitConfirm(true)}
                >
                  Commit
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => { setImportPreview(null); setImportNotice(null); setApplyPartial(false); }}
                >
                  Discard preview
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className="card">
              <div className="section-label">Import result</div>
              <div className="meta">
                <span>
                  Applied {importResult.applied} · updated drafts {importResult.updated_drafts} · skipped {importResult.skipped}
                  {importResult.duplicate_receipt ? " · duplicate receipt — already committed, no new writes" : ""}
                </span>
                <button className="btn sm" onClick={() => setImportResult(null)}>Dismiss</button>
              </div>
              {importResult.skipped > 0 && (
                <div className="meta">
                  <span>{importResult.skipped} row(s) were invalid or stale and were not written — re-upload a fixed file for them.</span>
                </div>
              )}
            </div>
          )}

          {session && (
            <div className="card">
              <div className="section-label">
                Students · {exam?.result_format_expectation === "grade" ? "grade entry" : `scores out of ${session.max_marks}`}
              </div>
              {students.loading && <Spinner />}
              <ErrorBanner message={friendlyApiMessage(students.error) || friendlyApiMessage(results.error)} />
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
                          onClick={() => openCorrect(m, s)}
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
                    {m && (
                      <button
                        className="btn sm"
                        onClick={() => setHistory({ mark: m, student: s })}
                      >
                        History
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {correcting && (
        <Modal onClose={() => setCorrecting(null)} titleId="correct-mark-title">
          <div className="confirm-title" id="correct-mark-title">Correct published mark</div>
          <div className="confirm-message">
            <b>{correcting.student.name}</b>
            {" · current: "}
            {exam?.result_format_expectation === "grade"
              ? `grade ${gradeLabel(correcting.mark.grade_level_id)}`
              : correcting.mark.score != null
                ? `${correcting.mark.score}/${correcting.mark.max_marks ?? session?.max_marks ?? 100}`
                : correcting.mark.assessment_status}
            {" → new value below. The original stays in history."}
          </div>
          <div className="field">
            <label>
              Corrected value (
              {exam?.result_format_expectation === "grade"
                ? "grade label"
                : `0–${session?.max_marks ?? 100}`}
              )
            </label>
            <input
              value={correctValue}
              onChange={(e) => setCorrectValue(e.target.value)}
              aria-label="Corrected value"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Reason (required — kept in the audit history)</label>
            <textarea
              value={correctReason}
              onChange={(e) => setCorrectReason(e.target.value)}
              rows={2}
              aria-label="Correction reason"
            />
          </div>
          <div className="confirm-message">
            Self-approval: as an admin you approve your own correction —
            no second approver exists under the current policy. Both the
            correction and approval timestamps are recorded.
          </div>
          <ErrorBanner message={correctError} />
          <div className="confirm-actions">
            <button className="btn ghost" type="button" onClick={() => setCorrecting(null)}>Cancel</button>
            <button className="btn primary" type="button" disabled={busy} onClick={submitCorrection}>
              Record correction
            </button>
          </div>
        </Modal>
      )}
      {history && (
        <CorrectionHistoryModal
          mark={history.mark}
          student={history.student}
          exam={exam}
          onClose={() => setHistory(null)}
        />
      )}
      <ConfirmDialog
        open={commitConfirm}
        title="Commit import"
        destructive={false}
        confirmLabel="Commit"
        message={
          !importPreview
            ? ""
            : applyPartial
              ? `Partial commit: apply ${importPreview.summary?.valid || 0} valid row(s) to session ${sessionId} and skip ${importPreview.summary?.invalid || 0} invalid row(s)? Skipped rows stay in the receipt and are never written.`
              : `Commit ${importPreview.summary?.valid || 0} valid row(s) to session ${sessionId}? Nothing is written yet — drafts update, published rows are left alone.`
        }
        onCancel={() => setCommitConfirm(false)}
        onConfirm={doCommit}
      />
    </AdminShell>
  );
}

function CorrectionHistoryModal({ mark, student, exam, onClose }) {
  const trail = useApi(() => marksApi.listCorrections(mark.mark_id), [mark.mark_id]);
  const gradeFmt = exam?.result_format_expectation === "grade";
  return (
    <Modal onClose={onClose} titleId="correction-history-title">
      <div className="confirm-title" id="correction-history-title">
        Correction history · {student.name}
      </div>
      {trail.loading && <Spinner />}
      <ErrorBanner message={friendlyApiMessage(trail.error)} />
      {!trail.loading && !trail.error && !(trail.data || []).length && (
        <div className="confirm-message">
          No corrections yet — this mark has never been changed after publication.
        </div>
      )}
      {!trail.loading && !trail.error && (trail.data || []).map((c) => (
        <div key={c.correction_id} className="confirm-message">
          <div className="meta">
            <b>
              {gradeFmt
                ? `${c.old_grade ?? "—"} → ${c.new_grade ?? "—"}`
                : `${c.old_score ?? "—"} → ${c.new_score ?? "—"}`}
            </b>
            <span>{c.reason}</span>
          </div>
          <div className="meta">
            <span>
              Corrected by {c.corrected_by_name || `#${c.corrected_by}`} at {fmtTime(c.corrected_at)}
              {" · approved "}
              {c.approved_at
                ? `by ${c.approved_by_name || `#${c.approved_by}`} at ${fmtTime(c.approved_at)}`
                : "— (recorded before the audit fix; approval time unavailable)"}
            </span>
          </div>
        </div>
      ))}
      <div className="confirm-actions">
        <button className="btn ghost" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
