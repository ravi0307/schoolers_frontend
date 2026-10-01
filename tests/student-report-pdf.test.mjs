import assert from "node:assert/strict";
import test from "node:test";

import { jsPDF } from "jspdf";
import {
  buildPdfModel,
  downloadStudentReport,
  renderStudentReport,
  studentReportFilename,
} from "../src/utils/studentReportPdf.js";

// The PDF is the same report as the popup, so the same honesty applies in what
// it prints and what it refuses to print. These tests are mostly about the
// model -- the document as data -- because page coordinates tell a test almost
// nothing about whether a "3 of 6 subjects graded" caveat made it onto the
// page. flatten() renders the model to the exact text the drawing code would
// put on the sheet, so the assertions read like what lands on the paper.

function flatten(model) {
  const lines = [];
  for (const s of model) {
    if (s.type === "title") {
      lines.push(s.name, s.sub);
    } else if (s.type === "details") {
      lines.push("Details");
      for (const { label, value } of s.items) {
        if (!value) continue;
        lines.push(`${label}:  ${value}`);
      }
    } else if (s.type === "guardians") {
      lines.push("Guardians");
      if (!s.guardians.length) lines.push("No guardian is linked to this student.");
      for (const g of s.guardians) {
        lines.push([g.relationship || "Guardian", g.name].filter(Boolean).join(" · "));
        for (const [label, value] of [
          ["Phone", g.phone],
          ["Email", g.email],
          ["Emergency", g.emergency_number],
          ["Address", g.address],
        ]) {
          if (value) lines.push(`${label}:  ${value}`);
        }
      }
    } else if (s.type === "marks") {
      lines.push(`Marks — ${s.term}`);
      for (const r of s.rows) lines.push(`${r.subject}  ${String(r.score)}`);
      lines.push(`Average  ${s.average}`);
      if (s.coverage) lines.push(`${s.coverage} — only marked subjects are listed.`);
    } else if (s.type === "attendance") {
      lines.push("Attendance", `${s.pct} present`);
      lines.push(`${s.present} days present · ${s.absent} days absent · ${s.marked} days marked`);
      if (s.range) lines.push(`${s.range} — the only days with a record. Days nobody marked are not counted as absences.`);
      if (s.recent.length) {
        lines.push("Most recent days");
        for (const d of s.recent) lines.push(`${d.date}: ${d.status}`);
      }
    } else if (s.type === "note") {
      lines.push(s.title, s.text);
    } else if (s.type === "foot") {
      lines.push(...s.lines);
    }
  }
  return lines.join("\n");
}

const FULL_REPORT = {
  student: {
    student_id: 1,
    name: "Aarav Sharma",
    admission_no: "ADM1001",
    class_name: "Class 1",
    gender: "Male",
    date_of_birth: "2014-06-15",
    recorded_on: "2026-09-27 18:23:36.518360",
    guardians: [
      { parent_id: 5, relationship: "Father", name: "Rajesh Sharma", phone: "9811200220", email: "rajesh@example.com", emergency_number: "9811200221", address: "14 Rose Lane, Green Park" },
      { parent_id: 6, relationship: "Mother", name: "Priya Sharma", phone: "", email: "", emergency_number: "", address: "" },
    ],
  },
  terms: ["Term 1", "Term 2"],
  marks_by_term: [
    { term: "Term 1", average: 68.3, graded_subjects: 3, total_subjects: 6, subjects: [
      { subject_id: 10, subject_name: "English", score: 72 },
      { subject_id: 11, subject_name: "Mathematics", score: 65 },
      { subject_id: 12, subject_name: "Science", score: 68 },
    ]},
    { term: "Term 2", average: 78.0, graded_subjects: 6, total_subjects: 6, subjects: [
      { subject_id: 10, subject_name: "English", score: 80 },
      { subject_id: 11, subject_name: "Mathematics", score: 74 },
      { subject_id: 12, subject_name: "Science", score: 82 },
      { subject_id: 14, subject_name: "Computer Science", score: 79 },
      { subject_id: 15, subject_name: "Art", score: 76 },
      { subject_id: 16, subject_name: "Music", score: 77 },
    ]},
  ],
  attendance: {
    present: 165, absent: 35, marked_days: 200,
    from_date: "2026-01-05", to_date: "2026-09-25",
    recent: [
      { date: "2026-09-25", status: "Present" },
      { date: "2026-09-24", status: "Absent" },
    ],
  },
};

test("the PDF carries the student identity up top", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.match(t, /Aarav Sharma/);
  assert.match(t, /ADM1001 · Class 1 · Male/);
});

test("details and every guardian print, with the relationship", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.match(t, /Father · Rajesh Sharma/);
  assert.match(t, /Mother · Priya Sharma/);
  assert.match(t, /9811200220/);
  assert.match(t, /14 Rose Lane, Green Park/);
  assert.match(t, /Date of birth: {2}15 Jun 2014/);
});

test("the marks section prints the chosen term, not the newest one", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 1"));
  assert.match(t, /Marks — Term 1/);
  assert.match(t, /Mathematics {2}65/);
  assert.ok(!/Computer Science/.test(t), "Term 2 subjects must not leak into Term 1");
});

test("an incomplete term prints the coverage caveat in the same breath as the average", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 1"));
  assert.match(t, /Average {2}68\.3/);
  assert.match(t, /3 of 6 subjects graded — only marked subjects are listed\./);
  // Only marked subjects are on the sheet; the caveat says the term had six.
  assert.ok(!/History/.test(t));
});

test("a complete term prints no coverage caveat", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.ok(!/subjects graded/.test(t));
});

