import {
  MONTH_OPTIONS,
  anchorFromParts,
  isAfterMonthAnchor,
  monthAnchorParts,
  yearOptions,
} from "../../utils/accountsFlow";

/**
 * A month and a year, as two dropdowns.
 *
 * A native month input draws its own month and year spinners, so how it looks
 * is the browser's decision rather than ours; it also differs between platforms,
 * and on several of them the field is a text box that will read a half-typed
 * year as a real one. A pair of `<select>`s can only ever hold valid values,
 * which means nothing downstream can be pointed at a month that does not exist,
 * and both pick up the page's own styling.
 *
 * Each half is resolved against the other, so this is one control split in two:
 * picking April in 2027 when the value is September 2026 is April 2027, not an
 * April that failed to leave 2026 behind.
 *
 * `stopAt` is the boundary a picker that holds no future values should stop at.
 * It is passed in rather than read from the clock here, because whether the
 * future is reachable is the caller's decision -- the fee grid can read months
 * a deposit has written ahead, the salary grid cannot.
 */
export default function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  stopAt = "",
  monthLabel = "Month",
  yearLabel = "Year",
}) {
  // Falls back to the stop rather than to nothing: a picker with no value has to
  // render *something* selected, and the stop is the only month it is willing to
  // stand on.
  const parts = monthAnchorParts(value) || monthAnchorParts(stopAt) || { year: "", month: "" };
  const years = yearOptions(value, { current: stopAt || undefined });

  // No boundary means no bound: with nothing to stop at, every month of every
  // listed year is a legal value.
  const bounded = Boolean(stopAt);
  const monthUnavailable = (month) =>
    bounded && isAfterMonthAnchor(anchorFromParts(parts.year, month), stopAt);
  // A year is tested on its FIRST month, not its last. January of next year is
  // the only month that can put a whole year ahead of the stop, and a year is
  // out of reach exactly when its January has not arrived -- testing December
  // instead would grey out the current year itself, which is where the caller is
  // standing and the one year that must stay selectable.
  const yearUnavailable = (year) =>
    bounded && isAfterMonthAnchor(anchorFromParts(year, 1), stopAt);

  function onPickMonth(month) {
    const next = anchorFromParts(parts.year, month);
    if (next) onChange(next);
  }

  function onPickYear(year) {
    const next = anchorFromParts(year, parts.month);
    if (next) onChange(next);
  }

  return (
    <>
      <select
        className="week-selector-pick"
        value={String(parts.month).padStart(2, "0")}
        onChange={(event) => onPickMonth(event.target.value)}
        disabled={disabled}
        aria-label={monthLabel}
      >
        {MONTH_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={monthUnavailable(option.value)}
          >
            {option.label}
          </option>
        ))}
      </select>
      <select
        className="week-selector-pick"
        value={String(parts.year)}
        onChange={(event) => onPickYear(event.target.value)}
        disabled={disabled}
        aria-label={yearLabel}
      >
        {years.map((year) => (
          <option key={year} value={year} disabled={yearUnavailable(year)}>
            {year}
          </option>
        ))}
      </select>
    </>
  );
}
