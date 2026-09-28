import assert from "node:assert/strict";
import test from "node:test";

import {
  attendanceLabel,
  attendancePercentage,
  attendanceRangeLabel,
  attendanceTone,
  averageLabel,
  defaultTerm,
  formatDay,
  classNameFor,
  filterStudents,
  groupDigits,
  subjectCoverage,
  termsForSelector,
} from "../src/utils/studentReport.js";

// The per-student report is the first screen where a missing value is a normal,
// expected state rather than a bug. A student with no marks, or nobody ever
// having marked their attendance, is ordinary. So these tests are mostly about
// the two ways this can go wrong and produce a confident, wrong answer:
// "0%" for a student nobody marked, and a blank subject list that reads as a
// failure rather than as an absence of data.

test("attendance percentage is present over marked days", () => {
  assert.equal(attendancePercentage({ present: 5, absent: 1, marked_days: 6 }), 83.3);
  assert.equal(attendancePercentage({ present: 2, absent: 0, marked_days: 2 }), 100);
  assert.equal(attendancePercentage({ present: 0, absent: 4, marked_days: 4 }), 0);
});

test("a student nobody ever marked is null, not zero and not a hundred", () => {
  // This is the one that matters. 0% says the student was absent every day.
  // 100% says they were present every day. Both are lies.
  assert.equal(attendancePercentage({ present: 0, absent: 0, marked_days: 0 }), null);
  assert.equal(attendancePercentage({}), null);
  assert.equal(attendancePercentage(null), null);
  assert.equal(attendancePercentage(undefined), null);
  assert.equal(attendancePercentage({ present: 3, marked_days: 0 }), null);
});

test("the attendance label says so when there is nothing to report", () => {
  assert.equal(attendanceLabel({ present: 5, absent: 1, marked_days: 6 }), "83.3%");
  assert.equal(attendanceLabel({ marked_days: 0 }), "No records");
  assert.equal(attendanceLabel(undefined), "No records");
});

test("days nobody marked are not counted as absences", () => {
  // 5 present out of 6 recorded days, however many unmarked school days exist.
  const att = { present: 5, absent: 0, marked_days: 5 };
  assert.equal(attendancePercentage(att), 100);
  assert.equal(att.absent, 0);
});

test("tones use Pill's own vocabulary, so no pill renders unstyled", () => {
  // Pill only knows ok/warn/info/mute. A tone outside that set silently
  // produces an unstyled span.
  const allowed = new Set(["ok", "warn", "info", "mute"]);
  for (const att of [
    { present: 10, marked_days: 10 },
    { present: 8, marked_days: 10 },
    { present: 5, marked_days: 10 },
    { present: 0, marked_days: 0 },
  ]) {
    assert.ok(allowed.has(attendanceTone(att)), `unexpected tone for ${JSON.stringify(att)}`);
  }
  assert.equal(attendanceTone({ present: 10, marked_days: 10 }), "ok");
  assert.equal(attendanceTone({ present: 8, marked_days: 10 }), "info");
  assert.equal(attendanceTone({ present: 5, marked_days: 10 }), "warn");
  assert.equal(attendanceTone({ marked_days: 0 }), "mute");
});

test("attendance reports the period it actually covers", () => {
  assert.equal(
    attendanceRangeLabel({ from_date: "2026-09-01", to_date: "2026-09-26" }),
    "1 Sep 2026 – 26 Sep 2026"
  );
  assert.equal(
    attendanceRangeLabel({ from_date: "2026-09-25", to_date: "2026-09-25" }),
    "25 Sep 2026"
  );
  assert.equal(attendanceRangeLabel({}), "");
  assert.equal(attendanceRangeLabel({ from_date: "2026-09-01" }), "");
});

test("a term with no marks shows a dash, never an average of zero", () => {
  // "0" would read as the student failing every subject.
  assert.equal(averageLabel({ average: null }), "—");
  assert.equal(averageLabel({}), "—");
  assert.equal(averageLabel(null), "—");
  assert.equal(averageLabel({ average: 0 }), "0.0");
  assert.equal(averageLabel({ average: 78 }), "78.0");
  assert.equal(averageLabel({ average: 83.33 }), "83.3");
});

