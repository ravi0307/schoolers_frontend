import { useState } from "react";
import {
  formatWeekRange,
  shiftWeekIso,
  startOfWeekIso,
} from "../../utils/timetableFlow";

/**
 * Week navigation for the timetable views.
 *
 * The timetable is a recurring Mon–Sun template, so the selector changes which
 * calendar week the columns are labelled with — it defaults to the current
 * week. Holidays come from the API per week, so a week change also re-resolves
 * which days are flagged.
 */
export default function WeekSelector({ weekStart, onChange, busy = false }) {
  const [pickerValue, setPickerValue] = useState(weekStart);

  const currentWeek = startOfWeekIso();
  const isCurrentWeek = weekStart === currentWeek;

  function go(delta) {
    setPickerValue(shiftWeekIso(weekStart, delta));
    onChange(shiftWeekIso(weekStart, delta));
  }

  function goToToday() {
    setPickerValue(currentWeek);
    onChange(currentWeek);
  }

  // A date input lets an admin jump straight to a week; the value is snapped to
  // that week's Monday so it always lines up with the API's week_start.
  function onPickDate(value) {
    setPickerValue(value);
    if (value) onChange(startOfWeekIso(value));
  }

  return (
    <div className="week-selector" role="group" aria-label="Select timetable week">
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(-1)}
        disabled={busy}
        title="Previous week"
        aria-label="Previous week"
      >
        &#8592;
      </button>
      <span className="week-selector-range">{formatWeekRange(weekStart)}</span>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(1)}
        disabled={busy}
        title="Next week"
        aria-label="Next week"
      >
        &#8594;
      </button>
      <input
        className="week-selector-date"
        type="date"
        value={pickerValue}
        onChange={(event) => onPickDate(event.target.value)}
        aria-label="Jump to week"
      />
      {!isCurrentWeek && (
        <button className="btn ghost" type="button" onClick={goToToday} disabled={busy}>
          This week
        </button>
      )}
    </div>
  );
}
