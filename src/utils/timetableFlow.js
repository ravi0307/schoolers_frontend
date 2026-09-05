export const TIMETABLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
