import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as marksApi from "../../api/marks";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { apiErrorMessage } from "../../api/client";

/**
 * Published results: per-examination student rows with the missing list,
 * plus per-student lookup across examinations and legacy terms. Drafts,
 * unpublished, and withheld rows never appear here.
 */

export default function AdminExamResults() {
  const exams = useApi(() => academicsApi.listExaminations(), []);
  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentView, setStudentView] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const examResults = useApi(
    () => (examId ? marksApi.examinationResults(examId) : Promise.resolve(null)),
    [examId]
  );

  async function lookupStudent() {
    if (!studentId.trim()) {
      toast("Enter a student ID");
      return;
    }
    setBusy(true);
    try {
      const out = await marksApi.studentResults(studentId.trim());
      setStudentView(out);
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Results" subtitle="Published results only" />
      {exams.loading && <Spinner />}
      <ErrorBanner message={exams.error} />
      {!exams.loading && !exams.error && (
        <>
          <div className="card">
            <div className="section-label">By examination</div>
            <div className="field">
              <label>Examination</label>
              <Select value={examId} onChange={(e) => setExamId(e.target.value)} aria-label="Examination">
                <option value="">Select examination</option>
                {(exams.data || []).map((e) => (
                  <option key={e.exam_id} value={e.exam_id}>{e.name} · {e.status}</option>
                ))}
              </Select>
            </div>
            {examId && (
              <>
                {examResults.loading && <Spinner />}
                <ErrorBanner message={examResults.error} />
                {!examResults.loading && examResults.data && (
                  <>
                    {(examResults.data.results || []).map((r) => (
                      <div key={r.student_id} className="listitem">
                        <div className="meta">
                          <b>Student #{r.student_id}</b>
                          <span>
                            {r.possible > 0
                              ? `${r.obtained}/${r.possible} (${r.percentage}%)`
                              : "no numerical total"}
                            {r.incomplete ? " · Incomplete" : ""}
                            {r.subjects?.some((s) => s.grade_level_id) ? " · graded" : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!(examResults.data.results || []).length && <Empty>No published results yet.</Empty>}
                    {(examResults.data.missing_student_ids || []).length > 0 && (
                      <div className="meta">
                        <span>Missing: student #{examResults.data.missing_student_ids.join(", student #")} have no published marks here</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="section-label">By student</div>
            <div className="grid2">
              <div className="field">
                <label>Student ID</label>
                <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 12" />
              </div>
              <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy} onClick={lookupStudent}>Look up</button></div>
            </div>
            {studentView && (
              <>
                {(studentView.examinations || []).map((exam) => (
                  <div key={exam.exam_id} className="listitem">
                    <div className="meta">
                      <b>{exam.name}</b>
                      <span>
                        {exam.possible > 0 ? `${exam.obtained}/${exam.possible} (${exam.percentage}%)` : "grade-based"}
                        {exam.grade ? ` · Grade ${exam.grade.label}` : ""}
                        {exam.incomplete ? " · Incomplete" : ""}
                        {exam.grade_distribution ? ` · ${Object.entries(exam.grade_distribution).map(([g, n]) => `${g}: ${n}`).join(", ")}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {(studentView.legacy_terms || []).map((t) => (
                  <div key={t.term} className="listitem">
                    <div className="meta">
                      <b>Earlier terms · {t.term}</b>
                      <span>{t.obtained}/{t.possible} ({t.percentage}%) <Pill tone="mute">legacy</Pill></span>
                    </div>
                  </div>
                ))}
                {studentView.aggregate && studentView.aggregate.scope !== "grade-only" && studentView.aggregate.possible > 0 && (
                  <div className="meta">
                    <b>Overall: {studentView.aggregate.obtained}/{studentView.aggregate.possible} ({studentView.aggregate.percentage}%)</b>
                    {studentView.aggregate.incomplete && <span> · Incomplete</span>}
                  </div>
                )}
                {!studentView.examinations?.length && !studentView.legacy_terms?.length && (
                  <Empty>No published results for this student.</Empty>
                )}
              </>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
