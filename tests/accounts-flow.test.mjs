import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WINDOW_MONTHS,
  MONTH_OPTIONS,
  anchorFromParts,
  currentMonthAnchor,
  formatMonthAnchor,
  formatMonthWindow,
  fromMonthInputValue,
  isAfterMonthAnchor,
  isValidMonthAnchor,
  monthAnchorParts,
  monthWindowValues,
  shiftMonthAnchor,
  toMonthInputValue,
  yearOptions,
} from "../src/utils/accountsFlow.js";

// The window is anchored on its LAST month. That is the whole reason the
// accounts selector pages correctly, so these tests pin the arithmetic rather
// than the rendering: a UI bug here shows an admin the wrong six months of
// someone's pay, which is worse than an obviously broken control.

test("the anchor is the last month, so paging back moves the whole window", () => {
  assert.equal(shiftMonthAnchor("2026-09", -1), "2026-08");
  // A window ending a month earlier is the six months before it, not a gap.
  assert.deepEqual(monthWindowValues("2026-08"), [
    "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
  ]);
});

test("the window is six months by default, oldest first, ending on the anchor", () => {
  assert.equal(DEFAULT_WINDOW_MONTHS, 6);
  assert.deepEqual(monthWindowValues("2026-09"), [
    "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
  ]);
});

test("paging rolls across year boundaries in both directions", () => {
  assert.equal(shiftMonthAnchor("2026-01", -1), "2025-12");
  assert.equal(shiftMonthAnchor("2025-12", 1), "2026-01");
  assert.equal(shiftMonthAnchor("2026-01", -6), "2025-07");
  assert.equal(shiftMonthAnchor("2026-12", 6), "2027-06");
  assert.deepEqual(monthWindowValues("2026-01"), [
    "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01",
  ]);
});

test("a window never repeats or skips a month", () => {
  // A duplicated or missing column would silently double-count a payment.
  for (const anchor of ["2025-11", "2026-01", "2026-07", "2026-12", "2027-03"]) {
    const values = monthWindowValues(anchor);
    assert.equal(new Set(values).size, values.length, `duplicate month at ${anchor}`);
    assert.deepEqual([...values].sort(), values, `window out of order at ${anchor}`);
    for (let i = 1; i < values.length; i += 1) {
      assert.equal(shiftMonthAnchor(values[i - 1], 1), values[i], `gap after ${values[i - 1]}`);
    }
  }
});

test("the window honours any length", () => {
  assert.deepEqual(monthWindowValues("2026-09", 1), ["2026-09"]);
  assert.deepEqual(monthWindowValues("2026-09", 3), ["2026-07", "2026-08", "2026-09"]);
  assert.equal(monthWindowValues("2026-09", 12).length, 12);
});

test("a malformed or impossible anchor is rejected, not silently coerced", () => {
  for (const bad of ["2026-13", "2026-00", "2026-9", "26-09", "2026/09", "202609", "sept", "", null, undefined]) {
    assert.equal(isValidMonthAnchor(bad), false, `${bad} should be rejected`);
    assert.equal(toMonthInputValue(bad), "");
    assert.equal(fromMonthInputValue(bad), "");
    assert.deepEqual(monthWindowValues(bad), []);
    assert.equal(formatMonthWindow(bad), "");
  }
});

test("a half-typed month input cannot shift the grid", () => {
  // The admin is mid-typing a year; the selector must ignore it rather than
  // jumping to a month they did not finish entering. The dropdowns cannot reach
  // this state at all -- the input below is kept for the deposit dialog, which
  // still takes a month input.
  assert.equal(fromMonthInputValue("2026-0"), "");
  assert.equal(fromMonthInputValue("202"), "");
});

test("an anchor splits into the year and month the dropdowns show", () => {
  assert.deepEqual(monthAnchorParts("2026-09"), { year: 2026, month: 9 });
  assert.deepEqual(monthAnchorParts("2026-01"), { year: 2026, month: 1 });
  // An anchor that is not one has no parts to show, and a null here must not be
  // read as year 0 by a dropdown rendering zero-padded values.
  assert.equal(monthAnchorParts("2026-13"), null);
  assert.equal(monthAnchorParts(""), null);
});

test("parts rebuild the anchor they came from", () => {
  for (const anchor of ["2026-09", "2026-01", "2026-12", "1999-07", "20260-01"]) {
    if (!isValidMonthAnchor(anchor)) continue;
    const { year, month } = monthAnchorParts(anchor);
    assert.equal(anchorFromParts(year, month), anchor);
  }
  // The month is zero-padded on the way out, or September would come back as
  // '2026-9' and be rejected as malformed.
  assert.equal(anchorFromParts(2026, 9), "2026-09");
  assert.equal(anchorFromParts("2026", "03"), "2026-03");
});

