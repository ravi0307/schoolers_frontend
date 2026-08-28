import ParentShell from "../../components/layout/ParentShell";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as marksApi from "../../api/marks";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";

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

  return (
    <ParentShell>
      <div className="scr-title">Report Card</div>
      <div className="scr-sub">{selectedChild ? `${selectedChild.name} · subject-wise marks` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((m) => (
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
            <Empty>No marks recorded yet.</Empty>
          )}
        </div>
      )}
    </ParentShell>
  );
}
