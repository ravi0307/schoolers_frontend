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

  const pager = usePagination(data);

  return (
    <>
      <PageHeader
        title="Report Card"
        subtitle={selectedChild ? `${selectedChild.name} · subject-wise marks` : ""}
      />
      {loading && <Spinner />}
      <ErrorBanner message={error} />
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
