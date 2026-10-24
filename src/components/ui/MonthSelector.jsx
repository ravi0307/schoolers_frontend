import {
  currentMonthAnchor,
} from "../../utils/accountsFlow";
import MonthYearPicker from "./MonthYearPicker";

/**
 * Month selection for the accounts grids.
 *
 * Mirrors WeekSelector's direct selection controls: a pair of dropdowns jumps
 * straight to a month, and a shortcut returns to the current one. The anchor
 * is the last month shown in the accounts grid.
 *
 * The jump is two dropdowns rather than a month picker input. The native month
 * control renders its own month and year spinners, and how that looks is the
 * browser's decision rather than ours -- it is also inconsistent between
 * platforms, and on several of them the field is a text box waiting for a
 * half-typed year to be read as a real one. A pair of dropdowns can only ever
 * hold valid values, which means the grid cannot be shifted onto a month that
 * does not exist, and it picks up the page's own styling.
 *
 * `allowFuture` decides whether the picker stops at this month. A fee deposit
 * can write months after the current one, so the fee grid must keep those
 * months readable while salary stays bounded at the current month.
 *
 * The dropdowns respect the same boundary, so blocked future months cannot be
 * reached through a direct jump either.
 */
export default function MonthSelector({
  anchor,
  onChange,
  busy = false,
  label = "period",
  allowFuture = false,
}) {
  const current = currentMonthAnchor();
  const isCurrent = anchor === current;

  function goToCurrent() {
    onChange(current);
  }

  return (
    <div className="week-selector" role="group" aria-label={`Select ${label}`}>
      <MonthYearPicker
        value={anchor}
        onChange={onChange}
        disabled={busy}
        // A grid that holds no future months gets a boundary. A grid that can
        // read months a deposit has written ahead gets none.
        stopAt={allowFuture ? "" : current}
        monthLabel={`${label} month`}
        yearLabel={`${label} year`}
      />
      {/* Return to the current month without stepping through each month. */}
      {!isCurrent && (
        <button className="btn ghost" type="button" onClick={goToCurrent} disabled={busy}>
          This month
        </button>
      )}
    </div>
  );
}
