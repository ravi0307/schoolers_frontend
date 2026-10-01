import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner, Pill } from "../ui/Primitives";
import * as reportsApi from "../../api/reports";
import {
  attendanceDays,
  attendanceLabel,
  attendanceRangeLabel,
  attendanceScopeLabel,
  attendanceTone,
  currentMonth,
  formatAmount,
  formatDay,
  hasAttendance,
  monthLabel,
  salaryCanPageNewer,
  salaryHeadline,
  salaryNote,
  salaryPageAnchor,
  salaryRows,
  salaryWindowLabel,
  statusTone,
} from "../../utils/staffReport";

/**
 * A staff member's own attendance and pay, on their profile page.
 *
 * Until this existed the per-staff report was admin-only, so a teacher could
 * not read their own register or their own payslips without asking an admin to
 * open a dialog on their behalf. The rules the report follows are kept here
 * because they are the ones that matter when the reader is the subject:
 *
 *  - the day list is the whole register, not a 30-day tail, and a month filter
 *    narrows both the list and the counters so the percentage describes exactly
 *    the rows on screen;
 *  - an unmarked month is not a zero. No records reads as no records;
 *  - an unpaid window month is a dash, never "0", and the admin's remark on a
 *    payment is shown against that payment.
 *
 * Only staff-linked roles mount this. It is a separate component precisely so
 * the fetch lives here: a parent or master admin rendering the page never
 * triggers a request that would come back 403.
 */

function Stat({ value, label, tone }) {
  return (
    <div className="sr-stat">
      <span className={`sr-stat-n${tone ? ` sr-tone-${tone}` : ""}`}>{value}</span>
      <span className="sr-stat-l">{label}</span>
    </div>
  );
}

function AttendanceHistory({ attendance }) {
  const days = attendanceDays(attendance);
  const scope = attendanceScopeLabel(attendance);

  return (
    <>
      <div className="sr-sub-head">
        <h4 className="sr-h4">Your attendance</h4>
        <span className="sr-range">{scope}</span>
      </div>

      {!hasAttendance(attendance) ? (
        <p className="sr-note">
          {attendance?.month
            ? `No days were marked in ${scope}.`
            : "No attendance has been recorded for you yet."}{" "}
          That is an absence of records, not a percentage of zero.
        </p>
      ) : (
        <>
          <div className="sr-att-stats">
            <Stat
              value={attendanceLabel(attendance)}
              label="present"
              tone={attendanceTone(attendance)}
            />
            <Stat value={attendance.present} label="days present" />
            <Stat value={attendance.absent} label="days absent" />
            <Stat value={attendance.on_leave || 0} label="on leave" />
            <Stat value={attendance.half_day || 0} label="half days" />
            <Stat value={attendance.marked_days} label="days marked" />
          </div>

          <p className="sr-note">
            {attendance.month
              ? `${attendanceRangeLabel(attendance)} — the only marked days in ${scope}. Days nobody marked are not counted as absences.`
              : `${attendanceRangeLabel(attendance)} — your whole register. Days nobody marked are not counted as absences.`}
          </p>

          {days.length === 0 ? (
            <p className="sr-note">No days are marked in {scope}.</p>
          ) : (
            <>
              <h5 className="sr-h5">
                {days.length} marked {days.length === 1 ? "day" : "days"}
              </h5>
              <ul className="sr-days">
                {days.map((d) => (
                  <li key={d.date} className="sr-day">
                    <span className="sr-day-date">
                      {formatDay(d.date)}
                      {d.check_in ? ` · ${d.check_in.slice(0, 5)}` : ""}
                      {d.check_out ? `–${d.check_out.slice(0, 5)}` : ""}
                    </span>
                    <Pill tone={statusTone(d.status)}>{d.status}</Pill>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

function SalaryHistory({ salary, onPage }) {
  const rows = salaryRows(salary);
  const headline = salaryHeadline(salary);
  const windowSize = salary?.window_size || 0;

  return (
    <>
      <div className="sr-sub-head">
        <h4 className="sr-h4">Your salary</h4>
        <span className="sr-range">{salaryWindowLabel(salary)}</span>
      </div>

      {onPage && windowSize > 0 && (
        <div className="profile-pager">
          <button
            type="button"
            className="btn ghost"
            onClick={() => onPage("older")}
          >
            ← Earlier {windowSize} months
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onPage("newer")}
            disabled={!salaryCanPageNewer(salary, currentMonth())}
          >
            Later {windowSize} months →
          </button>
        </div>
      )}

      {windowSize === 0 ? (
        <p className="sr-note">No salary is on record for you.</p>
      ) : (
        <>
          <table className="data-table sr-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="sr-num">Amount</th>
                <th scope="col" className="sr-num">Paid on</th>
                <th scope="col">Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{monthLabel(row.month)}</th>
                  <td className="sr-num">
                    {row.record
                      ? formatAmount(row.record.amount)
                      : <span className="sr-dash">—</span>}
                  </td>
                  <td className="sr-num">
                    {row.record?.paid_on
                      ? formatDay(row.record.paid_on)
                      : (row.record ? <span className="sr-dash">—</span> : "")}
                  </td>
                  <td className="profile-salary-note">
                    {row.record
                      ? (salaryNote(row.record) || <span className="sr-dash">—</span>)
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="sr-note">
            The last {windowSize} months. A dash is a month with no payment on
            record, never a payment of zero. Remarks are the notes your
            administrator left against each payment.
          </p>

          <div className="sr-att-stats">
            <Stat
              value={headline.monthsPaid}
              label={headline.monthsPaid === 1 ? "month paid" : "months paid"}
            />
            <Stat
              value={headline.outstanding}
              label={headline.outstanding === 1 ? "month unpaid" : "months unpaid"}
            />
            <Stat value={headline.total} label="total paid" />
            <Stat value={headline.average} label="average per paid month" />
          </div>
        </>
      )}
    </>
  );
}

export default function StaffSelfSummary() {
  // "" means unfiltered, so the server gets no attendance_month and the
  // register reads as a whole history rather than as this month alone.
  const [attendanceMonth, setAttendanceMonth] = useState("");
  const [salaryEnd, setSalaryEnd] = useState(null);

  const { data, loading, error } = useApi(
    () => reportsApi.myStaffSummary({ attendanceMonth, salaryEnd }),
    [attendanceMonth, salaryEnd]
  );

  function pageSalary(direction) {
    const anchor = salaryPageAnchor(data?.salary, direction);
    if (anchor) setSalaryEnd(anchor);
  }

  return (
    <div className="card white profile-summary">
      <div className="section-label">Your attendance and pay</div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && data && (
        <>
          <div className="profile-filter">
            <label htmlFor="profile-attendance-month">Attendance month</label>
            <input
              id="profile-attendance-month"
              type="month"
              value={attendanceMonth}
              max={currentMonth()}
              onChange={(e) => setAttendanceMonth(e.target.value)}
            />
            {attendanceMonth ? (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setAttendanceMonth("")}
              >
                Show all time
              </button>
            ) : (
              <span className="sr-range">
                Showing your whole register. Pick a month to narrow it.
              </span>
            )}
          </div>

          <AttendanceHistory attendance={data.attendance} />

          <hr className="profile-rule" />

          <SalaryHistory salary={data.salary} onPage={pageSalary} />
        </>
      )}
    </div>
  );
}
