import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/parent/ParentMarks.jsx", "utf8");
const api = fs.readFileSync("src/api/marks.js", "utf8");

test("marks API exposes published-only aggregated reads", () => {
  assert.match(api, /studentResults\s*=\s*\(studentId/);
  assert.match(api, /\/results\/student\/\$\{studentId\}/);
  assert.match(api, /examinationResults\s*=\s*\(examId\)/);
  assert.match(api, /\/results\/examination\/\$\{examId\}/);
  // Legacy term-scoped calls are preserved byte-for-byte.
  assert.match(api, /\/marks\/student/);
  assert.match(api, /\/marks\/class\/\$\{classId\}/);
  assert.match(api, /client\.put\(`\/marks\/\$\{studentId\}\/\$\{subjectId\}`/);
});

test("parent marks page adds an aggregate summary without touching the list", () => {
  assert.match(page, /marksApi\.studentResults\(selectedChild\.student_id\)/);
  assert.match(page, /aggregate/);
  assert.match(page, /Incomplete/);
  // The existing subject-wise list, pagination, and grade display stay.
  assert.match(page, /marksApi\.studentMarks\(selectedChild\.student_id\)/);
  assert.match(page, /pager\.pageItems\.map/);
  assert.match(page, /gradeFor\(m\.score\)/);
});
