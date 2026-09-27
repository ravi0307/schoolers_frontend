import { formatWeekRange } from "../../utils/timetableFlow";

/**
 * The `Mon 21 Sep` / holiday header row shared by the timetable views.
 *
 * A holiday column is marked in red and labelled with the occasion's name, so an
 * admin or teacher can see which specific days of the selected week are
 * non-teaching and why. The day/date pairing and the holiday flags come from the
 * week endpoint, so the labels always match the week on screen.
 */
export default function WeekHeaderRow({ columns, weekStart, caption = "Day" }) {
  return (
    <thead>
      <tr className="timetable-week-head">
        <th className="timetable-week-caption">
          {caption}
          <span className="timetable-week-range">{formatWeekRange(weekStart)}</span>
        </th>
        {columns.map((column) => (
          <th
            key={column.day}
            className={column.isHoliday ? "timetable-day-holiday" : undefined}
            title={
              column.isHoliday
                ? `${column.holidayName || "Holiday"} - ${column.date}`
                : undefined
            }
          >
            <span className="timetable-day-name">{column.day}</span>
            <span className="timetable-day-date">{column.date}</span>
            {column.isHoliday && (
              <span className="timetable-day-flag">
                {column.holidayName || "Holiday"}
              </span>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}
