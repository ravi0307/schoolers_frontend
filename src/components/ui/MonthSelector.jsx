import { useState } from "react";
import {
  currentMonthAnchor,
  formatMonthWindow,
  fromMonthInputValue,
  shiftMonthAnchor,
  toMonthInputValue,
} from "../../utils/accountsFlow";

/**
 * Month navigation for the accounts grids.
 *
 * Mirrors WeekSelector: arrows step the window, an input jumps straight to a
 * month, and a shortcut returns to the current one. The difference is what the
 * window is anchored on. A week selector moves to the *next* week and the
 * columns become that week; here the anchor is the last month shown, so moving
 * back one step keeps the six months ending a month earlier rather than
 * skipping a month in the middle of the grid.
 *
 * Each grid gets its own instance, so an admin comparing September salaries
 * against March fees can hold the two windows apart.
 */
export default function MonthSelector({ anchor, onChange, busy = false, label = "period" }) {
  const [picked, setPicked] = useState(() => toMonthInputValue(anchor));

  const current = currentMonthAnchor();
  const isCurrent = anchor === current;

  function go(delta) {
    const next = shiftMonthAnchor(anchor, delta);
    setPicked(toMonthInputValue(next));
    onChange(next);
  }

  function goToCurrent() {
    setPicked(toMonthInputValue(current));
    onChange(current);
  }

  // A month input gives an admin a direct jump. Anything unparseable is
  // ignored rather than sent, so a half-typed year cannot shift the grid.
  function onPick(value) {
    setPicked(value);
    const usable = fromMonthInputValue(value);
    if (usable) onChange(usable);
  }

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
      <span className="week-selector-range">{formatMonthWindow(anchor)}</span>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(1)}
        // Nothing is recorded beyond the current month, so the forward controls
        // are disabled there rather than paging into empty months.
        disabled={busy || isCurrent}
        title="Next month"
        aria-label="Next month"
      >
        &#8594;
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={() => go(6)}
        disabled={busy || isCurrent}
        title="Six months later"
        aria-label="Six months later"
      >
        &#187;
      </button>
      <input
        className="week-selector-date"
        type="month"
        value={picked}
        onChange={(event) => onPick(event.target.value)}
        aria-label={`Jump to ${label} month`}
      />
      {!isCurrent && (
        <button className="btn ghost" type="button" onClick={goToCurrent} disabled={busy}>
          This month
        </button>
      )}
    </div>
  );
}
