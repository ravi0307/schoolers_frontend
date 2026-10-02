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
 * "2026-09" shifted by whole months, e.g. -1 -> "2026-08", -6 -> "2026-03".
 * Used to move the salary window a page at a time without asking the server
 * what "the previous window" means. Returns null for anything that is not a
 * month, so a malformed anchor cannot become a request.
 */
export function shiftMonth(month, delta) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(month ?? ""));
  if (!match) return null;
  // A single month index so December rolls into the next year, and going back
  // far enough borrows from the year before.
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + Number(delta || 0);
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}`;
}

/** The month the browser is in, as "YYYY-MM" -- the newest anchor worth showing. */
export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The salary_end that pages the window one full page back or forward.
 *
 * "Older" steps off the earliest month on screen, so the months just browsed
 * stay visible as the top of the next page rather than disappearing.
 *
 * "Newer" is clamped to `now`: a window that has fallen behind (left open
 * across a term, say) can still be walked forward to this month, but a page can
 * never end in a month that has not happened yet -- three future rows with a
 * dash in each would read as months already unpaid.
 */
export function salaryPageAnchor(salary, direction, now = currentMonth()) {
  const window = salary?.window || [];
  const size = Number(salary?.window_size || window.length || 0);
  if (!window.length || !size) return null;
  const older = direction === "older";
  const edge = older ? window[0] : window[window.length - 1];
  const anchor = shiftMonth(edge, older ? -size : size);
  if (!older && anchor && now && anchor > now) return now;
  return anchor;
}

/**
 * Whether a "newer" page exists: true while stepping forward would actually
 * change the window. Once it already ends at `now`, the control is dead.
 */
export function salaryCanPageNewer(salary, now = currentMonth()) {
  const window = salary?.window || [];
  if (!window.length) return false;
  return salaryPageAnchor(salary, "newer", now) !== window[window.length - 1];
}

/** "Sep 2026" when a month is on screen, "All time" when nothing is filtered. */
export function attendanceScopeLabel(attendance) {
  return attendance?.month ? monthLabel(attendance.month) : "All time";
}

/** The admin's remark on a payment, or null when there was none. */
export function salaryNote(record) {
  const note = record?.note;
  return note && String(note).trim() ? String(note).trim() : null;
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