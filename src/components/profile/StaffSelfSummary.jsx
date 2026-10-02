import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner } from "../ui/Primitives";
import * as reportsApi from "../../api/reports";
import {
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
} from "../../utils/staffReport";

/**
 * A staff member's own attendance and pay, as two sections on their profile.
 *
 * Until this existed the per-staff report was admin-only, so a teacher could
 * not read their own attendance or their own payslips without asking an admin to
 * open a dialog on their behalf. The report's rules are kept here because they
 * are the ones that matter when the reader is the subject:
 *
 *  - attendance is a summary of marked days, and a month picker scopes it;
 *  - an unmarked month is not a zero. No records reads as no records;
 *  - an unpaid window month is a dash, never "0", the admin's remark is shown
 *    against the payment it belongs to, and the pager cannot walk past this
 *    month.
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

/** How the marked days add up -- the figures, not the day-by-day list. */
function AttendanceSummary({ attendance, month, onMonth }) {
  const scope = attendanceScopeLabel(attendance);

  return (
    <div className="card white">
      <div className="section-label">Your attendance</div>

      <div className="profile-filter">
        <label htmlFor="profile-attendance-month">Month</label>
        <input
          id="profile-attendance-month"
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => onMonth(e.target.value)}
        />
        {month ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => onMonth("")}
          >
            All time
          </button>
        ) : (
          <span className="sr-range">{scope}</span>
        )}
      </div>

      {!hasAttendance(attendance) ? (
        <p className="sr-note">
          {month
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
            {attendanceRangeLabel(attendance)} — {scope}. Only days somebody
            marked are counted, so a day left blank is not an absence.
          </p>
        </>
      )}
    </div>
  );
}

/** The pay summary, then the six months of history behind those numbers. */
function PaySummary({ salary, onPage }) {
  const rows = salaryRows(salary);
  const headline = salaryHeadline(salary);
  const windowLabel = salaryWindowLabel(salary);
  const windowSize = salary?.window_size || 0;

  return (
    <div className="card white">
      <div className="section-label">Your pay</div>

      <div className="sr-sub-head">
        <h4 className="sr-h4">Salary</h4>
        {windowLabel && <span className="sr-range">{windowLabel}</span>}
      </div>

      {windowSize === 0 ? (
        <p className="sr-note">No salary is on record for you.</p>
      ) : (
        <>
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

          {onPage && (
            <div className="profile-pager">
              <button type="button" className="btn ghost" onClick={() => onPage("older")}>
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

          <h5 className="sr-h5">History</h5>
          {/* The table keeps a min-width, so it scrolls inside its card rather
              than pushing the grid track wider. */}
          <div className="table-scroll">
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
          </div>

          <p className="sr-note">
            The last {windowSize} months. A dash is a month with no payment on
            record, never a payment of zero. Remarks are the notes your
            administrator left against each payment.
          </p>
        </>
      )}
    </div>
  );
}

export default function StaffSelfSummary() {
  // "" means unfiltered, so the server gets no attendance_month and the
  // summary reads as the whole register rather than as this month alone.
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
    /* Spans the page grid so the two sections sit side by side underneath the
       account and password cards, rather than as one column of their own. */
    <div className="profile-summary">
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && data && (
        <>
          <AttendanceSummary
            attendance={data.attendance}
            month={attendanceMonth}
            onMonth={setAttendanceMonth}
          />
          <PaySummary salary={data.salary} onPage={pageSalary} />
        </>
      )}
    </div>
  );
}
