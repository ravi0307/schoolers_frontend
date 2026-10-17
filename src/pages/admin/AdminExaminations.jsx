import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog, Pill } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import DatePicker from "../../components/ui/DatePicker";
import Select from "../../components/ui/Select";
import { apiErrorMessage } from "../../api/client";

/**
 * Examinations: draft an exam, attach class/subject sessions with real
 * dates and venues, publish the timetable, and amend it with version
 * history. Cancelling preserves every row; nothing here deletes results.
 */

const EMPTY_EXAM = { type_id: "", year_id: "", period_id: "", name: "", description: "" };
const EMPTY_SESSION = { class_id: "", subject_id: "", date: "", start_time: "", end_time: "", venue: "", max_marks: 100 };

export default function AdminExaminations() {
  const years = useApi(() => academicsApi.listAcademicYears(), []);
  const types = useApi(() => academicsApi.listExaminationTypes(), []);
  const classes = useApi(() => academicsApi.listClasses(), []);
  const subjects = useApi(() => academicsApi.listSubjects(), []);
  const [yearFilter, setYearFilter] = useState("");
  const exams = useApi(
    () => academicsApi.listExaminations(yearFilter || undefined),
    [yearFilter]
  );
  const [examDraft, setExamDraft] = useState(EMPTY_EXAM);
  const [openExam, setOpenExam] = useState(null);
  const [sessionDraft, setSessionDraft] = useState(EMPTY_SESSION);
  const [sessionReason, setSessionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [showVersions, setShowVersions] = useState(null);
  const toast = useToast();

  const sessions = useApi(
    () => (openExam ? academicsApi.listExaminationSessions(openExam) : Promise.resolve([])),
    [openExam]
  );
  const timetable = useApi(
    () => academicsApi.examinationTimetable(yearFilter ? { year_id: Number(yearFilter) } : {}),
    [yearFilter, openExam, exams.data]
  );
  const versions = useApi(
    () => (showVersions ? academicsApi.listSessionVersions(showVersions) : Promise.resolve([])),
    [showVersions]
  );

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast(message);
      years.refetch();
      types.refetch();
      exams.refetch();
      sessions.refetch();
      timetable.refetch();
      versions.refetch();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const openExamRow = (exams.data || []).find((e) => e.exam_id === Number(openExam));
  const className = (id) => (classes.data || []).find((c) => c.class_id === Number(id))?.name || `Class #${id}`;
  const subjectName = (id) => (subjects.data || []).find((s) => s.subject_id === Number(id))?.name || `Subject #${id}`;

  return (
    <AdminShell>
      <PageHeader title="Examinations" subtitle="Draft, schedule, publish, and amend" />
      {exams.loading && <Spinner />}
      <ErrorBanner message={exams.error || years.error || types.error} />
      {!exams.loading && !exams.error && (
        <>
          <div className="card">
            <div className="section-label">New examination (saved as draft)</div>
            <form
              className="grid2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!examDraft.type_id || !examDraft.year_id || !examDraft.name.trim()) {
                  toast("Choose a type, a year, and name the examination");
                  return;
                }
                run(
                  () => academicsApi.createExamination({
                    type_id: Number(examDraft.type_id),
                    year_id: Number(examDraft.year_id),
                    period_id: examDraft.period_id ? Number(examDraft.period_id) : undefined,
                    name: examDraft.name.trim(),
                    description: examDraft.description.trim() || undefined,
                  }).then(() => setExamDraft(EMPTY_EXAM)),
                  "Draft examination created"
                );
              }}
            >
              <div className="field">
                <label>Name</label>
                <input value={examDraft.name} onChange={(e) => setExamDraft({ ...examDraft, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Type</label>
                <Select value={examDraft.type_id} onChange={(e) => setExamDraft({ ...examDraft, type_id: e.target.value })} aria-label="Examination type">
                  <option value="">Select type</option>
                  {(types.data || []).filter((t) => t.is_active).map((t) => (
                    <option key={t.type_id} value={t.type_id}>{t.name} (max {t.default_max_marks})</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label>Academic year</label>
                <Select value={examDraft.year_id} onChange={(e) => setExamDraft({ ...examDraft, year_id: e.target.value })} aria-label="Academic year">
                  <option value="">Select year</option>
                  {(years.data || []).filter((y) => y.is_active).map((y) => (
                    <option key={y.year_id} value={y.year_id}>{y.name}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <input value={examDraft.description} onChange={(e) => setExamDraft({ ...examDraft, description: e.target.value })} />
              </div>
              <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Create draft</button></div>
            </form>
          </div>

          <div className="card">
            <div className="section-label">Examinations</div>
            <div className="field">
              <label>Filter by year</label>
              <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} aria-label="Filter by year">
                <option value="">All years</option>
                {(years.data || []).map((y) => <option key={y.year_id} value={y.year_id}>{y.name}</option>)}
              </Select>
            </div>
            {!(exams.data || []).length && <Empty>No examinations yet.</Empty>}
            {(exams.data || []).map((exam) => (
              <div key={exam.exam_id} className="listitem">
                <div className="meta">
                  <b>{exam.name}</b>
                  <span><Pill tone={exam.status === "published" ? "ok" : exam.status === "cancelled" ? "bad" : "mute"}>{exam.status}</Pill></span>
                </div>
                <button className="btn sm" onClick={() => { setOpenExam(openExam === exam.exam_id ? null : exam.exam_id); setShowVersions(null); }}>
                  {openExam === exam.exam_id ? "Close" : "Sessions"}
                </button>
                {exam.status === "draft" && (
                  <button className="btn primary sm" disabled={busy} onClick={() => run(
                    () => academicsApi.publishExamination(exam.exam_id),
                    "Examination published (empty drafts cannot publish)"
                  )}>
                    Publish
                  </button>
                )}
                {exam.status === "published" && (
                  <button className="btn sm" disabled={busy} onClick={() => run(
                    () => academicsApi.unpublishExamination(exam.exam_id),
                    "Back to draft"
                  )}>
                    Unpublish
                  </button>
                )}
                {exam.status !== "cancelled" && (
                  <button className="btn sm" disabled={busy} onClick={() => setConfirming({ kind: "cancel", exam })}>Cancel</button>
                )}
                {exam.status === "draft" && (
                  <button className="btn sm" disabled={busy} onClick={() => setConfirming({ kind: "delete", exam })}>Delete</button>
                )}
              </div>
            ))}
          </div>

          {openExamRow && (
            <div className="card">
              <div className="section-label">Sessions in {openExamRow.name}</div>
              {sessions.loading && <Spinner />}
              <ErrorBanner message={sessions.error} />
              {!(sessions.data || []).length && !sessions.loading && <Empty>No sessions scheduled.</Empty>}
              {(sessions.data || []).map((s) => (
                <div key={s.session_id} className="listitem">
                  <div className="meta">
                    <b>{className(s.class_id)} · {subjectName(s.subject_id)}</b>
                    <span>{s.date} {s.start_time}–{s.end_time} · {s.venue || "no venue"} · max {s.max_marks} · <Pill tone={s.status === "cancelled" ? "bad" : "mute"}>{s.status}</Pill></span>
                  </div>
                  <button className="btn sm" onClick={() => setShowVersions(showVersions === s.session_id ? null : s.session_id)}>History</button>
                </div>
              ))}
              {showVersions && (
                <div className="card">
                  <div className="section-label">Amendment history</div>
                  {versions.loading && <Spinner />}
                  {!(versions.data || []).length && !versions.loading && <Empty>No amendments recorded.</Empty>}
                  {(versions.data || []).map((v) => (
                    <div key={v.version_id} className="meta">
                      <span>{v.changed_at || ""} · {v.reason || "no reason recorded"}</span>
                    </div>
                  ))}
                </div>
              )}
              <form
                className="grid2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!sessionDraft.class_id || !sessionDraft.subject_id || !sessionDraft.date || !sessionDraft.start_time || !sessionDraft.end_time) {
                    toast("Choose a class, subject, date, and times");
                    return;
                  }
                  run(
                    () => academicsApi.createExaminationSession(openExam, {
                      class_id: Number(sessionDraft.class_id),
                      subject_id: Number(sessionDraft.subject_id),
                      date: sessionDraft.date,
                      start_time: sessionDraft.start_time,
                      end_time: sessionDraft.end_time,
                      venue: sessionDraft.venue.trim() || undefined,
                      max_marks: Number(sessionDraft.max_marks) || 100,
                    }).then((res) => {
                      setSessionDraft(EMPTY_SESSION);
                      (res.warnings || []).forEach((w) => toast(w));
                    }),
                    "Session scheduled (conflicts with published sessions are refused)"
                  );
                }}
              >
                <div className="field">
                  <label>Class</label>
                  <Select value={sessionDraft.class_id} onChange={(e) => setSessionDraft({ ...sessionDraft, class_id: e.target.value })} aria-label="Class">
                    <option value="">Select class</option>
                    {(classes.data || []).map((c) => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                  </Select>
                </div>
                <div className="field">
                  <label>Subject</label>
                  <Select value={sessionDraft.subject_id} onChange={(e) => setSessionDraft({ ...sessionDraft, subject_id: e.target.value })} aria-label="Subject">
                    <option value="">Select subject</option>
                    {(subjects.data || []).map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
                  </Select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <DatePicker type="date" value={sessionDraft.date} onChange={(e) => setSessionDraft({ ...sessionDraft, date: e.target.value })} aria-label="Session date" />
                </div>
                <div className="field">
                  <label>Start time</label>
                  <input type="time" value={sessionDraft.start_time} onChange={(e) => setSessionDraft({ ...sessionDraft, start_time: e.target.value })} />
                </div>
                <div className="field">
                  <label>End time</label>
                  <input type="time" value={sessionDraft.end_time} onChange={(e) => setSessionDraft({ ...sessionDraft, end_time: e.target.value })} />
                </div>
                <div className="field">
                  <label>Venue (optional)</label>
                  <input value={sessionDraft.venue} onChange={(e) => setSessionDraft({ ...sessionDraft, venue: e.target.value })} />
                </div>
                <div className="field">
                  <label>Max marks</label>
                  <input type="number" min="1" value={sessionDraft.max_marks} onChange={(e) => setSessionDraft({ ...sessionDraft, max_marks: e.target.value })} />
                </div>
                {openExamRow.status !== "draft" && (
                  <div className="field">
                    <label>Reason (required, schedule is published)</label>
                    <input value={sessionReason} onChange={(e) => setSessionReason(e.target.value)} placeholder="Why is this session added?" />
                  </div>
                )}
                <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add session</button></div>
              </form>
              <div className="meta"><span>Rescheduling a published session needs a reason and is versioned. Session edits happen from the timetable below in a later iteration; use cancel + re-add for now.</span></div>
            </div>
          )}

          <div className="card">
            <div className="section-label">Timetable{yearFilter ? "" : " (all years)"}</div>
            {timetable.loading && <Spinner />}
            {!(timetable.data || []).length && !timetable.loading && <Empty>Nothing scheduled.</Empty>}
            {(timetable.data || []).map((row) => (
              <div key={row.session_id} className="listitem">
                <div className="meta">
                  <b>{row.date} {row.start_time}–{row.end_time} · {row.class_name}</b>
                  <span>{row.exam_name} · {row.subject_name} · {row.venue || "no venue"} · {row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!confirming}
        title={confirming?.kind === "delete" ? "Delete draft" : "Cancel examination"}
        message={
          confirming?.kind === "delete"
            ? `Delete draft "${confirming?.exam.name}" and its sessions?`
            : `Cancel "${confirming?.exam.name}"? Sessions flip to cancelled with version history; results are preserved, never deleted.`
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const c = confirming;
          setConfirming(null);
          if (!c) return;
          if (c.kind === "delete") {
            run(() => academicsApi.deleteExamination(c.exam.exam_id), "Draft deleted");
          } else {
            const reason = window.prompt("Reason for cancellation (recorded in history):", "");
            if (reason === null) return;
            if (!reason.trim()) {
              toast("A reason is required");
              return;
            }
            run(() => academicsApi.cancelExamination(c.exam.exam_id, reason.trim()), "Examination cancelled");
          }
        }}
      />
    </AdminShell>
  );
}