test("a term that is not fully graded says so", () => {
  // Otherwise three scores read like three straight results.
  assert.equal(subjectCoverage({ graded_subjects: 3, total_subjects: 6 }), "3 of 6 subjects graded");
  // Complete, empty, or unknown totals: nothing worth caveating.
  assert.equal(subjectCoverage({ graded_subjects: 6, total_subjects: 6 }), null);
  assert.equal(subjectCoverage({ graded_subjects: 0, total_subjects: 6 }), null);
  assert.equal(subjectCoverage({ graded_subjects: 3, total_subjects: 0 }), null);
  assert.equal(subjectCoverage(null), null);
});

test("the report opens on the newest term", () => {
  // The API sorts terms ascending, so the last one is the newest.
  assert.equal(defaultTerm(["Term 1", "Term 2", "Term 3"]), "Term 3");
  assert.equal(defaultTerm(["Term 1"]), "Term 1");
  assert.equal(defaultTerm([]), null);
  assert.equal(defaultTerm(null), null);
});

test("the term selector lists newest first without mutating the payload", () => {
  const terms = ["Term 1", "Term 2"];
  assert.deepEqual(termsForSelector(terms), ["Term 2", "Term 1"]);
  assert.deepEqual(terms, ["Term 1", "Term 2"], "input must not be reversed in place");
  assert.deepEqual(termsForSelector(null), []);
});

test("dates format for display and pass anything unexpected through", () => {
  assert.equal(formatDay("2026-09-25"), "25 Sep 2026");
  assert.equal(formatDay("2014-06-15"), "15 Jun 2014");
  assert.equal(formatDay("2026-01-01"), "1 Jan 2026");
  // recorded_on is a timestamp, and the date part is what matters.
  assert.equal(formatDay("2026-09-27 18:23:36.518360"), "27 Sep 2026");
  assert.equal(formatDay("not a date"), "not a date");
  assert.equal(formatDay(null), "");
});

test("thousands are grouped for phone numbers and long admission numbers", () => {
  assert.equal(groupDigits("8105096987"), "8,105,096,987");
  assert.equal(groupDigits(1234), "1,234");
  assert.equal(groupDigits(""), "");
  assert.equal(groupDigits(null), "");
});

const CLASSES = { 1: "Class 1", 2: "Class 2", 3: "Class 3" };

const LIST = [
  { student_id: 1, name: "Aarav Sharma", admission_no: "ADM1001", class_id: 1 },
  { student_id: 2, name: "Diya Kapoor", admission_no: "ADM1002", class_id: 2 },
  { student_id: 3, name: "Ishaan Verma", admission_no: "ADM1003", class_id: 3 },
];

test("the class name is joined in, because the students API does not send one", () => {
  assert.equal(classNameFor(CLASSES, 2), "Class 2");
  // A class the page has not loaded must not render as the string "undefined".
  assert.equal(classNameFor(CLASSES, 99), "");
  assert.equal(classNameFor(undefined, 1), "");
});

test("searching the student list hits name, admission number and class", () => {
  const ids = (q) => filterStudents(LIST, q, CLASSES).map((s) => s.student_id);
  assert.deepEqual(ids("aarav"), [1]);
  assert.deepEqual(ids("sharma"), [1]);
  assert.deepEqual(ids("adm1002"), [2]);
  // The class is searchable by name and by id, so both habits work.
  assert.deepEqual(ids("class 2"), [2]);
  assert.deepEqual(ids("Class 3"), [3]);
  assert.deepEqual(ids("zzzz"), []);
});

test("an empty or blank search is no filter", () => {
  assert.equal(filterStudents(LIST, "", CLASSES).length, 3);
  assert.equal(filterStudents(LIST, "   ", CLASSES).length, 3);
  assert.equal(filterStudents(LIST, null, CLASSES).length, 3);
  assert.equal(filterStudents(null, "", CLASSES).length, 0);
  assert.equal(filterStudents(undefined, "a", CLASSES).length, 0);
});

test("a class search does not crash when the class names have not loaded", () => {
  // /classes failing must not take the list down; the rows just lose the class.
  assert.deepEqual(
    filterStudents(LIST, "aarav", {}).map((s) => s.student_id),
    [1]
  );
  assert.equal(filterStudents(LIST, "class", {}).length, 0);
});
