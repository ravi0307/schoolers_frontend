/**
 * Presentation helpers for the per-staff report.
 *
 * The staff report is the student report's mirror for the people who get paid:
 * the same honesty rules, aimed at a different set of consequences. A salary
 * with no record must not read as "paid nothing", months nobody marked must not
 * read as absences, and a paid amount is pinned to the date it was actually
 * paid so an old figure is not mistaken for this month's.
 *
 * The attendance helpers are the student report's own, imported here: staff
 * attendance is the same shape (marked_days + status counts + a percentage the
 * tests agree on), so re-deriving it would be two opinions about one number.
 */

import {
  attendanceLabel,
  attendanceRangeLabel,
  attendanceTone,
  formatDay,
} from "./studentReport.js";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09" -> "Sep 2026". Returns the input if it is not a month. */
export function monthLabel(month) {
  if (!month) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(String(month));
  if (!match) return String(month);
  return `${MONTHS[Number(match[2]) - 1] || match[2]} ${match[1]}`;
}

/** The window as a phrase, e.g. "Apr 2026 – Sep 2026". */
export function salaryWindowLabel(salary) {
  const window = salary?.window || [];
  if (!window.length) return "";
  return `${monthLabel(window[0])} – ${monthLabel(window[window.length - 1])}`;
}

/** Group an amount the way the ledger does, keeping decimals. */
export function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "—";
  const [whole, frac] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * One row per window month, oldest first, with the record where one exists.
 *
 * An unpaid month is a row with a null record (rendered as "—"), exactly like
 * the accounts grid. No record is a dash, never a "0" that reads as a payment
 * of nothing.
 */
export function salaryRows(salary) {
  const byMonth = new Map((salary?.records || []).map((r) => [r.month, r]));
  return (salary?.window || []).map((month) => ({
    month,
    record: byMonth.get(month) || null,
  }));
}

/** The headline figures under the salary table. */
export function salaryHeadline(salary) {
  return {
    monthsPaid: salary?.months_paid || 0,
    outstanding: salary?.outstanding_months || 0,
    total: formatAmount(salary?.total_paid),
    // Null when nothing is on record, never a confident zero.
    average: salary?.average_monthly === null || salary?.average_monthly === undefined
      ? "—"
      : formatAmount(salary.average_monthly),
  };
}

/** Whether any attendance has ever been marked for this person. */
export function hasAttendance(attendance) {
  return Boolean(attendance && Number(attendance.marked_days || 0) > 0);
}

/**
 * The tone for a staff attendance day's status pill. Staff days carry four
 * statuses, so present-on-leave/half-day map to info rather than the student
 * report's warn-for-everything.
 */
export function statusTone(status) {
  switch (status) {
    case "Present": return "ok";
    case "Half day": return "info";
    case "On leave": return "info";
    case "Absent": return "warn";
    default: return "mute";
  }
}

/**
 * Matches a staff member by name, role, designation or phone, case-insensitive.
 *
 * The staff API sends role_title and role; a search for either habit ("maths
 * teacher" or "teacher") should hit. Positioned here rather than on the page so
 * node tests can reach it -- the pages are untestable by import.
 */
export function filterStaff(staff, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return staff || [];
  return (staff || []).filter((s) =>
    [s.name, s.role, s.role_title, s.person_type, s.phone]
      .some((v) => v != null && String(v).toLowerCase().includes(needle))
  );
}

export { attendanceLabel, attendanceRangeLabel, attendanceTone, formatDay };