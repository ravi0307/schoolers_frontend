import {
  DEFAULT_WINDOW_MONTHS,
  currentMonthAnchor,
  formatMonthWindow,
  shiftMonthAnchor,
} from "../../utils/accountsFlow";
import MonthYearPicker from "./MonthYearPicker";

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

  function go(delta) {
    onChange(shiftMonthAnchor(anchor, delta));
  }

  function goToCurrent() {
    onChange(current);
  }

  return (
    <div className="week-selector" role="group" aria-label={`Select ${label}`}>
      <MonthYearPicker
        value={anchor}
        onChange={onChange}
        disabled={busy}
        // A grid that holds no future months gets a boundary, and the picker
        // greies the future out of its lists to match the arrows above. A grid
        // that can read months a deposit has written ahead gets none.
        stopAt={allowFuture ? "" : current}
        monthLabel={`${label} month`}
        yearLabel={`${label} year`}
      />
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
