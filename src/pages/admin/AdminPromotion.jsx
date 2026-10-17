import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { apiErrorMessage } from "../../api/client";

/**
 * Promotion and carry-forward: founding-year reconciliation, bulk moves
 * with preview and transactional commit, subject offerings per class, and
 * per-student subject enrollment. History is never rewritten: promotion
 * writes enrollment rows and updates the class cache in one transaction.
 */

export default function AdminPromotion() {
  const years = useApi(() => academicsApi.listAcademicYears(), []);
  const classes = useApi(() => academicsApi.listClasses(), []);
  const subjects = useApi(() => academicsApi.listSubjects(), []);
  const batches = useApi(() => peopleApi.listPromotionBatches(), []);
  const [sourceYear, setSourceYear] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [classMap, setClassMap] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [offerClass, setOfferClass] = useState("");
  const [enrollStudent, setEnrollStudent] = useState("");
  const [enrollYear, setEnrollYear] = useState("");
  const [batchDetail, setBatchDetail] = useState(null);
  const toast = useToast();

  const offerings = useApi(
    () => (offerClass ? academicsApi.listClassOfferings(offerClass) : Promise.resolve([])),
    [offerClass]
  );
  const studentSubjects = useApi(
    () => (enrollStudent && enrollYear
      ? academicsApi.listStudentSubjects(enrollStudent, enrollYear)
      : Promise.resolve([])),
    [enrollStudent, enrollYear]
  );

  async function run(action, message) {
    setBusy(true);
    try {
      const out = await action();
      toast(message);
      batches.refetch();
      offerings.refetch();
      studentSubjects.refetch();
      return out;
    } catch (err) {
      toast(apiErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const className = (id) => (classes.data || []).find((c) => String(c.class_id) === String(id))?.name || `#${id}`;
  const subjectName = (id) => (subjects.data || []).find((s) => String(s.subject_id) === String(id))?.name || `#${id}`;

  async function doPreview() {
    if (!targetYear) {
      toast("Choose the target year first");
      return;
    }
    setBusy(true);
    try {
      const map = Object.entries(classMap)
        .filter(([, to]) => to)
        .map(([from_class_id, to_class_id]) => ({ from_class_id: Number(from_class_id), to_class_id: Number(to_class_id) }));
      const out = await peopleApi.previewPromotion({
        source_year_id: sourceYear ? Number(sourceYear) : null,
        target_year_id: Number(targetYear),
        class_map: map,
      });
      setPreview(out);
      const suffix = out.exceptions?.length ? ` · ${out.exceptions.length} need attention` : "";
      toast(`Preview ready: ${out.proposed?.length || 0} proposed${suffix}`);
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doCommit() {
    if (!preview?.proposed?.length) {
      toast("Preview first — nothing to commit");
      return;
    }
    const key = `promotion-${targetYear}-${Date.now()}`;
    const out = await run(
      () => peopleApi.commitPromotion({
        source_year_id: sourceYear ? Number(sourceYear) : null,
        target_year_id: Number(targetYear),
        assignments: preview.proposed
          .filter((r) => r.to_class_id)
          .map((r) => ({
            student_id: r.student_id,
            to_class_id: r.to_class_id,
            status: r.suggested_status,
          })),
        idempotency_key: key,
      }),
      "Promotion committed transactionally"
    );
    if (out) {
      setPreview(null);
      setBatchDetail(out.batch_id);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Promotion" subtitle="Preview, commit, reconcile, enroll" />
      {years.loading && <Spinner />}
      <ErrorBanner message={years.error || classes.error} />
      {!years.loading && !years.error && (
        <>
          <div className="card">
            <div className="section-label">Promotion preview</div>
            <div className="meta"><span>Leave the source year empty for founding-year reconciliation: every active student is proposed into their current class.</span></div>
            <div className="grid2">
              <div className="field">
                <label>Source year (optional)</label>
                <Select value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} aria-label="Source year">
                  <option value="">None (founding reconciliation)</option>
                  {(years.data || []).map((y) => <option key={y.year_id} value={y.year_id}>{y.name}</option>)}
                </Select>
              </div>
              <div className="field">
                <label>Target year</label>
                <Select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} aria-label="Target year">
                  <option value="">Select target year</option>
                  {(years.data || []).map((y) => <option key={y.year_id} value={y.year_id}>{y.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="section-label">Class mapping (from → to)</div>
            {(classes.data || []).map((c) => (
              <div key={c.class_id} className="listitem">
                <div className="meta"><b>{c.name}</b></div>
                <Select
                  value={classMap[c.class_id] || ""}
                  onChange={(e) => setClassMap({ ...classMap, [c.class_id]: e.target.value })}
                  aria-label={`Target class for ${c.name}`}
                >
                  <option value="">No move (exception)</option>
                  {(classes.data || []).map((t) => <option key={t.class_id} value={t.class_id}>{t.name}</option>)}
                </Select>
              </div>
            ))}
            <div className="meta">
              <button className="btn primary sm" disabled={busy} onClick={doPreview}>Preview</button>
              <button className="btn primary sm" disabled={busy || !preview} onClick={doCommit}>Commit promotion</button>
            </div>
          </div>

          {preview && (
            <div className="card">
              <div className="section-label">
                Proposed ({preview.proposed?.length || 0}) · Exceptions ({preview.exceptions?.length || 0}) · Already done ({preview.already_done?.length || 0})
              </div>
              {(preview.proposed || []).slice(0, 50).map((r) => (
                <div key={r.student_id} className="meta">
                  <span>{r.student_name}: {className(r.from_class_id)} → {className(r.to_class_id)} ({r.suggested_status})</span>
                </div>
              ))}
              {(preview.proposed || []).length > 50 && (
                <div className="meta"><span>…and {preview.proposed.length - 50} more (all commit together)</span></div>
              )}
              {(preview.exceptions || []).map((x) => (
                <div key={x.student_id} className="meta">
                  <span>Needs attention: student #{x.student_id} — {x.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-label">Batches</div>
            {!(batches.data || []).length && <Empty>No promotions yet.</Empty>}
            {(batches.data || []).map((b) => (
              <div key={b.batch_id} className="listitem">
                <div className="meta">
                  <b>Batch #{b.batch_id}</b>
                  <span>applied {b.applied} · {b.status}</span>
                </div>
                <button className="btn sm" onClick={() => setBatchDetail(batchDetail === b.batch_id ? null : b.batch_id)}>
                  {batchDetail === b.batch_id ? "Close" : "Receipt"}
                </button>
              </div>
            ))}
            {batchDetail && <BatchReceipt batchId={batchDetail} />}
          </div>

          <div className="card">
            <div className="section-label">Subject offerings per class</div>
            <div className="field">
              <label>Class</label>
              <Select value={offerClass} onChange={(e) => setOfferClass(e.target.value)} aria-label="Offering class">
                <option value="">Select class</option>
                {(classes.data || []).map((c) => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
              </Select>
            </div>
            {(offerings.data || []).map((o) => (
              <div key={o.subject_id} className="listitem">
                <div className="meta"><b>{o.subject_name || subjectName(o.subject_id)}</b><span>{o.is_required ? "required" : "optional"}</span></div>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => run(
                    () => academicsApi.deleteClassOffering(offerClass, o.subject_id),
                    "Offering removed (blocked while sessions use it)"
                  )}
                >
                  Remove
                </button>
              </div>
            ))}
            <OfferForm
              classes={classes.data || []}
              subjects={subjects.data || []}
              offerClass={offerClass}
              busy={busy}
              onAdd={(subjectId, required) => run(
                () => academicsApi.setClassOffering(offerClass, { subject_id: Number(subjectId), is_required: required }),
                "Offering saved"
              )}
            />
            <div className="meta"><span>Classes without offerings keep legacy behavior; entry checks apply once offerings exist.</span></div>
          </div>

          <div className="card">
            <div className="section-label">Student subject enrollment</div>
            <div className="grid2">
              <div className="field">
                <label>Student ID</label>
                <input value={enrollStudent} onChange={(e) => setEnrollStudent(e.target.value)} placeholder="e.g. 12" />
              </div>
              <div className="field">
                <label>Year</label>
                <Select value={enrollYear} onChange={(e) => setEnrollYear(e.target.value)} aria-label="Enrollment year">
                  <option value="">Select year</option>
                  {(years.data || []).map((y) => <option key={y.year_id} value={y.year_id}>{y.name}</option>)}
                </Select>
              </div>
            </div>
            {(studentSubjects.data || []).map((s) => (
              <div key={`${s.subject_id}-${s.academic_year_id}`} className="listitem">
                <div className="meta">
                  <b>{s.subject_name || subjectName(s.subject_id)}</b>
                  <span>{s.state}{s.is_optional ? " · optional" : ""}</span>
                </div>
                {s.state === "enrolled" && (
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() => run(
                      () => peopleApi.updateStudentSubject(s.student_id, s.subject_id, { state: "dropped" }),
                      "Subject dropped (history kept)"
                    )}
                  >
                    Drop
                  </button>
                )}
              </div>
            ))}
            <EnrollForm
              subjects={subjects.data || []}
              busy={busy}
              onEnroll={(subjectId, optional) => {
                if (!enrollStudent || !enrollYear) {
                  toast("Enter a student ID and year first");
                  return;
                }
                run(
                  () => peopleApi.enrollStudentSubject(enrollStudent, {
                    subject_id: Number(subjectId),
                    year_id: Number(enrollYear),
                    is_optional: optional,
                  }),
                  "Student enrolled"
                );
              }}
            />
            <div className="meta"><span>Students with no enrollment rows keep legacy behavior. Non-enrolled subjects are never scored as zero.</span></div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function BatchReceipt({ batchId }) {
  const detail = useApi(() => peopleApi.getPromotionBatch(batchId), [batchId]);
  if (detail.loading) return <Spinner />;
  if (detail.error) return <ErrorBanner message={detail.error} />;
  return (
    <div className="meta">
      <span>Batch #{detail.data?.batch_id}: {detail.data?.applied} applied{detail.data?.duplicate_receipt ? " (duplicate request, no new writes)" : ""}</span>
    </div>
  );
}

function OfferForm({ subjects, offerClass, busy, onAdd }) {
  const [subjectId, setSubjectId] = useState("");
  const [required, setRequired] = useState(true);
  if (!offerClass) return null;
  return (
    <form
      className="grid2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!subjectId) return;
        onAdd(subjectId, required);
        setSubjectId("");
      }}
    >
      <div className="field">
        <label>Subject</label>
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Offered subject">
          <option value="">Select subject</option>
          {subjects.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
        </Select>
      </div>
      <div className="field">
        <label><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
      </div>
      <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy || !subjectId}>Offer subject</button></div>
    </form>
  );
}

function EnrollForm({ subjects, busy, onEnroll }) {
  const [subjectId, setSubjectId] = useState("");
  const [optional, setOptional] = useState(false);
  return (
    <form
      className="grid2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!subjectId) return;
        onEnroll(subjectId, optional);
        setSubjectId("");
      }}
    >
      <div className="field">
        <label>Subject</label>
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Enroll subject">
          <option value="">Select subject</option>
          {subjects.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
        </Select>
      </div>
      <div className="field">
        <label><input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} /> Optional</label>
      </div>
      <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy || !subjectId}>Enroll</button></div>
    </form>
  );
}
