import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysBetween,
  formatHolidayLength,
  formatHolidaySpan,
  groupHolidayRows,
  parseHolidayDate,
  rangeLength,
} from "../src/utils/holidayRange.js";

// The API stores a holiday span as one row per day, so the portal has to
// collapse consecutive same-named days back into the single entry the admin
// typed. A date is a plain `YYYY-MM-DD` string with no timezone, so every test
// here uses a fixed literal.

const rows = (...specs) =>
  specs.map(([holiday_id, occasion, holiday_date]) => ({ holiday_id, occasion, holiday_date }));

test("parseHolidayDate reads a plain calendar date", () => {
  const parsed = parseHolidayDate("2026-11-08");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 10);
  assert.equal(parsed.getDate(), 8);
});

test("parseHolidayDate rejects anything that is not a plain date", () => {
  for (const bad of ["", null, undefined, "08/11/2026", "2026-13-01", "today"]) {
    assert.equal(parseHolidayDate(bad), null, `${bad} should not parse`);
  }
});

test("daysBetween counts whole days forwards and backwards", () => {
  const from = parseHolidayDate("2026-11-08");
  assert.equal(daysBetween(from, parseHolidayDate("2026-11-11")), 3);
  assert.equal(daysBetween(from, parseHolidayDate("2026-11-05")), -3);
  assert.equal(daysBetween(from, from), 0);
});

test("rangeLength counts both ends so a one-day span is 1, not 0", () => {
  assert.equal(rangeLength("2026-11-08"), 1);
  assert.equal(rangeLength("2026-11-08", "2026-11-08"), 1);
  assert.equal(rangeLength("2026-11-08", "2026-11-11"), 4);
});

test("rangeLength is 0 for a reversed or incomplete span rather than negative", () => {
  // A negative count would read as "minus 3 days" in the row summary.
  assert.equal(rangeLength("2026-11-11", "2026-11-08"), 0);
  assert.equal(rangeLength("", ""), 0);
  assert.equal(rangeLength("2026-11-08", "nonsense"), 0);
});

test("a single day becomes one group anchored on its own row", () => {
  const groups = groupHolidayRows(rows([1, "Diwali", "2026-11-08"]));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].occasion, "Diwali");
  assert.equal(groups[0].start, "2026-11-08");
  assert.equal(groups[0].end, "2026-11-08");
  assert.equal(groups[0].days, 1);
  assert.equal(groups[0].anchor_id, 1);
});

test("consecutive days sharing an occasion collapse into one group", () => {
  const groups = groupHolidayRows(
    rows(
      [1, "Diwali Break", "2026-11-08"],
      [2, "Diwali Break", "2026-11-09"],
      [3, "Diwali Break", "2026-11-10"]
    )
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days, 3);
  assert.equal(groups[0].start, "2026-11-08");
  assert.equal(groups[0].end, "2026-11-10");
  assert.deepEqual(groups[0].ids, [1, 2, 3]);
});

test("the anchor is the first day's id so any day's edit reaches the whole span", () => {
  // A range edit or delete is addressed to the anchor, matching the server's
  // holiday_group, so the portal does not have to know every id in the span.
  const groups = groupHolidayRows(
    rows([7, "Break", "2026-11-08"], [8, "Break", "2026-11-09"])
  );
  assert.equal(groups[0].anchor_id, 7);
  assert.deepEqual(groups[0].ids, [7, 8]);
});

test("a gap starts a new group instead of inventing a closed day", () => {
  // The 10th is missing, so the 12th is a separate break. Joining them would
  // mark the 10th closed, which is the one mistake a holiday list must not make.
  const groups = groupHolidayRows(
    rows([1, "Break", "2026-11-08"], [2, "Break", "2026-11-09"], [3, "Break", "2026-11-12"])
  );
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => [g.start, g.end]),
    [
      ["2026-11-08", "2026-11-09"],
      ["2026-11-12", "2026-11-12"],
    ]
  );
});

test("a different occasion on the next day is a separate entry", () => {
  const groups = groupHolidayRows(
    rows([1, "Diwali", "2026-11-08"], [2, "Ganesh Chaturthi", "2026-11-09"])
  );
  assert.equal(groups.length, 2);
});

test("a span crossing a month boundary stays one group", () => {
  const groups = groupHolidayRows(
    rows(
      [1, "Year End", "2026-12-30"],
      [2, "Year End", "2026-12-31"],
      [3, "Year End", "2027-01-01"]
    )
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days, 3);
});

test("a span across a leap day stays one group", () => {
  const groups = groupHolidayRows(
    rows([1, "Spring", "2028-02-28"], [2, "Spring", "2028-02-29"], [3, "Spring", "2028-03-01"])
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days, 3);
});

test("rows are sorted by date before grouping, so an out-of-order API cannot split a span", () => {
  const groups = groupHolidayRows(
    rows([3, "Break", "2026-11-10"], [1, "Break", "2026-11-08"], [2, "Break", "2026-11-09"])
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days, 3);
});

test("rows missing a date or an occasion are dropped rather than breaking the list", () => {
  const groups = groupHolidayRows([
    { holiday_id: 1, occasion: "Diwali", holiday_date: "2026-11-08" },
    { holiday_id: 2, occasion: "", holiday_date: "2026-11-09" },
    { holiday_id: 3, occasion: "Break", holiday_date: null },
    null,
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days, 1);
});

test("no rows gives no groups, so the empty state stays reachable", () => {
  assert.deepEqual(groupHolidayRows([]), []);
  assert.deepEqual(groupHolidayRows(null), []);
});

test("one day renders as a single date", () => {
  assert.equal(formatHolidaySpan("2026-11-08", "2026-11-08"), "8 Nov 2026");
  assert.equal(formatHolidaySpan("2026-11-08"), "8 Nov 2026");
});

test("a span within one month reads start to end", () => {
  assert.equal(formatHolidaySpan("2026-11-08", "2026-11-11"), "8 Nov - 11 Nov 2026");
});

test("a span crossing a year boundary shows both years", () => {
  assert.equal(
    formatHolidaySpan("2026-12-30", "2027-01-02"),
    "30 Dec 2026 - 2 Jan 2027"
  );
});

test("an incomplete span renders nothing rather than NaN or a stray dash", () => {
  assert.equal(formatHolidaySpan("", ""), "");
  assert.equal(formatHolidaySpan("nonsense"), "");
});

test("lengths read naturally in a row summary and a confirmation", () => {
  assert.equal(formatHolidayLength(1), "1 day");
  assert.equal(formatHolidayLength(4), "4 days");
});
