import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Select from "../../components/ui/Select";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as marksApi from "../../api/marks";
import * as academicsApi from "../../api/academics";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { friendlyApiMessage } from "../../api/client";

const STATUS_LABELS = { absent: "Absent", missing: "Missing", exempt: "Exempt" };

function distributionLabel(dist) {
  return Object.entries(dist || {})
    .map(([label, n]) => (n > 1 ? `${label} ×${n}` : label))
    .join(", ");
}

export default function ParentMarks() {
  const { selectedChild } = useParentContext();
  const [yearFilter, setYearFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const { data, loading, error } = useApi(
    () => (selectedChild ? marksApi.studentMarks(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  // Phase 6 aggregate summary: per-examination totals with incomplete
  // badges. Year/term filters narrow the summary; the subject-wise list
  // below keeps every published row with its own term label.
  const years = useApi(() => academicsApi.listAcademicYears(), []);
  const periods = useApi(
    () => (yearFilter
      ? academicsApi.listAcademicPeriods(Number(yearFilter))
      : Promise.resolve([])),
    [yearFilter]
  );
  const summary = useApi(
    () => (selectedChild
      ? marksApi.studentResults(selectedChild.student_id, {
        year_id: yearFilter ? Number(yearFilter) : undefined,
        period_id: periodFilter ? Number(periodFilter) : undefined,
      })
      : Promise.resolve(null)),
    [selectedChild?.student_id, yearFilter, periodFilter]
  );

  const pager = usePagination(data);
  const aggregate = summary.data?.aggregate;
  const examinations = summary.data?.examinations || [];
  const banner = friendlyApiMessage(error)
    || friendlyApiMessage(years.error)
    || friendlyApiMessage(summary.error);

  return (
    <>
      <PageHeader
        title="Report Card"
        subtitle={selectedChild ? `${selectedChild.name} · subject-wise marks` : ""}
      />
      {loading && <Spinner />}
      <ErrorBanner message={banner} />
      {!loading && !banner && aggregate && (
        <Card className="card">
          {(years.data || []).length > 0 && (
            <div className="grid2">
              <div className="field">
                <label htmlFor="parent-marks-year">Academic year</label>
                <Select
                  id="parent-marks-year"
                  value={yearFilter}
                  onChange={(e) => { setYearFilter(e.target.value); setPeriodFilter(""); }}
                  aria-label="Filter results by academic year"
                >
                  <option value="">All years</option>
                  {(years.data || []).map((y) => (
                    <option key={y.year_id} value={y.year_id}>{y.name}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <label htmlFor="parent-marks-period">Term</label>
                <Select
                  id="parent-marks-period"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  aria-label="Filter results by term"
                  disabled={!yearFilter || !(periods.data || []).length}
                >
                  <option value="">All terms</option>
                  {(periods.data || []).map((p) => (
                    <option key={p.period_id} value={p.period_id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <div className="section-label">Overall</div>
          {aggregate.scope === "grade-only" ? (
            <div className="meta">
              <span>{aggregate.note || "Grade-based assessment — no numeric totals"}</span>
            </div>
          ) : aggregate.possible > 0 ? (
            <div className="meta">
              <b>{aggregate.obtained}/{aggregate.possible} · {aggregate.percentage}%</b>
              {aggregate.incomplete && <span> · Incomplete</span>}
            </div>
          ) : (
            <div className="meta">
              <span>No papers counted yet</span>
              {aggregate.incomplete && <span> · Incomplete</span>}
            </div>
          )}
          {(yearFilter || periodFilter) && (
            <div className="meta">
              <span>Filtered {summary.loading ? "…" : ""}— the subject-wise list below always shows every published row.</span>
            </div>
          )}
          {examinations.map((exam) => (
            <div key={exam.exam_id} className="meta">
              <span>{exam.name}</span>
              {exam.grade_distribution ? (
                <span> · Grades: {distributionLabel(exam.grade_distribution)}</span>
              ) : exam.possible > 0 ? (
                <span> · {exam.obtained}/{exam.possible} ({exam.percentage}%)</span>
              ) : (
                <span> · no papers sat</span>
              )}
              {exam.grade && <span> · Grade {exam.grade.label}</span>}
              {exam.incomplete && <span> · Incomplete</span>}
            </div>
          ))}
        </Card>
      )}
      {!loading && !banner && (
        <Card className="card">
          {data && data.length ? (
            pager.pageItems.map((m) => {
              const status = m.assessment_status || "present";
              const hasScore = status === "present" && m.score != null;
              const gradedOnly = status === "present" && m.score == null;
              return (
                <div key={m.mark_id} className="listitem">
                  <div className="avatar">
                    {m.grade?.label || "–"}
                  </div>
                  <div className="meta">
                    <b>{m.subject_name || `Subject #${m.subject_id}`}</b>
                    <span>
                      {hasScore
                        ? `${m.score}/${m.max_marks ?? 100}`
                        : gradedOnly
                          ? (m.grade?.label ? `Grade ${m.grade.label}` : "Grade recorded")
                          : STATUS_LABELS[status] || status}
                      {" · "}{m.term}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState>No marks recorded yet.</EmptyState>
          )}
          <Pagination {...pager} />
        </Card>
      )}
    </>
  );
}
