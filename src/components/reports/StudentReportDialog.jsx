import { useEffect, useRef, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../ui/Primitives";
import * as reportsApi from "../../api/reports";
import {
  attendanceLabel,
  attendanceRangeLabel,
  attendanceTone,
  averageLabel,
  defaultTerm,
  formatDay,
  subjectCoverage,
  termsForSelector,
} from "../../utils/studentReport";

/**
 * The student report, in a popup.
 *
 * Deliberately not a printable report card. There are no grade bands, no exam
 * names and no pass/fail anywhere in the system, so this shows what is
 * actually recorded -- scores per subject, the average of those scores, and
 * attendance over the period the register actually covers -- and says so when
 * something is missing rather than filling the gap.
 */

function Detail({ label, value }) {
  return (
    <div className="sr-detail">
      <div className="sr-detail-label">{label}</div>
      <div className="sr-detail-value">{value || "—"}</div>
    </div>
  );
}

function ScorePill({ score }) {
  // A tone for a raw 0-100 score. Same caveat as attendance: this is a display
  // convention, not the school's grading policy, and it is not persisted.
  const tone = score >= 80 ? "ok" : score >= 50 ? "info" : "warn";
  return <Pill tone={tone}>{score}</Pill>;
}

function MarksSection({ report }) {
  const terms = report.terms || [];
  const [term, setTerm] = useState(() => defaultTerm(terms));
  const byTerm = (report.marks_by_term || []).find((t) => t.term === term);

  if (!terms.length) {
    return (
      <Empty>
        No marks recorded for this student yet.
      </Empty>
    );
  }

  return (
    <>
      <div className="sr-sub-head">
        <h4 className="sr-h4">Marks</h4>
        {terms.length > 1 && (
          <select
            className="sr-term-select"
            value={term || ""}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Term"
          >
            {termsForSelector(terms).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {terms.length > 1 && (
        <p className="sr-note">
          Terms are named as entered in the system. There are no grade bands, so
          no letter grade or pass/fail is shown.
        </p>
      )}

      <table className="data-table sr-table">
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col" className="sr-num">Score</th>
          </tr>
        </thead>
        <tbody>
          {(byTerm?.subjects || []).map((s) => (
            <tr key={s.subject_id}>
              <th scope="row">{s.subject_name || `Subject ${s.subject_id}`}</th>
              <td className="sr-num"><ScorePill score={s.score} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">
              Average
              {subjectCoverage(byTerm) && (
                <span className="sr-coverage">{subjectCoverage(byTerm)}</span>
              )}
            </th>
            <td className="sr-num sr-average">{averageLabel(byTerm)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

function AttendanceSection({ attendance }) {
  const pct = attendanceLabel(attendance);
  const range = attendanceRangeLabel(attendance);

  if (!attendance?.marked_days) {
    return (
      <>
        <h4 className="sr-h4">Attendance</h4>
        <p className="sr-note">
          No attendance has been recorded for this student. This is not a
          percentage of zero, it is an absence of records.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="sr-sub-head">
        <h4 className="sr-h4">Attendance</h4>
        {range && <span className="sr-range">{range}</span>}
      </div>

      <div className="sr-att-stats">
        <div className="sr-stat">
          <span className={`sr-stat-n sr-tone-${attendanceTone(attendance)}`}>{pct}</span>
          <span className="sr-stat-l">present</span>
        </div>
        <div className="sr-stat">
          <span className="sr-stat-n">{attendance.present}</span>
          <span className="sr-stat-l">days present</span>
        </div>
        <div className="sr-stat">
          <span className="sr-stat-n">{attendance.absent}</span>
          <span className="sr-stat-l">days absent</span>
        </div>
        <div className="sr-stat">
          <span className="sr-stat-n">{attendance.marked_days}</span>
          <span className="sr-stat-l">days marked</span>
        </div>
      </div>

      <p className="sr-note">
        {attendanceRangeLabel(attendance)} — the only days with a record. Days
        nobody marked are not counted as absences.
      </p>

      {attendance.recent?.length > 0 && (
        <>
          <h5 className="sr-h5">Most recent days</h5>
          <ul className="sr-days">
            {attendance.recent.map((d) => (
              <li key={d.date} className="sr-day">
                <span className="sr-day-date">{formatDay(d.date)}</span>
                <Pill tone={d.status === "Present" ? "ok" : "warn"}>{d.status}</Pill>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function StudentReportDialog({ studentId, onClose }) {
  const { data, loading, error } = useApi(
    () => reportsApi.studentReport(studentId),
    [studentId]
  );
  const boxRef = useRef(null);

  // Escape closes, and focus lands in the dialog so a keyboard user is not
  // left tabbing through the page behind it.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const student = data?.student;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box sr-box"
        onClick={(e) => e.stopPropagation()}
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={student ? `Report for ${student.name}` : "Student report"}
      >
        <div className="sr-head">
          <div className="sr-avatar">{initials(student?.name || "")}</div>
          <div className="sr-head-text">
            <div className="sr-name">{student?.name || "Student report"}</div>
            <div className="sr-sub">
              {student
                ? [
                    student.admission_no,
                    student.class_name,
                    student.gender,
                  ].filter(Boolean).join(" · ")
                : ""}
            </div>
          </div>
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="sr-body">
          {loading && <Spinner label="Building report..." />}
          {error && <ErrorBanner message={error} />}

          {data && (
            <>
              <section className="sr-section">
                <h4 className="sr-h4">Details</h4>
                <div className="sr-details">
                  <Detail label="Admission no" value={student.admission_no} />
                  <Detail label="Class" value={student.class_name} />
                  <Detail
                    label="Date of birth"
                    value={student.date_of_birth ? formatDay(student.date_of_birth) : ""}
                  />
                  <Detail label="Gender" value={student.gender} />
                  <Detail
                    label="Recorded on"
                    value={student.recorded_on ? formatDay(student.recorded_on) : ""}
                  />
                </div>
              </section>

              <section className="sr-section">
                <h4 className="sr-h4">Guardians</h4>
                {student.guardians?.length ? (
                  <div className="sr-details">
                    {student.guardians.map((g) => (
                      <div className="sr-guardian" key={g.parent_id}>
                        <div className="sr-detail">
                          <div className="sr-detail-label">
                            {g.relationship || "Guardian"}
                          </div>
                          <div className="sr-detail-value">{g.name}</div>
                        </div>
                        <Detail label="Phone" value={g.phone} />
                        <Detail label="Email" value={g.email} />
                        <Detail label="Emergency" value={g.emergency_number} />
                        <Detail label="Address" value={g.address} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sr-note">No guardian is linked to this student.</p>
                )}
              </section>

              <section className="sr-section">
                <MarksSection key={student.student_id} report={data} />
              </section>

              <section className="sr-section">
                <AttendanceSection attendance={data.attendance} />
              </section>

              <p className="sr-foot">
                Scores are out of 100 as recorded per subject per term. There is
                no exam, grade band or pass/fail in the system, so none is shown.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
