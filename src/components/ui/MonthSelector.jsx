import {
  DEFAULT_WINDOW_MONTHS,
  MONTH_OPTIONS,
  anchorFromParts,
  currentMonthAnchor,
  formatMonthWindow,
  isAfterMonthAnchor,
  monthAnchorParts,
  shiftMonthAnchor,
  yearOptions,
} from "../../utils/accountsFlow";

/**
 * Month navigation for the accounts grids.
 *
 * Mirrors WeekSelector: arrows step the window, a pair of dropdowns jumps
 * straight to a month, and a shortcut returns to the current one. The difference
 * is what the window is anchored on. A week selector moves to the *next* week
 * and the columns become that week; here the anchor is the last month shown, so
 * moving back one step keeps the months ending a month earlier rather than
 * skipping a month in the middle of the grid.
 *
 * The jump is two dropdowns rather than a month picker input. The native month
 * control renders its own month and year spinners, and how that looks is the
 * browser's decision rather than ours -- it is also inconsistent between
 * platforms, and on several of them the field is a text box waiting for a
 * half-typed year to be read as a real one. A pair of dropdowns can only ever
 * hold valid values, which means the grid cannot be shifted onto a month that
 * does not exist, and it picks up the page's own styling.
 *
 * Each grid gets its own instance, so an admin comparing September salaries
 * against March fees can hold the two windows apart. `months` is the width of
 * the window the caller asked for, and it labels the range honestly: the salary
 * grid shows two months, and a selector reading "Apr 2026 – Sep 2026" above it
 * would promise columns that are not there.
 *
 * `allowFuture` decides whether the forward controls stop at this month. They
 * used to stop there for both grids, on the reasoning that nothing is recorded
 * beyond now. A fee deposit breaks that: recording a term in September writes
 * the months after it, so those months hold figures an admin needs to read back
 * to check the deposit. The fee grid therefore pages forward, and the shortcut
 * back to the current month is what stops the grid being lost in the future.
 *
 * The dropdowns respect the same boundary, because a control that refuses to
 * page forward but will happily jump there is not refusing anything.
 */
export default function MonthSelector({
  anchor,
  onChange,
  busy = false,
  label = "period",
  months = DEFAULT_WINDOW_MONTHS,
  allowFuture = false,
}) {
  const current = currentMonthAnchor();
  const isCurrent = anchor === current;

  // The dropdowns are controlled by the anchor rather than by local state: the
  // anchor is what the grid is showing, so a value that disagrees with it is a
  // value that would claim to be looking at a month it is not.
  const parts = monthAnchorParts(anchor) || monthAnchorParts(current);
  const years = yearOptions(anchor, { current });

  function go(delta) {
    onChange(shiftMonthAnchor(anchor, delta));
  }

  function goToCurrent() {
    onChange(current);
  }

  // Either dropdown can move the window, so both are resolved against the other:
  // picking April in 2027 when the grid shows September 2026 is a jump of seven
  // months, not of four.
  function onPickMonth(month) {
    const next = anchorFromParts(parts.year, month);
    if (next) onChange(next);
  }

  function onPickYear(year) {
    const next = anchorFromParts(year, parts.month);
    if (next) onChange(next);
  }

  // What a grid that cannot show the future should not offer. Greyed out rather
  // than missing, so the list still reads as a whole year and not a truncated
  // one.
  const monthUnavailable = (month) => {
    if (allowFuture) return false;
    return isAfterMonthAnchor(anchorFromParts(parts.year, month), current);
  };

  // A year is tested on its FIRST month, not its last. January of next year is
  // the only one that can be a whole year ahead of now, and a year is out of
  // reach exactly when its January has not arrived -- testing December instead
  // would grey out the current year itself, which is where the grid is standing
  // and the one year that must stay selectable.
  const yearUnavailable = (year) => {
    if (allowFuture) return false;
    return isAfterMonthAnchor(anchorFromParts(year, 1), current);
  };

  return (
    <div className="week-selector" role="group" aria-label={`Select ${label}`}>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(-6)}
        disabled={busy}
        title="Six months earlier"
        aria-label="Six months earlier"
      >
        &#171;
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(-1)}
        disabled={busy}
        title="Previous month"
        aria-label="Previous month"
      >
        &#8592;
      </button>
      <span className="week-selector-range">{formatMonthWindow(anchor, months)}</span>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(1)}
        // A grid that holds no future months should not page into them. One
        // that does -- the fee grid, once a deposit can write months ahead --
        // has figures out there waiting to be read back.
        disabled={busy || (!allowFuture && isCurrent)}
        title="Next month"
        aria-label="Next month"
      >
        &#8594;
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(6)}
        disabled={busy || (!allowFuture && isCurrent)}
        title="Six months later"
        aria-label="Six months later"
      >
        &#187;
      </button>
      <select
        className="week-selector-pick"
        value={String(parts.month).padStart(2, "0")}
        onChange={(event) => onPickMonth(event.target.value)}
        disabled={busy}
        aria-label={`${label} month`}
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
        disabled={busy}
        aria-label={`${label} year`}
      >
        {years.map((year) => (
          <option key={year} value={year} disabled={yearUnavailable(year)}>
            {year}
          </option>
        ))}
      </select>
      {/* A grid that pages forward needs a way back that does not mean counting
          months down one at a time. */}
      {!isCurrent && (
        <button className="btn ghost" type="button" onClick={goToCurrent} disabled={busy}>
          This month
        </button>
      )}
    </div>
  );
}
