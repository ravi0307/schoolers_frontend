import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import * as peopleApi from "../../api/people";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

function getStudentField(student, keys) {
  for (const key of keys) {
    const value = student?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "Not provided";
}

export default function AdminClasses() {
  const { data, loading, error, refetch } = useApi(() => academicsApi.listClasses(), []);
  const { data: allStudents } = useApi(() => peopleApi.listStudents({}), []);
  const { data: teachers, loading: teachersLoading, error: teachersError } = useApi(
    () => peopleApi.listTeachers(),
    []
  );
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [classTeacherId, setClassTeacherId] = useState("");
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editClassTeacherId, setEditClassTeacherId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const studentsByClass = useMemo(() => {
    const map = {};
    (allStudents || []).forEach((student) => {
      const classId = student.class_id ?? student.classId;
      if (!classId) return;
      map[classId] = map[classId] || [];
      map[classId].push(student);
    });
    return map;
  }, [allStudents]);

  const teacherAssignments = useMemo(() => {
    const map = {};
    (data || []).forEach((item) => {
      if (item.class_teacher_id) map[item.class_teacher_id] = item;
    });
    return map;
  }, [data]);

  function teacherLabel(teacher) {
    const assignedClass = teacherAssignments[teacher.teacher_id];
    return `${teacher.name} — ${assignedClass ? assignedClass.name : "No class"}`;
  }

  function teacherName(teacherId) {
    return (teachers || []).find((teacher) => teacher.teacher_id === teacherId)?.name || "Not assigned";
  }

  function isTeacherUnavailable(teacherId, currentClassId = null) {
    const assignedClass = teacherAssignments[teacherId];
    return Boolean(assignedClass && assignedClass.class_id !== currentClassId);
  }

  function teacherOptionColor(teacherId) {
    return teacherAssignments[teacherId] ? "var(--red-pen)" : "var(--ok-green)";
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Enter a class name");
      return;
    }
    setSubmitting(true);
    try {
      await academicsApi.createClass({
        name: name.trim(),
        class_teacher_id: classTeacherId ? Number(classTeacherId) : null,
      });
      toast("Class created: " + name);
      setName("");
      setClassTeacherId("");
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateClass(id) {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast("Enter a class name");
      return;
    }
    try {
      await academicsApi.updateClass(id, {
        name: trimmed,
        class_teacher_id: editClassTeacherId ? Number(editClassTeacherId) : null,
      });
      toast("Class updated");
      setEditingClassId(null);
      setEditName("");
      setEditClassTeacherId("");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function remove(id) {
    try {
      await academicsApi.deleteClass(id);
      toast("Class removed");
      if (expandedClassId === id) setExpandedClassId(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function handleClassToggle(classId) {
    setExpandedClassId((current) => (current === classId ? null : classId));
  }

  return (
    <AdminShell>
      <div className="scr-title">Class List</div>
      <div className="scr-sub">{data ? `${data.length} classes` : ""}</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((c) => {
              const classStudents = studentsByClass[c.class_id] || [];
              const studentCount = classStudents.length;
              const isExpanded = expandedClassId === c.class_id;

              return (
                <div key={c.class_id} style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: isExpanded ? 8 : 0, marginBottom: isExpanded ? 8 : 0 }}>
                  <div
                    className="listitem"
                    onClick={() => handleClassToggle(c.class_id)}
                    style={{ cursor: "pointer", width: "100%" }}
                  >
                    <div className="avatar g">{c.name[0]}</div>
                    <div className="meta" style={{ flex: 1 }}>
                      <b>{c.name}</b>
                      <span>
                        {studentCount} {studentCount === 1 ? "student" : "students"} · Class teacher: {teacherName(c.class_teacher_id)}
                      </span>
                    </div>

                    <div className="cta-row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          setEditingClassId(c.class_id);
                          setEditName(c.name);
                          setEditClassTeacherId(c.class_teacher_id ? String(c.class_teacher_id) : "");
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn ghost sm" onClick={() => remove(c.class_id)}>Remove</button>
                    </div>
                  </div>

                  {editingClassId === c.class_id && (
                    <div className="card white" style={{ margin: "8px 0 10px" }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Class name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Class teacher</label>
                        <select
                          value={editClassTeacherId}
                          onChange={(e) => setEditClassTeacherId(e.target.value)}
                          disabled={teachersLoading}
                        >
                          <option value="">No class teacher</option>
                          {(teachers || []).map((teacher) => (
                            <option
                              key={teacher.teacher_id}
                              value={teacher.teacher_id}
                              disabled={isTeacherUnavailable(teacher.teacher_id, c.class_id)}
                              style={{
                                color: teacherOptionColor(teacher.teacher_id),
                              }}
                            >
                              {teacherLabel(teacher)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ErrorBanner message={teachersError} />
                      <div className="cta-row" style={{ marginTop: 10 }}>
                        <button className="btn primary sm" onClick={() => updateClass(c.class_id)}>Save</button>
                        <button className="btn ghost sm" onClick={() => { setEditingClassId(null); setEditName(""); setEditClassTeacherId(""); }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>Students</div>
                      {classStudents.length ? (
                        <div style={{ display: "grid", gap: 0 }}>
                          {classStudents.map((student) => (
                            <div
                              key={student.student_id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "44px minmax(180px, 1.4fr) minmax(130px, 1fr) minmax(120px, 1fr) minmax(130px, 1fr)",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 10px",
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              <div className="avatar">{String(student.name || "?")[0].toUpperCase()}</div>
                              <div style={{ display: "grid", gap: 3 }}>
                                <div style={{ fontWeight: 700 }}>{student.name}</div>
                                <div style={{ color: "#6b7280", fontSize: 12 }}>{getStudentField(student, ["admission_no"])}</div>
                              </div>
                              <div style={{ color: "#374151", fontWeight: 500 }}>{getStudentField(student, ["date_of_birth", "dob"])}</div>
                              <div style={{ color: "#374151", fontWeight: 500 }}>{getStudentField(student, ["parent_name", "guardian_name"])}</div>
                              <div style={{ color: "#374151", fontWeight: 500 }}>{getStudentField(student, ["parent_phone", "guardian_phone"])}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty>No students in this class.</Empty>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty>No classes yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Class name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 5 - A" />
          </div>
          <div className="field">
            <label>Class teacher</label>
            <select value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)} disabled={teachersLoading}>
              <option value="">No class teacher</option>
              {(teachers || []).map((teacher) => (
                <option
                  key={teacher.teacher_id}
                  value={teacher.teacher_id}
                  disabled={isTeacherUnavailable(teacher.teacher_id)}
                  style={{
                    color: teacherOptionColor(teacher.teacher_id),
                  }}
                >
                  {teacherLabel(teacher)}
                </option>
              ))}
            </select>
          </div>
          <ErrorBanner message={teachersError} />
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Class"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn gold" style={{ marginTop: 10 }} onClick={() => setFormOpen(true)}>+ Add Class</button>
      )}
    </AdminShell>
  );
}
