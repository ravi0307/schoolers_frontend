import { useState, useMemo } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import ClassPicker from "../../components/ui/ClassPicker";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import * as attendanceApi from "../../api/attendance";
import * as marksApi from "../../api/marks";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";

function gradeFor(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function Detail({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", fontSize: 12.5 }}>
      <span style={{ color: "#7a7f87" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value ?? "—"}</span>
    </div>
  );
}

export default function TeacherDashboard() {
  const { classIds, selectedClassId, setSelectedClassId, loading: loadLoading } = useTeacherContext();
  const [openId, setOpenId] = useState(null);

  const { data, loading, error } = useApi(
    () => (selectedClassId ? peopleApi.listStudents({ class_id: selectedClassId }) : Promise.resolve([])),
    [selectedClassId]
  );

  const { data: subjects } = useApi(() => academicsApi.listSubjects(), []);
  const subjectName = useMemo(() => {
    const map = {};
    if (subjects) for (const s of subjects) map[s.subject_id] = s.name;
    return map;
  }, [subjects]);

  const { data: attendance, loading: attLoading } = useApi(
    () => (openId ? attendanceApi.getAttendance(openId) : Promise.resolve(null)),
    [openId]
  );

  const { data: marks, loading: marksLoading } = useApi(
    () => (openId ? marksApi.studentMarks(openId) : Promise.resolve(null)),
    [openId]
  );

  const attStats = useMemo(() => {
    if (!attendance || !attendance.length) return null;
    const present = attendance.filter((a) => a.status === "Present").length;
    return { percent: Math.round((present / attendance.length) * 100), present, total: attendance.length };
  }, [attendance]);

  const openStudent = data && openId != null ? data.find((s) => s.student_id === openId) : null;
  const pager = usePagination(data);

  return (
    <TeacherShell>
      <div className="scr-title">Student List</div>
      <div className="scr-sub">{selectedClassId ? `Class #${selectedClassId}` : "No class assigned yet"}</div>

      {!loadLoading && <ClassPicker classIds={classIds} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />}

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            pager.pageItems.map((s) => {
              const open = openId === s.student_id;
              return (
                <div key={s.student_id}>
                  <div
                    className="listitem"
                    style={{ cursor: "pointer" }}
                    onClick={() => setOpenId(open ? null : s.student_id)}
                  >
                    <div className="avatar">{initials(s.name)}</div>
                    <div className="meta">
                      <b>{s.name}</b>
                      <span>{s.admission_no}</span>
                    </div>
                    <Pill tone={s.present_today ? "ok" : "warn"}>{s.present_today ? "Present" : "Absent"}</Pill>
                    <div style={{ color: "#7a7f87", fontWeight: 700 }}>{open ? "▴" : "▾"}</div>
                  </div>

                  {open && openStudent && (
                    <div className="card" style={{ margin: "0 12px 12px", padding: 14 }}>
                      <div className="section-label">Personal Details</div>
                      <Detail label="Roll No / Admission No" value={s.admission_no} />
                      <Detail label="Class" value={`Class #${s.class_id}`} />
                      <Detail label="Gender" value={s.gender} />
                      <Detail label="Date of Birth" value={s.date_of_birth} />
                      <Detail label="Parent" value={s.parent_name} />
                      <Detail label="Parent Phone" value={s.parent_phone} />
                      <Detail label="Parent Email" value={s.parent_email} />

                      <div className="section-label" style={{ marginTop: 14 }}>Attendance</div>
                      {attLoading ? (
                        <Spinner />
                      ) : attStats ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{attStats.percent}%</div>
                          <Pill tone={attStats.percent >= 75 ? "ok" : "warn"}>
                            {attStats.present}/{attStats.total} days present
                          </Pill>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: "#7a7f87", padding: "4px 0" }}>No attendance records yet.</div>
                      )}

                      <div className="section-label" style={{ marginTop: 14 }}>Marks (all subjects)</div>
                      {marksLoading ? (
                        <Spinner />
                      ) : marks && marks.length ? (
                        marks.map((m) => (
                          <div key={m.mark_id} className="listitem" style={{ padding: "6px 0" }}>
                            <div className={`avatar ${m.score >= 75 ? "g" : m.score >= 50 ? "y" : "r"}`}>
                              {gradeFor(m.score)}
                            </div>
                            <div className="meta">
                              <b>{subjectName[m.subject_id] || `Subject #${m.subject_id}`}</b>
                              <span>{m.score}/100 · {m.term}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12.5, color: "#7a7f87", padding: "4px 0" }}>No marks recorded yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty>No students in this class yet.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}
    </TeacherShell>
  );
}