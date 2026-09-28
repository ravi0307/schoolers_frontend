import assert from "node:assert/strict";
import test from "node:test";

import {
  STAFF_SORTS,
  VISIBLE_ROWS,
  filterAndSortRows,
  rowPaidMonths,
  rowTotal,
  scrollHint,
  visibleMonths,
} from "../src/utils/accountsTable.js";

// These cover the two things that silently show an admin the wrong financial
// picture: the row total that drives the amount sorts, and the direction of
// each sort. A reversed sort does not look broken, it just quietly points the
// person chasing an unpaid month at the highest earner.

const MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

const sheet = (rows, months = MONTHS) => ({ months, rows });

const staffRow = (id, name, amounts) => ({
  staff_id: id,
  staff_name: name,
  designation: `Role ${id}`,
  amounts,
});

const nameOf = (r) => r.staff_name;
const secondaryOf = (r) => r.designation;

const order = (result) => result.map((r) => r.staff_name);

const run = (rows, sort, query = "") =>
  filterAndSortRows({ rows, months: MONTHS, query, sort, nameOf, secondaryOf });

// Three staff with deliberately different totals and different gaps, so every
// sort has a unique right answer and cannot pass by falling back to name.
const ROWS = [
  staffRow(1, "Anita", { "2026-04": 100, "2026-05": 100, "2026-06": 100, "2026-07": 100, "2026-08": 100, "2026-09": 100 }),
  staffRow(2, "Bhavesh", { "2026-05": 200, "2026-06": 200, "2026-07": 200, "2026-08": 200, "2026-09": 200 }),
  staffRow(3, "Chitra", { "2026-06": 300, "2026-07": 300, "2026-08": 300, "2026-09": 300 }),
];

test("a row total sums only the months on screen, and an unpaid month counts as zero", () => {
  assert.equal(rowTotal(ROWS[0], MONTHS), 600);
  // Bhavesh has no April entry. That is a gap, not money, and it must not
  // raise the total or crash the sort.
  assert.equal(rowTotal(ROWS[1], MONTHS), 1000);
  assert.equal(rowPaidMonths(ROWS[1], MONTHS), 5);
  assert.equal(rowPaidMonths(ROWS[2], MONTHS), 4);
  // A recorded zero is a real entry, unlike a missing one.
  assert.equal(rowPaidMonths(staffRow(4, "Zero", { "2026-09": 0 }), MONTHS), 1);
  assert.equal(rowTotal(staffRow(4, "Zero", { "2026-09": 0 }), MONTHS), 0);
  // Visible months, not the whole history: paging back must change the total.
  assert.equal(rowTotal(ROWS[0], ["2026-09"]), 100);
});

test("a row with no amounts at all totals zero instead of throwing", () => {
  assert.equal(rowTotal({}, MONTHS), 0);
  assert.equal(rowTotal(undefined, MONTHS), 0);
  assert.equal(rowPaidMonths({}, MONTHS), 0);
  assert.deepEqual(visibleMonths(undefined), []);
});

test("name sorting is alphabetical and locale-aware, in both directions", () => {
  assert.deepEqual(order(run(ROWS, "name")), ["Anita", "Bhavesh", "Chitra"]);
  assert.deepEqual(order(run(ROWS, "name_desc")), ["Chitra", "Bhavesh", "Anita"]);
});

test("amount sorts run highest-first and lowest-first, not both the same way", () => {
  // Anita 600 < Bhavesh 1000 < Chitra 1200.
  assert.deepEqual(order(run(ROWS, "total_desc")), ["Chitra", "Bhavesh", "Anita"]);
  assert.deepEqual(order(run(ROWS, "total_asc")), ["Anita", "Bhavesh", "Chitra"]);
});

test("unpaid sorts order by how many months are missing, in both directions", () => {
  // Anita is paid all six months; Bhavesh five; Chitra four.
  assert.deepEqual(order(run(ROWS, "unpaid_desc")), ["Chitra", "Bhavesh", "Anita"]);
  assert.deepEqual(order(run(ROWS, "unpaid_asc")), ["Anita", "Bhavesh", "Chitra"]);
});

