import assert from "node:assert/strict";
import test from "node:test";

import {
  STAFF_SORTS,
  VISIBLE_ROWS,
  filterAndSortRows,
  peopleCountLabel,
  rowPaidMonths,
  rowTotal,
  scrollHint,
  scrollHintText,
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

// ---- The student grid has a different secondary line, so it gets its own
// ---- coverage. Searching a student by admission number is a real task: the
// ---- number is on their card in the UI and on every notice the school sends.

const studentRow = (id, name, extra) => ({
  student_id: id,
  student_name: name,
  class_name: extra?.class_name,
  admission_no: extra?.admission_no,
  amounts: extra?.amounts,
});

const studentNameOf = (r) => r.student_name;
const studentSecondaryOf = (r) =>
  [r.class_name, r.admission_no].filter(Boolean).join(" · ");

const runStudents = (rows, sort, query = "") =>
  filterAndSortRows({
    rows, months: MONTHS, query, sort,
    nameOf: studentNameOf, secondaryOf: studentSecondaryOf,
  });

const STUDENTS = [
  studentRow(1, "Aarav Mehta", { class_name: "Grade 3", admission_no: "ADM-1001", amounts: { "2026-09": 500 } }),
  studentRow(2, "Diya Kapoor", { class_name: "Grade 4", admission_no: "ADM-1002", amounts: { "2026-08": 500, "2026-09": 500 } }),
  studentRow(3, "Kabir Singh", { class_name: "Grade 3", admission_no: "ADM-1003", amounts: {} }),
];

test("a student is findable by admission number as well as by name", () => {
  assert.deepEqual(runStudents(STUDENTS, "name", "adm-1002").map((r) => r.student_name), ["Diya Kapoor"]);
  assert.deepEqual(runStudents(STUDENTS, "name", "grade 3").map((r) => r.student_name), ["Aarav Mehta", "Kabir Singh"]);
  // The two halves of the secondary line read as one search target.
  assert.deepEqual(runStudents(STUDENTS, "name", "grade 4 · ").map((r) => r.student_name), ["Diya Kapoor"]);
  assert.deepEqual(runStudents(STUDENTS, "name", "adm-100").map((r) => r.student_name), ["Aarav Mehta", "Diya Kapoor", "Kabir Singh"]);
});

test("a student missing class and admission number is still sortable and findable", () => {
  // Students imported without a class must not break the secondary line.
  const bare = [studentRow(4, "Zoya Khan", {}), ...STUDENTS];
  assert.equal(studentSecondaryOf(bare[0]), "");
  assert.equal(runStudents(bare, "name", "zoya").length, 1);
  assert.deepEqual(runStudents(bare, "name").map((r) => r.student_name), ["Aarav Mehta", "Diya Kapoor", "Kabir Singh", "Zoya Khan"]);
  // An empty amounts object is an all-unpaid student, not a crash.
  assert.equal(rowTotal(bare[0], MONTHS), 0);
  assert.equal(rowPaidMonths(bare[0], MONTHS), 0);
});

test("student amount and unpaid sorts order the same way the staff grid does", () => {
  // Aarav 500, Diya 1000, Kabir 0, Zoya 0.
  const bare = [...STUDENTS, studentRow(4, "Zoya Khan", {})];
  assert.deepEqual(
    runStudents(bare, "total_desc").map((r) => r.student_name),
    ["Diya Kapoor", "Aarav Mehta", "Kabir Singh", "Zoya Khan"]
  );
  assert.deepEqual(
    runStudents(bare, "unpaid_desc").map((r) => r.student_name),
    ["Kabir Singh", "Zoya Khan", "Aarav Mehta", "Diya Kapoor"]
  );
});

test("the count note only does arithmetic once the grid is narrowed", () => {
  const label = (matched, total, singular = "student", plural = "students") =>
    peopleCountLabel({ matched, total, singular, plural });
  // Unfiltered: just the number. "16 of 16 students" would read as filtered.
  assert.equal(label(16, 16), "16 students");
  // Filtered: show what the search is hiding.
  assert.equal(label(1, 16), "1 of 16 students");
  // Re-sorted but nothing hidden still reads as the plain total. "8 of 8
  // staff" would imply a filter is applied when only the order changed.
  assert.equal(label(8, 8, "staff", "staff"), "8 staff");
  // Singular is stated by the caller, not guessed by trimming an "s".
  assert.equal(label(1, 1, "staff", "staff"), "1 staff");
  assert.equal(label(1, 1), "1 student");
  assert.equal(label(0, 16), "0 of 16 students");
  assert.equal(label(0, 0), "0 students");
  // A filter matching everything is still unfiltered.
  assert.equal(label(16, 16), "16 students");
});

test("the scroll hint appears only when rows are actually below the fold", () => {
  assert.equal(scrollHintText(6), null);
  assert.equal(scrollHintText(3), null);
  assert.equal(scrollHintText(7), "scroll for 1 more");
  assert.equal(scrollHintText(9), "scroll for 3 more");
  // Counting is against the filtered list, so a search that leaves one row
  // must not keep promising the whole school's worth of scrolling.
  assert.equal(scrollHintText(1), null);
  // A custom row count is honoured, for callers that do not use six.
  assert.equal(scrollHintText(10, 3), "scroll for 7 more");
});
