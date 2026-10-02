import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatWeekRange,
  shiftWeekIso,
  startOfWeekIso,
} from "../../utils/timetableFlow";
import styles from "./WeekNavigator.module.css";

export default function WeekNavigator({ weekStart, onChange, busy = false }) {
  const [pickerValue, setPickerValue] = useState(weekStart);
  const currentWeek = startOfWeekIso();
  const isCurrentWeek = weekStart === currentWeek;
  const pickedDateLabel = pickerValue
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${pickerValue}T12:00:00`))
    : "Choose date";

  useEffect(() => {
    setPickerValue(weekStart);
  }, [weekStart]);

  function go(delta) {
    const nextWeek = shiftWeekIso(weekStart, delta);
    setPickerValue(nextWeek);
    onChange(nextWeek);
  }

  function goToToday() {
    setPickerValue(currentWeek);
    onChange(currentWeek);
  }

  function onPickDate(value) {
    setPickerValue(value);
    if (value) onChange(startOfWeekIso(value));
  }

  return (
    <div
      className={`week-selector ${styles.navigator}`}
      role="group"
      aria-label="Select timetable week"
    >
      <div className={styles.weekGroup}>
        <button
          className="btn ghost"
          type="button"
          onClick={() => go(-1)}
          disabled={busy}
          aria-label="Previous week"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <span className={`week-selector-range ${styles.range}`} aria-live="polite">
          {formatWeekRange(weekStart)}
        </span>
        <button
          className="btn ghost"
          type="button"
          onClick={() => go(1)}
          disabled={busy}
          aria-label="Next week"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      <label className={styles.dateTrigger}>
        <CalendarDays aria-hidden="true" size={17} />
        <span>{pickedDateLabel}</span>
        <input
          className={`week-selector-date ${styles.dateInput}`}
          type="date"
          value={pickerValue}
          onChange={(event) => onPickDate(event.target.value)}
          aria-label="Jump to week"
          disabled={busy}
        />
      </label>

      {!isCurrentWeek && (
        <button
          className="btn ghost"
          type="button"
          onClick={goToToday}
          disabled={busy}
        >
          This week
        </button>
      )}
    </div>
  );
}
