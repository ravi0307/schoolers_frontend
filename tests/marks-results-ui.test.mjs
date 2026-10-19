import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/parent/ParentMarks.jsx", "utf8");
const api = fs.readFileSync("src/api/marks.js", "utf8");

test("marks API exposes published-only aggregated reads", () => {
  assert.match(api, /studentResults\s*=\s*\(studentId/);
  assert.match(api, /\/marks\/results\/student\/\$\{studentId\}/);
  // Optional second `view` param (published default; entry for staff grids).
  assert.match(api, /examinationResults\s*=\s*\(examId/);
  assert.match(api, /\/marks\/results\/examination\/\$\{examId\}/);
  // Legacy term-scoped calls are preserved byte-for-byte.
  assert.match(api, /\/marks\/student/);
  assert.match(api, /\/marks\/class\/\$\{classId\}/);
  assert.match(api, /client\.put\(`\/marks\/\$\{studentId\}\/\$\{subjectId\}`/);
});

test("parent marks page adds an aggregate summary without touching the list", () => {
  assert.match(page, /marksApi\.studentResults\(selectedChild\.student_id/);
  assert.match(page, /aggregate/);
  assert.match(page, /Incomplete/);
  // The existing subject-wise list, pagination, and grade display stay.
  assert.match(page, /marksApi\.studentMarks\(selectedChild\.student_id\)/);
  assert.match(page, /pager\.pageItems\.map/);
  assert.match(page, /m\.grade\?\.label/);
});

test("parent marks filters results by year and term using school data", () => {
  // Real year/term lists from the academics API — no hardcoded periods.
  assert.match(page, /listAcademicYears/);
  assert.match(page, /listAcademicPeriods\(Number\(yearFilter\)\)/);
  assert.match(page, /year_id: yearFilter \? Number\(yearFilter\) : undefined/);
  assert.match(page, /period_id: periodFilter \? Number\(periodFilter\) : undefined/);
  // Picking a new year resets the term so a stale period_id never ships.
  assert.match(page, /setYearFilter\(e\.target\.value\); setPeriodFilter\(""\)/);
  // Subject names and grade labels come from the API, not a client table.
  assert.match(page, /m\.subject_name \|\| `Subject #\$\{m\.subject_id\}`/);
  assert.doesNotMatch(page, /function gradeFor/);
  assert.doesNotMatch(page, /score >= 90/);
  // Empty lists and non-present statuses stay clearly distinguished;
  // withheld rows are filtered server-side and never reach parents.
  assert.match(page, /EmptyState>No marks recorded yet/);
  assert.match(page, /const STATUS_LABELS = \{ absent: "Absent", missing: "Missing", exempt: "Exempt" \}/);
  assert.match(page, /const status = m\.assessment_status \|\| "present"/);
});

test("parent report uses real subjects and each mark's own maximum", () => {
  const report = fs.readFileSync("src/pages/parent/ParentReport.jsx", "utf8");
  assert.match(report, /row\.subject_name/);
  assert.match(report, /row\.max_marks \?\? 100/);
  assert.doesNotMatch(report, /row\.score\}\/100/);
  // Non-score rows fall back to grade label, then a humanized assessment
  // status ("Absent"), never a raw "present" string or an empty cell.
  assert.match(report, /row\.grade\?\.label/);
  assert.match(report, /row\.assessment_status && row\.assessment_status !== "present"/);
  assert.match(report, /row\.assessment_status\[0\]\.toUpperCase\(\)/);
});
