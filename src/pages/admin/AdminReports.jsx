import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import { StudentReportDialog } from "../../components/reports/StudentReportDialog";
import { StaffReportDialog } from "../../components/reports/StaffReportDialog";
import * as peopleApi from "../../api/people";
import { listClasses } from "../../api/academics";
import { classNameFor, filterStudents } from "../../utils/studentReport";
import { filterStaff } from "../../utils/staffReport";

/**
 * Reporting.
 *
 * The nav group is named "Accounts and Reporting" so the two belong together
 * once the second half has content. It now has two reports: a per-student
 * summary of what is on record, and a per-staff report of what someone is paid
 * and when they showed up.
 *
 * What it deliberately does not have: fee collection rates, salary cost or
 * month-over-month change. Those are guesses about what this school tracks,
 * and a report that invents a metric is worse than one that admits the gap.
 */

function StudentRow({ student, className, onOpen }) {
  return (
    <button type="button" className="sr-row" onClick={onOpen}>
      <span className="sr-row-avatar">{initials(student.name)}</span>
      <span className="sr-row-text">
        <span className="sr-row-name">{student.name}</span>
        <span className="sr-row-meta">
          {[student.admission_no, className].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Pill tone="mute">View report</Pill>
    </button>
  );
}

function StaffRow({ staff, onOpen }) {
  return (
    <button type="button" className="sr-row" onClick={onOpen}>
      <span className="sr-row-avatar">{initials(staff.name)}</span>
      <span className="sr-row-text">
        <span className="sr-row-name">{staff.name}</span>
        <span className="sr-row-meta">
          {[staff.role_title || staff.role, staff.person_type].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Pill tone="mute">View report</Pill>
    </button>
  );
}

export default function AdminReports() {
  const students = useApi(() => peopleApi.listStudents(), []);
  const classes = useApi(() => listClasses(), []);
  const staff = useApi(() => peopleApi.listStaff(), []);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [staffQuery, setStaffQuery] = useState("");
  const [openStaffId, setOpenStaffId] = useState(null);

  const all = students.data || [];
  const classesById = useMemo(
    () => Object.fromEntries((classes.data || []).map((c) => [c.class_id, c.name])),
    [classes.data]
  );
  const matched = useMemo(
    () => filterStudents(all, query, classesById),
    [all, query, classesById]
  );

  const allStaff = staff.data || [];
  const matchedStaff = useMemo(
    () => filterStaff(allStaff, staffQuery),
    [allStaff, staffQuery]
  );

  // The list is the school's active students, loaded once and filtered here,
  // so typing is instant. It scrolls rather than paginating, because a page
  // boundary between a list of people is pure friction -- and because the
  // alternative, slicing, would hide students behind a search they have to
  // already know the name of.
  //
  // The day a school has thousands of students this wants server-side search
  // and pagination: /students takes a `search` param but has no limit, so
  // there is no way to page it yet.

  return (
    <AdminShell>
      <div className="scr-title">Reporting</div>
      <div className="scr-sub">
        Reports built from what this school has on record.
      </div>

      <section className="card white">
        <div className="sr-controls">
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Student report</div>
            <p className="sr-blurb">
              A student's details, marks and attendance. Scores are shown per
              subject per term; there is no exam or grade band in the system, so
              no letter grade is invented.
            </p>
          </div>
          <input
            className="field sr-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name, admission no or class"
            aria-label="Search students"
          />
        </div>

        {students.loading && <Spinner label="Loading students..." />}
        {students.error && <ErrorBanner message={students.error} />}
        {classes.error && <ErrorBanner message={classes.error} />}

        {!students.loading && !students.error && (
          <>
            {!all.length && (
              <Empty>
                No students yet. Add students under Set up to build reports.
              </Empty>
            )}

            {all.length > 0 && (
              <>
                <div className="sr-count">
                  {query ? `${matched.length} of ${all.length}` : all.length}{" "}
                  {all.length === 1 ? "student" : "students"}
                </div>

                {!matched.length && (
                  <Empty>No students match that search.</Empty>
                )}

                <div className="sr-list">
                  {matched.map((s) => (
                    <StudentRow
                      key={s.student_id}
                      student={s}
                      className={classNameFor(classesById, s.class_id)}
                      onOpen={() => setOpenId(s.student_id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {openId != null && (
        <StudentReportDialog studentId={openId} onClose={() => setOpenId(null)} />
      )}

      <section className="card white" style={{ marginTop: 26 }}>
        <div className="sr-controls">
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Staff report</div>
            <p className="sr-blurb">
              A staff member's details, salary and attendance. Salary is shown
              per month over the same window the accounts grid renders, each
              amount with the date it was actually paid.
            </p>
          </div>
          <input
            className="field sr-search"
            type="search"
            value={staffQuery}
            onChange={(e) => setStaffQuery(e.target.value)}
            placeholder="Search staff by name, role or phone"
            aria-label="Search staff"
          />
        </div>

        {staff.loading && <Spinner label="Loading staff..." />}
        {staff.error && <ErrorBanner message={staff.error} />}

        {!staff.loading && !staff.error && (
          <>
            {!allStaff.length && (
              <Empty>
                No staff yet. Add staff under Set up to build reports.
              </Empty>
            )}

            {allStaff.length > 0 && (
              <>
                <div className="sr-count">
                  {staffQuery ? `${matchedStaff.length} of ${allStaff.length}` : allStaff.length}{" "}
                  {allStaff.length === 1 ? "staff member" : "staff members"}
                </div>

                {!matchedStaff.length && (
                  <Empty>No staff match that search.</Empty>
                )}

                <div className="sr-list">
                  {matchedStaff.map((s) => (
                    <StaffRow
                      key={s.staff_id}
                      staff={s}
                      onOpen={() => setOpenStaffId(s.staff_id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {openStaffId != null && (
        <StaffReportDialog staffId={openStaffId} onClose={() => setOpenStaffId(null)} />
      )}
    </AdminShell>
  );
}
