/**
 * Presentation helpers for the per-student report.
 *
 * These are pure on purpose. The report is the first thing in this app where
 * a missing value is a meaningful, expected state rather than a bug: a student
 * with no marks, or no attendance ever recorded, is normal. Getting that wrong
 * produces the two most damaging outputs a report can have -- a "0%" for a
 * student nobody ever marked, and a list of blank subjects that reads as a
 * failure rather than as an absence of data.
 */

/** Attendance as a percentage, or null when nothing was ever marked. */
export function attendancePercentage(attendance) {
  const marked = Number(attendance?.marked_days || 0);
  if (!marked) return null;
  const present = Number(attendance.present || 0);
  return Math.round((present * 1000) / marked) / 10;
}

/** "83.3%" or "No records". Never "0%" for a student who was never marked. */
export function attendanceLabel(attendance) {
  const pct = attendancePercentage(attendance);
  if (pct === null) return "No records";
  return `${pct}%`;
}

/**
 * The tone for an attendance figure.
 *
 * Deliberately lenient. A child at 79% is not in trouble, and a report that
 * paints 80% amber would cry wolf on most of any class. These thresholds are a
 * display convention, not a school policy, and are the only place in this file
 * where a number becomes a judgement.
 */
export function attendanceTone(attendance) {
  const pct = attendancePercentage(attendance);
  if (pct === null) return "mute";
  // These names are Pill's own vocabulary. Returning anything else renders an
  // unstyled pill, which is how "good"/"bad" got in here and shipped looking
  // like a bug nobody could reproduce.
  if (pct >= 90) return "ok";
  if (pct >= 80) return "info";
  return "warn";
}

/** Human description of the period the attendance numbers cover. */
export function attendanceRangeLabel(attendance) {
  const from = attendance?.from_date;
  const to = attendance?.to_date;
  if (!from || !to) return "";
  if (from === to) return formatDay(from);
  return `${formatDay(from)} – ${formatDay(to)}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09-25" -> "25 Sep 2026". Returns the input if it is not a date. */
export function formatDay(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return String(value);
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1] || month} ${year}`;
}

/**
 * "3 of 6 subjects graded", or null when the term is complete or empty.
 *
 * The point is to stop a term with three scores reading like a report card
 * with three straight results. When every active subject is graded there is
 * nothing to caveat, so the caller shows nothing.
 */
export function subjectCoverage(term) {
  if (!term) return null;
  const graded = Number(term.graded_subjects || 0);
  const total = Number(term.total_subjects || 0);
  if (!total || !graded) return null;
  if (graded >= total) return null;
  return `${graded} of ${total} subjects graded`;
}

/**
 * The average, formatted, or a dash when there is nothing to average.
 *
 * A null average is returned for a term with no marks at all, and must not be
 * rendered as 0 -- "0%" would say the student failed everything.
 */
export function averageLabel(term) {
  if (!term || term.average === null || term.average === undefined) return "—";
  const value = Number(term.average);
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

/** Terms newest-first for the report's selector, without mutating the input. */
export function termsForSelector(terms) {
  return [...(terms || [])].reverse();
}

/**
 * The term to open on.
 *
 * The last term in the payload, which the API sorts ascending, so the newest
 * term is what an admin opening a report expects to see first.
 */
export function defaultTerm(terms) {
  if (!terms || !terms.length) return null;
  return terms[terms.length - 1];
}

/** Group thousands the way the rest of the app does. */
export function groupDigits(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// ---- The student picker above the report ----

/**
 * The students API returns class_id with no name, so class names are resolved
 * once from /classes and joined in here. Adding class_name to the shared
 * StudentRead schema would be a wider change than a reports page warrants, and
 * it would put a reports concern into the parent portal's payload too.
 */
export function classNameFor(classesById, classId) {
  return classesById?.[classId] || "";
}

/**
 * Matches a student by name, admission number or class, case-insensitively.
 *
 * The class is matched by name *and* by id, because an admin who thinks in
 * class ids ("class 2") and one who reads class names off a register
 * ("Class 2") should both find the same student.
 */
export function filterStudents(students, query, classesById = {}) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return students || [];
  return (students || []).filter((s) => {
    const className = classNameFor(classesById, s.class_id);
    return [s.name, s.admission_no, className, s.class_id]
      .some((v) => v != null && String(v).toLowerCase().includes(needle));
  });
}
