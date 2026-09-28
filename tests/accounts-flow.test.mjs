import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WINDOW_MONTHS,
  currentMonthAnchor,
  formatMonthAnchor,
  formatMonthWindow,
  fromMonthInputValue,
  isValidMonthAnchor,
  monthWindowValues,
  shiftMonthAnchor,
  toMonthInputValue,
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
  // jumping to a month they did not finish entering.
  assert.equal(fromMonthInputValue("2026-0"), "");
  assert.equal(fromMonthInputValue("202"), "");
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
