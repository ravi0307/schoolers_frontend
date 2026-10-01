/**
 * Month-window arithmetic for the accounts grids.
 *
 * The window is anchored on its LAST month rather than its first, and that
 * choice is what makes the selector usable. An admin paging back through
 * salary history wants to move the *recent* edge and keep the six months
 * before it, the same way the timetable's week selector moves a window of
 * fixed length. Anchoring the first month instead would page the whole window
 * in the wrong direction relative to the arrows.
 *
 * All of this mirrors `month_window` in the accounts service, which is what
 * actually decides which months the response contains. These helpers only
 * compute the anchor to send and the label to draw; the server remains the
 * authority on the window itself.
 */

export const DEFAULT_WINDOW_MONTHS = 6;

const MONTH_LABELS = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** True for a well-formed 'YYYY-MM' anchor. */
export function isValidMonthAnchor(value) {
  return ISO_MONTH.test(String(value || ""));
}

/** The current month as a 'YYYY-MM' anchor. */
export function currentMonthAnchor(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function toParts(anchor) {
  const value = String(anchor);
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

function toAnchor(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Shift an anchor by `delta` months, rolling across year boundaries. */
export function shiftMonthAnchor(anchor, delta) {
  const { year, month } = toParts(anchor);
  const index = year * 12 + (month - 1) + delta;
  return toAnchor(Math.floor(index / 12), (index % 12) + 1);
}

/** 'Sep 2026' for a 'YYYY-MM' value. */
export function formatMonthAnchor(anchor) {
  if (!isValidMonthAnchor(anchor)) return "";
  const { year, month } = toParts(anchor);
  return `${MONTH_LABELS[String(month).padStart(2, "0")]} ${year}`;
}

/** The inclusive range an anchored window covers, e.g. 'Apr 2026 – Sep 2026'. */
export function formatMonthWindow(anchor, count = DEFAULT_WINDOW_MONTHS) {
  if (!isValidMonthAnchor(anchor)) return "";
  return `${formatMonthAnchor(shiftMonthAnchor(anchor, -(count - 1)))} – ${formatMonthAnchor(anchor)}`;
}

/** The 'YYYY-MM' values an anchored window covers, oldest first. */
export function monthWindowValues(anchor, count = DEFAULT_WINDOW_MONTHS) {
  if (!isValidMonthAnchor(anchor)) return [];
  return Array.from({ length: count }, (_, i) => shiftMonthAnchor(anchor, i - (count - 1)));
}

/**
 * The '<input type="month">' value for an anchor.
 *
 * `type="month"` is used rather than `type="date"`: the window is made of whole
 * calendar months, so letting an admin pick a specific day of a month would
 * only mean truncating it to something they did not intend.
 */
export function toMonthInputValue(anchor) {
  return isValidMonthAnchor(anchor) ? anchor : "";
}

/** A raw 'YYYY-MM' input value, or "" when it is not usable. */
export function fromMonthInputValue(value) {
  return isValidMonthAnchor(value) ? value : "";
}

/** An anchor split into numbers, or null when it is not one. */
export function monthAnchorParts(anchor) {
  if (!isValidMonthAnchor(anchor)) return null;
  const { year, month } = toParts(anchor);
  return { year, month };
}

/** An anchor rebuilt from a year and a month, or "" when they do not make one. */
export function anchorFromParts(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m)) return "";
  if (m < 1 || m > 12) return "";
  if (y < 1000 || y > 9999) return "";
  return toAnchor(y, m);
}

/** True when `anchor` is later than `other`. Both must be well-formed. */
export function isAfterMonthAnchor(anchor, other) {
  if (!isValidMonthAnchor(anchor) || !isValidMonthAnchor(other)) return false;
  return toParts(anchor).year * 12 + toParts(anchor).month
    > toParts(other).year * 12 + toParts(other).month;
}

/**
 * The months a picker should offer, as full names.
 *
 * Full names rather than the three-letter forms the grid headers use: a closed
 * list has room for them, and "September" beside "2026" is unambiguous where
 * "Sep" beside a year column might be read as a date.
 */
export const MONTH_OPTIONS = [
  ["01", "January"], ["02", "February"], ["03", "March"], ["04", "April"],
  ["05", "May"], ["06", "June"], ["07", "July"], ["08", "August"],
  ["09", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
].map(([value, label]) => ({ value, label }));

/**
 * The years a picker should offer, oldest first.
 *
 * Both the year on screen and the current year are always included, whichever
 * way they sit: an admin who has paged forward still needs their own year
 * listed, and the current year is what the range label is measured against.
 * The span is generous rather than tight, because the cost of offering a year
 * that holds nothing is one wasted row, and the cost of not offering one that
 * does is a figure the admin cannot reach.
 */
export function yearOptions(anchor, { back = 4, forward = 2, current = currentMonthAnchor() } = {}) {
  const shown = isValidMonthAnchor(anchor) ? toParts(anchor).year : 0;
  const thisYear = toParts(current).year;
  const first = Math.min(shown, thisYear - back);
  const last = Math.max(shown, thisYear + forward);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
