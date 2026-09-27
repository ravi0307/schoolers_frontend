export const TIMETABLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` for a Date, in local time (not UTC, which can shift the day). */
export function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The Monday of the week containing `value`, as `YYYY-MM-DD`.
 * Mirrors the backend's `common/week.py`; if the two ever disagree the UI
 * would highlight the wrong column as a holiday.
 */
export function startOfWeekIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return toIsoDate(monday);
}

/** Shift an ISO week start by whole weeks. */
export function shiftWeekIso(weekStartIso, weeks) {
  const [year, month, day] = weekStartIso.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + weeks * 7);
  return toIsoDate(shifted);
}

export function isSameWeekIso(weekStartIso, otherIso) {
  return weekStartIso === startOfWeekIso(otherIso);
}

/**
 * "21 Sep - 27 Sep 2026". Month names come from a fixed table rather than
 * `toLocaleString`, whose abbreviation varies by ICU build ("Sept" vs "Sep")
 * and would make the label unstable.
 */
export function formatWeekRange(weekStartIso) {
  const [year, month, day] = weekStartIso.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 6);
  const monthName = (d) => MONTH_NAMES[d.getMonth()];
  return `${start.getDate()} ${monthName(start)} - ${end.getDate()} ${monthName(end)} ${end.getFullYear()}`;
}

/**
 * The seven `{ day, date }` columns for a week, Monday first.
 * Built locally so the grid can render before/while the week request is in
 * flight; the API response is the source of truth for holiday flags.
 *
 * `weekStartIso` is snapped to its Monday here too, matching the backend, so a
 * stray mid-week date can never produce Tue..Mon columns.
 */
export function buildWeekColumns(weekStartIso) {
  return weekDatesFromIso(startOfWeekIso(weekStartIso));
}

function weekDatesFromIso(mondayIso) {
  const [year, month, day] = mondayIso.split("-").map(Number);
  return TIMETABLE_DAYS.map((dayName, index) => {
    const date = new Date(year, month - 1, day + index);
    return {
      day: dayName,
      date: toIsoDate(date),
      isHoliday: false,
      holidayName: null,
      entries: [],
    };
  });
}

/** Merge a `/timetable/class/{id}/week` response onto locally built columns. */
export function mergeWeekColumns(columns, week) {
  if (!week?.days?.length) return columns;
  const byDay = new Map(week.days.map((d) => [d.day_of_week, d]));
  return columns.map((column) => {
    const day = byDay.get(column.day);
    if (!day) return column;
    return {
      ...column,
      date: day.date || column.date,
      isHoliday: Boolean(day.is_holiday),
      holidayName: day.holiday_name || null,
      entries: day.entries || [],
    };
  });
}

/**
 * `{ "2026-11-08": "Diwali" }` from a `GET /holidays` list.
 *
 * Keyed by *date*, not weekday. Holidays are specific calendar dates, so a
 * weekday key would mark every future Diwali, which is exactly the recurring
 * behaviour this feature deliberately does not have.
 */
export function holidayMapByDate(holidays = []) {
  return new Map(
    (holidays || [])
      .filter((h) => h?.holiday_date)
      .map((h) => [h.holiday_date, h.occasion]),
  );
}

/**
 * `{ Sat: "Diwali" }` for the holidays falling inside one week, keyed by weekday.
 *
 * For the class-picker summary, which has no week endpoint of its own: it needs
 * the weekdays highlighted for whichever week the admin is currently looking at,
 * which is what makes it agree with the main grid.
 */
export function holidayNamesByWeekday(holidays = [], weekStartIso) {
  const byDate = holidayMapByDate(holidays);
  const byWeekday = {};
  for (const column of buildWeekColumns(weekStartIso)) {
    const name = byDate.get(column.date);
    if (name) byWeekday[column.day] = name;
  }
  return byWeekday;
}

/** `2026-11-08` -> `8 Nov 2026`, for the holiday table. */
export function formatHolidayDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return String(isoDate);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function toTimeInput(value = "") {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function displayTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function isValidTimeRange(start, end) {
  return Boolean(start && end && start < end);
}

export function buildCreatePeriodPayload({ start, end, subjectId, teacherId, day }) {
  return {
    period_time: `${displayTime(start)} - ${displayTime(end)}`,
    subject_id: subjectId ? Number(subjectId) : null,
    teacher_id: teacherId ? Number(teacherId) : null,
    day_of_week: day || null,
  };
}

export function buildUpdateEntryPayload({ start, end, subjectId, teacherId }) {
  return {
    subject_id: Number(subjectId),
    teacher_id: Number(teacherId),
    period_start_time: start,
    period_end_time: end,
  };
}

export function getEntryTime(entry, periodById) {
  if (entry.period_start_time && entry.period_end_time) {
    return `${displayTime(entry.period_start_time)} - ${displayTime(entry.period_end_time)}`;
  }
  return periodById.get(String(entry.period_id))?.period_time || "";
}
