import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as marksApi from "../../api/marks";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { friendlyApiMessage } from "../../api/client";

function gradeFor(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

const STATUS_LABELS = { absent: "Absent", missing: "Missing", exempt: "Exempt" };

function distributionLabel(dist) {
  return Object.entries(dist || {})
    .map(([label, n]) => (n > 1 ? `${label} ×${n}` : label))
    .join(", ");
}

export default function ParentMarks() {
  const { selectedChild } = useParentContext();
  const { data, loading, error } = useApi(
    () => (selectedChild ? marksApi.studentMarks(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  // Phase 6 aggregate summary: per-examination totals with incomplete
  // badges. The subject-wise list below is unchanged.
  const summary = useApi(
    () => (selectedChild ? marksApi.studentResults(selectedChild.student_id) : Promise.resolve(null)),
    [selectedChild?.student_id]
  );

  const pager = usePagination(data);
  const aggregate = summary.data?.aggregate;
  const examinations = summary.data?.examinations || [];
  const banner = friendlyApiMessage(error) || friendlyApiMessage(summary.error);

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
                  <div className={`avatar ${hasScore ? (m.score >= 75 ? "g" : m.score >= 50 ? "y" : "r") : ""}`}>
                    {hasScore ? gradeFor(m.score) : "–"}
                  </div>
                  <div className="meta">
                    <b>Subject #{m.subject_id}</b>
                    <span>
                      {hasScore
                        ? `${m.score}/${m.max_marks ?? 100}`
                        : gradedOnly
                          ? "Grade recorded"
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
