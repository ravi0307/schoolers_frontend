import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("admin exam pages are routed, navigated, and share page conventions", () => {
  const app = read("src/App.jsx");
  for (const [path, page] of [
    ["academic-calendar", "AdminAcademicCalendar"],
    ["exam-settings", "AdminExamSettings"],
    ["examinations", "AdminExaminations"],
    ["marks-entry", "AdminMarksEntry"],
    ["promotion", "AdminPromotion"],
    ["exam-results", "AdminExamResults"],
  ]) {
    assert.match(app, new RegExp(`path="${path}" element=\\{<${page} \\/>\\}`));
  }
  const shell = read("src/components/layout/AdminShell.jsx");
  for (const label of ["Academic Calendar", "Exam Settings", "Examinations", "Marks Entry", "Exam Results", "Promotion"]) {
    assert.ok(shell.includes(label), `nav missing ${label}`);
  }
  for (const page of ["AdminAcademicCalendar", "AdminExamSettings", "AdminExaminations", "AdminMarksEntry", "AdminPromotion", "AdminExamResults"]) {
    const src = read(`src/pages/admin/${page}.jsx`);
    assert.match(src, /<AdminShell>/);
    assert.match(src, /<PageHeader\b/);
    assert.match(src, /<Spinner \/>/);
    assert.match(src, /<ErrorBanner message/);
    assert.doesNotMatch(src, /style=\{\{/);
  }
});

test("exam settings exposes marking switch with history preservation", () => {
  const src = read("src/pages/admin/AdminExamSettings.jsx");
  assert.match(src, /updateMarkingSystem/);
  assert.match(src, /Published results keep their original format/);
  assert.match(src, /newGradeScaleVersion/);
  assert.match(src, /<ConfirmDialog/);
});

test("examinations page covers draft, publish, cancel, and version history", () => {
  const src = read("src/pages/admin/AdminExaminations.jsx");
  assert.match(src, /publishExamination/);
  assert.match(src, /unpublishExamination/);
  assert.match(src, /cancelExamination/);
  assert.match(src, /listSessionVersions/);
  assert.match(src, /examinationTimetable/);
});

test("sessions can be edited and published adds carry a recorded reason", () => {
  const src = read("src/pages/admin/AdminExaminations.jsx");
  // Inline session editor wired to the PATCH endpoint with diff-only payloads.
  assert.match(src, /updateExaminationSession\(editing, payload\)/);
  assert.match(src, /changedSessionFields\(original, editDraft\)/);
  assert.match(src, /setEditError/);
  // The previously dead "reason" input now reaches the create payload …
  assert.match(src, /reason: sessionReason\.trim\(\)/);
  // … and edits on a published schedule refuse to save without one.
  assert.match(src, /payload\.reason = reason/);
  assert.match(src, /A reason is required to amend a published schedule/);
  // History distinguishes adds (old_row NULL) from edits.
  const api = read("src/api/academics.js");
  assert.match(api, /updateExaminationSession\s*=\s*\(id, data\)/);
  assert.match(api, /client\.patch\(`\/sessions\/\$\{id\}`/);
  // Exam configuration ties the examination to a term (payload already
  // carried period_id; the form now offers the select) and resets it on
  // year change so a term from another year is never submitted.
  assert.match(src, /listAcademicPeriods/);
  assert.match(src, /aria-label="Academic term"/);
  assert.match(src, /period_id: ""/);
});

test("marks entry covers drafts, submit, publish, withhold, correct, and CSV", () => {
  const src = read("src/pages/admin/AdminMarksEntry.jsx");
  for (const call of ["createSessionMark", "submitSessionMarks", "publishSessionMarks",
      "withholdMarks", "correctMark", "previewImport", "commitImport", "exportSessionMarks"]) {
    assert.match(src, new RegExp(call));
  }
  assert.match(src, /Incomplete|withheld/i);
});

test("promotion page covers preview, commit, batches, offerings, enrollment", () => {
  const src = read("src/pages/admin/AdminPromotion.jsx");
  for (const call of ["previewPromotion", "commitPromotion", "listPromotionBatches",
      "setClassOffering", "deleteClassOffering", "enrollStudentSubject"]) {
    assert.match(src, new RegExp(call));
  }
  assert.match(src, /founding-year reconciliation|Founding-year reconciliation/i);
});

test("teacher marks keeps legacy grid and adds session mode", () => {
  const src = read("src/pages/teacher/TeacherMarks.jsx");
  assert.match(src, /upsertMark\(studentId, subjectId, "Term 1", score\)/);
  assert.match(src, /createSessionMark/);
  assert.match(src, /submitSessionMarks/);
});