test("parts that do not make a month are refused, not coerced into one", () => {
  for (const [year, month] of [[2026, 0], [2026, 13], [2026, -1], [999, 5], [2026, 1.5], [2026, ""], ["", 3], [NaN, 3], [Infinity, 3]]) {
    assert.equal(anchorFromParts(year, month), "", `${year}-${month} should be refused`);
  }
});

test("ordering months is arithmetic, not string comparison", () => {
  // '2026-9' < '2026-10' as text, which is the wrong answer; the year and month
  // have to be compared as numbers or the future check inverts in October.
  assert.equal(isAfterMonthAnchor("2026-10", "2026-09"), true);
  assert.equal(isAfterMonthAnchor("2026-09", "2026-10"), false);
  assert.equal(isAfterMonthAnchor("2027-01", "2026-12"), true);
  assert.equal(isAfterMonthAnchor("2026-09", "2026-09"), false);
  // A malformed side is not "after" anything; it is not a month to compare.
  assert.equal(isAfterMonthAnchor("2026-13", "2026-09"), false);
  assert.equal(isAfterMonthAnchor("2026-09", ""), false);
});

test("the dropdowns offer every month once, in calendar order", () => {
  assert.equal(MONTH_OPTIONS.length, 12);
  assert.deepEqual(MONTH_OPTIONS.map((o) => o.value), [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
  ]);
  // Full names, so the list does not repeat the grid headers' abbreviations.
  assert.equal(MONTH_OPTIONS[0].label, "January");
  assert.equal(MONTH_OPTIONS[8].label, "September");
  assert.equal(MONTH_OPTIONS[11].label, "December");
});

test("the year list always includes the year on screen and this one", () => {
  const years = yearOptions("2026-09", { current: "2026-09" });
  assert.ok(years.includes(2026), "the year being shown is always listed");
  assert.equal(years[0], 2022, "four years back");
  assert.equal(years.at(-1), 2028, "two years forward");
  // Oldest first, and no gaps or repeats.
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.equal(new Set(years).size, years.length);
});

test("a year is out of reach on its January, not its December", () => {
  // The current month is September. The current year must stay selectable --
  // it is where the grid is standing -- which is only true if the year is tested
  // on its first month. Test December and the current year greys itself out,
  // along with every year after it, leaving nothing selectable at all.
  const current = "2026-09";
  const unreachable = (year) => isAfterMonthAnchor(anchorFromParts(year, 1), current);
  assert.equal(unreachable(2026), false, "this year is reachable");
  assert.equal(unreachable(2027), true, "next year is not");
  assert.equal(unreachable(2025), false);
  // And the boundary is the month, not the year: January 2027 is out of reach
  // while December 2026 is merely a month the current year has already passed.
  assert.equal(isAfterMonthAnchor(anchorFromParts(2026, 12), current), true);
  assert.equal(isAfterMonthAnchor(anchorFromParts(2026, 9), current), false);
});

test("a year the grid has paged to stays listed even when it is not near today", () => {
  // An admin who pages forward to 2029 must still find 2029 in the list, or the
  // dropdown would show a year it is not looking at and changing month would
  // silently move them back.
  const years = yearOptions("2029-03", { current: "2026-09" });
  assert.ok(years.includes(2029), "the year on screen is in its own list");
  assert.ok(years.includes(2026), "this year is in the list");
  assert.equal(years.at(-1), 2029);
  // Paging far back works the same way.
  const past = yearOptions("2019-01", { current: "2026-09" });
  assert.equal(past[0], 2019);
  assert.ok(past.includes(2026));
});

test("the year list has no duplicate years when the anchor is a year away", () => {
  // The first and last are both clamped to the same month arithmetic; if the
  // two min/max calls disagreed this would show 2026 twice.
  const years = yearOptions("2030-12", { current: "2026-01", back: 0, forward: 0 });
  assert.deepEqual(years, [2026, 2027, 2028, 2029, 2030]);
  assert.equal(new Set(years).size, years.length);
});

test("labels read as months, not numbers or ISO strings", () => {
  assert.equal(formatMonthAnchor("2026-09"), "Sep 2026");
  assert.equal(formatMonthAnchor("2026-01"), "Jan 2026");
  assert.equal(formatMonthAnchor("2026-12"), "Dec 2026");
  assert.equal(formatMonthWindow("2026-09"), "Apr 2026 – Sep 2026");
  assert.equal(formatMonthWindow("2026-01"), "Aug 2025 – Jan 2026");
});

test("the default anchor is the current month", () => {
  const today = new Date(2026, 8, 15); // September 2026, 0-indexed month
  assert.equal(currentMonthAnchor(today), "2026-09");
  assert.equal(currentMonthAnchor(new Date(2026, 0, 1)), "2026-01");
  assert.equal(currentMonthAnchor(new Date(2026, 11, 31)), "2026-12");
});

test("the current anchor always sits at the right edge of its window", () => {
  const anchor = currentMonthAnchor(new Date(2026, 8, 15));
  assert.equal(monthWindowValues(anchor).at(-1), anchor);
});