test("equal keys fall back to name so the order is stable, not arbitrary", () => {
  const tied = [
    staffRow(1, "Zara", { "2026-09": 100 }),
    staffRow(2, "Adam", { "2026-09": 100 }),
  ];
  assert.deepEqual(order(run(tied, "total_desc")), ["Adam", "Zara"]);
  assert.deepEqual(order(run(tied, "unpaid_desc")), ["Adam", "Zara"]);
});

test("an unknown sort falls back to name rather than scrambling the grid", () => {
  assert.deepEqual(order(run(ROWS, "nonsense")), ["Anita", "Bhavesh", "Chitra"]);
  assert.deepEqual(order(run(ROWS, undefined)), ["Anita", "Bhavesh", "Chitra"]);
});

test("search matches the name, case-insensitively and ignoring surrounding space", () => {
  assert.deepEqual(order(run(ROWS, "name", "  aNiTa ")), ["Anita"]);
  assert.deepEqual(order(run(ROWS, "name", "bha")), ["Bhavesh"]);
  assert.deepEqual(order(run(ROWS, "name", "z")), []);
  assert.equal(run(ROWS, "name", "z").length, 0);
});

test("search also matches the secondary line, so a designation is findable", () => {
  assert.deepEqual(order(run(ROWS, "name", "role 3")), ["Chitra"]);
});

test("a blank or whitespace-only query is no filter at all", () => {
  assert.equal(run(ROWS, "name", "").length, 3);
  assert.equal(run(ROWS, "name", "   ").length, 3);
  assert.equal(run(ROWS, "name", null).length, 3);
});

test("filtering happens before sorting, and the two compose", () => {
  // "a" appears in all three names, so this is a filter that keeps everyone.
  // Sorting the filtered set must still order by amount, not fall back to name.
  assert.deepEqual(order(run(ROWS, "total_desc", "a")), ["Chitra", "Bhavesh", "Anita"]);
  // "i" narrows to Anita and Chitra, and the amount order puts Chitra first.
  assert.deepEqual(order(run(ROWS, "total_desc", "i")), ["Chitra", "Anita"]);
  assert.deepEqual(order(run(ROWS, "name", "i")), ["Anita", "Chitra"]);
});

test("searching does not mutate the caller's array", () => {
  const input = [...ROWS];
  run(input, "name_desc");
  assert.deepEqual(input.map((r) => r.staff_id), [1, 2, 3]);
});

test("the grid shows six rows and only then scrolls", () => {
  assert.equal(VISIBLE_ROWS, 6);
  // Six people exactly: no scroll, no "more" hint.
  assert.equal(scrollHint(6), 0);
  assert.equal(scrollHint(3), 0);
  assert.equal(scrollHint(7), 1);
  assert.equal(scrollHint(9), 3);
  // An empty grid must not promise rows that are not there.
  assert.equal(scrollHint(0), 0);
});

test("the sort menu offers name, amount, and unpaid orderings", () => {
  assert.deepEqual(Object.keys(STAFF_SORTS), [
    "name", "name_desc", "total_desc", "total_asc", "unpaid_desc", "unpaid_asc",
  ]);
  for (const { label } of Object.values(STAFF_SORTS)) {
    assert.equal(typeof label, "string");
    assert.ok(label.length > 0);
  }
});

test("an empty window sorts an empty sheet without dividing by zero", () => {
  // Every total is 0, so all three rows tie and the name fallback decides.
  const result = filterAndSortRows({
    rows: ROWS, months: [], query: "", sort: "total_desc", nameOf, secondaryOf,
  });
  assert.deepEqual(result.map((r) => r.staff_name), ["Anita", "Bhavesh", "Chitra"]);
  // visibleMonths tolerates a missing sheet, which is the pre-load state.
  assert.deepEqual(visibleMonths(undefined), []);
  assert.deepEqual(visibleMonths(sheet([], [])), []);
});