test("no grade, pass/fail or rank ever appears on the page", () => {
  // This is the honesty test. The system has no grade table, so a sheet with a
  // grade would be fabricated, and a printed document is worse than a screen.
  // The lowercase phrase "pass/fail" below comes from the footnote's own
  // explanation that neither is shown; the status words "Pass"/"Fail" do not.
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  for (const forbidden of ["Distinction", "First Class", "Passed", "Failed", "Rank", "A+", "Grade A"]) {
    assert.ok(!t.includes(forbidden), `PDF must not contain "${forbidden}"`);
  }
  assert.ok(!/Grade [A-F]/.test(t));
});

test("attendance prints the figures and the period they cover", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.match(t, /82\.5% present/);
  assert.match(t, /165 days present · 35 days absent · 200 days marked/);
  assert.match(t, /5 Jan 2026 – 25 Sep 2026 — the only days with a record/);
  assert.match(t, /25 Sep 2026: Present/);
});

test("the foot prints the honesty note and a generation date", () => {
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.match(t, /There is no exam, grade band or pass\/fail in the system/);
  assert.match(t, /^.*Generated.*$/m);
});

test("a student with no records gets the absence-of-data notes, not zeros", () => {
  const empty = {
    student: { name: "Diya Kapoor", admission_no: "ADM1002", class_name: "Class 2" },
    terms: [],
    marks_by_term: [],
    attendance: { present: 0, absent: 0, marked_days: 0, recent: [] },
  };
  const t = flatten(buildPdfModel(empty, null));
  assert.match(t, /No marks recorded for this student yet\./);
  assert.match(t, /No attendance has been recorded for this student\./);
  // The two confident lies a naive renderer would print.
  assert.ok(!t.includes("0%"));
  assert.ok(!t.includes("100%"));
});

test("an empty term averages to a dash, never a zero", () => {
  const t = flatten(buildPdfModel(
    {
      student: { name: "Test" },
      terms: ["Term 1"],
      marks_by_term: [{ term: "Term 1", average: null, graded_subjects: 0, total_subjects: 6, subjects: [] }],
      attendance: { recent: [] },
    },
    "Term 1"
  ));
  assert.match(t, /Average {2}—/);
  assert.ok(!/Average {2}0\.0/.test(t));
});

test("guardian email and phone only print when something is recorded", () => {
  // The second guardian in FULL_REPORT has empty contact fields.
  const t = flatten(buildPdfModel(FULL_REPORT, "Term 2"));
  assert.match(t, /Mother · Priya Sharma/);
  assert.ok(!/Phone:  $/m.test(t));
  assert.equal((t.match(/rajesh@example\.com/g) || []).length, 1);
});

test("renderStudentReport writes a real, openable PDF for every state", () => {
  const cases = [
    [FULL_REPORT, "Term 2"],
    [FULL_REPORT, "Term 1"],
    [{ student: { name: "No Records Kid" }, terms: [], marks_by_term: [], attendance: {} }, null],
  ];
  for (const [report, term] of cases) {
    const doc = renderStudentReport(report, term, new jsPDF({ unit: "pt", format: "a4" }));
    const out = doc.output();
    assert.ok(out.length > 1000, "PDF must not be empty");
    assert.match(out.toString("latin1").slice(0, 8), /%PDF-/);
  }
});

test("renderStudentReport returns the document it drew on", () => {
  const doc = new jsPDF();
  assert.equal(renderStudentReport(FULL_REPORT, "Term 1", doc), doc);
});

test("lengthy reports (many days, long addresses) still render", () => {
  const long = {
    ...FULL_REPORT,
    student: {
      ...FULL_REPORT.student,
      guardians: FULL_REPORT.student.guardians.map((g, i) => ({
        ...g,
        address: `Flat ${i}0${i}, a long address that wraps across several lines indeed, Municipal Block, District Road, City ${i}`,
      })),
    },
    attendance: {
      ...FULL_REPORT.attendance,
      recent: Array.from({ length: 60 }, (_, i) => ({
        date: `2026-09-${String((i % 25) + 1).padStart(2, "0")}`,
        status: i % 3 ? "Present" : "Absent",
      })),
    },
  };
  const doc = renderStudentReport(long, "Term 2", new jsPDF({ unit: "pt", format: "a4" }));
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output().length > 1000);
});

test("the downloaded filename is safe, on brand and unique per student", () => {
  assert.equal(studentReportFilename({ name: "Aarav Sharma" }), "student-report-aarav-sharma.pdf");
  assert.equal(studentReportFilename({ name: "Aarav   Sharma!?" }), "student-report-aarav-sharma.pdf");
  assert.equal(studentReportFilename({}), "student-report-student.pdf");
  assert.equal(studentReportFilename(null), "student-report-student.pdf");
});

test("downloadStudentReport renders then saves under the student's filename", () => {
  // A notes-only report so the fake document never sees the autotable plugin.
  const report = {
    student: { student_id: 1, name: "Aarav Sharma" },
    terms: [],
    marks_by_term: [],
    attendance: { recent: [] },
  };
  let saved = null;
  const fakeDoc = {
    save(name) { saved = name; return this; },
    ...makeFakeDrawSurface(),
  };
  downloadStudentReport(report, null, () => fakeDoc);
  assert.equal(saved, "student-report-aarav-sharma.pdf");
});

function makeFakeDrawSurface() {
  return {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
    splitTextToSize: (text) => [text],
    addPage() {},
    setFont() {},
    setFontSize() {},
    setTextColor() {},
    text() {},
    getNumberOfPages: () => 1,
    lastAutoTable: null,
  };
}