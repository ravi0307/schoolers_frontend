import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("parent navigation and routes expose My Report", () => {
  assert.match(read("src/components/layout/ParentShell.jsx"), /\/parent\/report.*My Report/);
  assert.match(read("src/App.jsx"), /path="report" element=\{<ParentReport \/>\}/);
});

test("parent report combines the selected child's attendance, marks and fee history", () => {
  const page = read("src/pages/parent/ParentReport.jsx");
  assert.match(page, /useParentContext/);
  assert.match(page, /attendanceApi\.getAttendance\(studentId\)/);
  assert.match(page, /marksApi\.studentMarks\(studentId\)/);
  assert.match(page, /accountsApi\.studentFeeHistory\(studentId\)/);
  const accountsApi = read("src/api/accounts.js");
  assert.match(accountsApi, /client\.get\(`\/accounts\/fees\/student\/\$\{studentId\}`\)/);
  for (const section of ["Attendance", "Fees deposited", "Marks"]) {
    assert.ok(page.includes(section), `missing ${section} section`);
  }
  assert.match(read("src/pages/parent/ParentReport.module.css"), /max-width: 767px/);
});
