import { useEffect, useRef } from "react";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner, Pill, initials } from "../ui/Primitives";
import * as reportsApi from "../../api/reports";
import {
  attendanceLabel,
  attendanceRangeLabel,
  attendanceTone,
  formatAmount,
  formatDay,
  monthLabel,
  salaryHeadline,
  salaryRows,
  salaryWindowLabel,
  statusTone,
} from "../../utils/staffReport";
import { downloadStaffReport } from "../../utils/staffReportPdf";

/**
 * The staff report, in a popup.
 *
 * The student report's mirror for the people who get paid. Salary is what is
 * on record per month -- each amount with the date it was actually paid --
 * over the same six-month window the accounts grid renders, so an unpaid month
 * shows as a dash here too. Attendance counts only days someone marked, and a
 * staff member nobody has ever marked gets "No records", never a percentage of
 * zero.
 */

function Detail({ label, value }) {
  return (
    <div className="sr-detail">
      <div className="sr-detail-label">{label}</div>
      <div className="sr-detail-value">{value || "—"}</div>
    </div>
  );
}

function SalarySection({ salary }) {
  const rows = salaryRows(salary);
  const headline = salaryHeadline(salary);
  const windowLabel = salaryWindowLabel(salary);
  const windowSize = salary?.window_size || 0;

  return (
    <>
      <div className="sr-sub-head">
        <h4 className="sr-h4">Salary</h4>
        {windowLabel && <span className="sr-range">{windowLabel}</span>}
      </div>

      {windowSize > 0 ? (
        <>
          <table className="data-table sr-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="sr-num">Amount</th>
                <th scope="col" className="sr-num">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{monthLabel(row.month)}</th>
                  <td className="sr-num">
                    {row.record ? formatAmount(row.record.amount) : <span className="sr-dash">—</span>}
                  </td>
                  <td className="sr-num">
                    {row.record?.paid_on ? formatDay(row.record.paid_on) : (row.record ? <span className="sr-dash">—</span> : "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="sr-note">
            The window the accounts grid calls "the last {windowSize} months".
            Every month without a figure is unpaid in that window, never a
            payment of zero.
          </p>

          <div className="sr-att-stats">
            <div className="sr-stat">
              <span className="sr-stat-n">{headline.monthsPaid}</span>
              <span className="sr-stat-l">{headline.monthsPaid === 1 ? "month paid" : "months paid"}</span>
            </div>
            <div className="sr-stat">
              <span className="sr-stat-n">{headline.outstanding}</span>
              <span className="sr-stat-l">{headline.outstanding === 1 ? "month unpaid" : "months unpaid"}</span>
            </div>
            <div className="sr-stat">
              <span className="sr-stat-n">{headline.total}</span>
              <span className="sr-stat-l">total paid</span>
            </div>
            <div className="sr-stat">
              <span className="sr-stat-n">{headline.average}</span>
              <span className="sr-stat-l">average per paid month</span>
            </div>
          </div>
        </>
      ) : (
        <p className="sr-note">No salary is on record for this staff member.</p>
      )}
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
          No attendance has been recorded for this staff member. This is not a
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
          <span className="sr-stat-n">{attendance.on_leave || 0}</span>
          <span className="sr-stat-l">on leave</span>
        </div>
        <div className="sr-stat">
          <span className="sr-stat-n">{attendance.half_day || 0}</span>
          <span className="sr-stat-l">half days</span>
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
  );
}

export function StaffReportDialog({ staffId, onClose }) {
  const { data, loading, error } = useApi(
    () => reportsApi.staffReport(staffId),
    [staffId]
  );
  const boxRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const staff = data?.staff;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box sr-box"
        onClick={(e) => e.stopPropagation()}
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={staff ? `Salary, attendance and details for ${staff.name}` : "Staff report"}
      >
        <div className="sr-head">
          <div className="sr-avatar">{initials(staff?.name || "")}</div>
          <div className="sr-head-text">
            <div className="sr-name">{staff?.name || "Staff report"}</div>
            <div className="sr-sub">
              {staff
                ? [
                    staff.designation,
                    staff.role,
                    staff.gender,
                  ].filter((v) => v && v !== staff.designation).join(" · ")
                : ""}
            </div>
          </div>
          {data && (
            <button
              className="btn gold"
              type="button"
              onClick={() => downloadStaffReport(data)}
            >
              Download PDF
            </button>
          )}
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
                  <Detail label="Designation" value={staff.designation} />
                  <Detail label="Phone" value={staff.phone} />
                  <Detail label="Email" value={staff.email} />
                  <Detail
                    label="Date of birth"
                    value={staff.date_of_birth ? formatDay(staff.date_of_birth) : ""}
                  />
                  <Detail label="Gender" value={staff.gender} />
                  <Detail label="Marital status" value={staff.marital_status} />
                  <Detail label="Present address" value={staff.present_address} />
                  <Detail label="Permanent address" value={staff.permanent_address} />
                  <Detail label="Aadhaar card" value={staff.aadhaar_card} />
                  <Detail label="Emergency number" value={staff.emergency_number} />
                  <Detail label="Driving license" value={staff.driving_license} />
                  <Detail
                    label="Recorded on"
                    value={staff.recorded_on ? formatDay(staff.recorded_on) : ""}
                  />
                </div>
              </section>

              <section className="sr-section">
                <SalarySection salary={data.salary} />
              </section>

              <section className="sr-section">
                <AttendanceSection attendance={data.attendance} />
              </section>

              <p className="sr-foot">
                Salary is what is on record per month, each with the date it was
                actually paid. Attendance counts only days someone marked.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}