import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as marksApi from "../../api/marks";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";

function gradeFor(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
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

  return (
    <>
      <PageHeader
        title="Report Card"
        subtitle={selectedChild ? `${selectedChild.name} · subject-wise marks` : ""}
      />
      {loading && <Spinner />}
      <ErrorBanner message={error || summary.error} />
      {!loading && !error && aggregate && aggregate.scope !== "grade-only" && aggregate.possible > 0 && (
        <Card className="card">
          <div className="section-label">Overall</div>
          <div className="meta">
            <b>{aggregate.obtained}/{aggregate.possible} · {aggregate.percentage}%</b>
            {aggregate.incomplete && <span> · Incomplete</span>}
          </div>
          {examinations.map((exam) => (
            <div key={exam.exam_id} className="meta">
              <span>{exam.name}</span>
              {exam.possible > 0 && (
                <span> · {exam.obtained}/{exam.possible} ({exam.percentage}%)</span>
              )}
              {exam.grade && <span> · Grade {exam.grade.label}</span>}
              {exam.incomplete && <span> · Incomplete</span>}
            </div>
          ))}
        </Card>
      )}
      {!loading && !error && (
        <Card className="card">
          {data && data.length ? (
            pager.pageItems.map((m) => (
              <div key={m.mark_id} className="listitem">
                <div className={`avatar ${m.score >= 75 ? "g" : m.score >= 50 ? "y" : "r"}`}>
                  {gradeFor(m.score)}
                </div>
                <div className="meta">
                  <b>Subject #{m.subject_id}</b>
                  <span>{m.score}/100 · {m.term}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>No marks recorded yet.</EmptyState>
          )}
          <Pagination {...pager} />
        </Card>
      )}
    </>
  );
}
