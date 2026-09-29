import assert from "node:assert/strict";
import test from "node:test";

import { jsPDF } from "jspdf";
import {
  buildPdfModel,
  downloadStaffReport,
  renderStaffReport,
  staffReportFilename,
} from "../src/utils/staffReportPdf.js";

// The staff PDF is the student sheet's mirror, so the same honesty principles
// apply and are tested the same way -- through the model (the document as
// data), because page coordinates say nothing about whether an unpaid month
// printed as a dash rather than a fake zero.

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
    } else if (s.type === "salary") {
      lines.push("Salary", `Window: ${s.windowLabel}`);
      for (const r of s.rows) lines.push(r.join("  "));
      const h = s.headline;
      lines.push(`${h.monthsPaid} months paid · ${h.outstanding} unpaid in window`);
      lines.push(`Total paid: ${h.total} · Average per paid month: ${h.average}`);
      if (!s.hasRecords) lines.push("No salary is on record for this window. This is not a payment of zero, it is an absence of records.");
    } else if (s.type === "attendance") {
      lines.push("Attendance", `${s.pct} present`);
      lines.push(`${s.present} days present · ${s.absent} days absent · ${s.onLeave} on leave · ${s.halfDay} half days · ${s.marked} days marked`);
      if (s.range) lines.push(`${s.range} — only days with a record. Days nobody marked are not counted as absences.`);
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
  staff: {
    staff_id: 10,
    name: "Meera Iyer",
    role: "teacher",
    role_title: "Maths teacher",
    person_type: "teacher",
    designation: "Maths teacher",
    phone: "9811200220",
    email: "meera@g.test",
    date_of_birth: "1990-03-02",
    gender: "Female",
    marital_status: "Married",
    present_address: "9 Lane",
    permanent_address: "10 Lane",
    aadhaar_card: "1234",
    emergency_number: "999",
    driving_license: "DL1",
    recorded_on: "2026-09-27 18:23:36.518360",
  },
  salary: {
    window: ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"],
    window_size: 6,
    records: [
      { month: "2026-06", amount: 35000, paid_on: "2026-06-28", note: "June" },
      { month: "2026-09", amount: 45000, paid_on: "2026-09-28", note: "September" },
    ],
    months_paid: 2,
    outstanding_months: 4,
    total_paid: 80000,
    average_monthly: 40000,
  },
  attendance: {
    present: 118, absent: 2, on_leave: 1, half_day: 1, marked_days: 122,
    from_date: "2026-01-05", to_date: "2026-09-25",
    recent: [
      { date: "2026-09-25", status: "Present" },
      { date: "2026-09-24", status: "Absent" },
    ],
  },
};

test("the PDF carries the staff identity and designation up top", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  assert.match(t, /Meera Iyer/);
  assert.match(t, /^.*Maths teacher .*teacher .*Female.*$/m);
});

test("details print, including the fields the student report does not have", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  assert.match(t, /Designation: {2}Maths teacher/);
  assert.match(t, /9811200220/);
  assert.match(t, /Date of birth: {2}2 Mar 1990/);
  assert.match(t, /Marital status: {2}Married/);
  assert.match(t, /Aadhaar card: {2}1234/);
  assert.match(t, /Driving license: {2}DL1/);
  assert.match(t, /Recorded on: {2}27 Sep 2026/);
});

test("the salary prints the whole window, unpaid months as dashes", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  assert.match(t, /Window: Apr 2026 – Sep 2026/);
  assert.match(t, /Apr 2026 {2}—/);
  assert.match(t, /May 2026 {2}—/);
  assert.match(t, /Jun 2026 {2}35,000 {2}28 Jun 2026/);
  assert.match(t, /Sep 2026 {2}45,000 {2}28 Sep 2026/);
  assert.match(t, /2 months paid · 4 unpaid in window/);
  assert.match(t, /Total paid: 80,000 · Average per paid month: 40,000/);
});

test("no salary prints the honesty note, never a payment of zero", () => {
  const t = flatten(buildPdfModel({
    ...FULL_REPORT,
    salary: {
      window: ["2026-04"], window_size: 1,
      records: [], months_paid: 0, outstanding_months: 1,
      total_paid: 0, average_monthly: null,
    },
  }));
  assert.match(t, /No salary is on record for this window/);
  assert.ok(!/Average per paid month: 0/.test(t));
});

test("attendance prints the four staff statuses and the percentage", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  assert.match(t, /96\.7% present/);
  assert.match(t, /118 days present · 2 days absent · 1 on leave · 1 half days · 122 days marked/);
  assert.match(t, /5 Jan 2026 – 25 Sep 2026 — only days with a record/);
  assert.match(t, /25 Sep 2026: Present/);
});

test("no attendance prints the absence-of-data note, not a percentage of zero", () => {
  const t = flatten(buildPdfModel({
    ...FULL_REPORT,
    attendance: { present: 0, absent: 0, on_leave: 0, half_day: 0, marked_days: 0, recent: [] },
  }));
  assert.match(t, /No attendance has been recorded for this staff member/);
  assert.ok(!t.includes("0%"));
});

test("no invented figures ever land on the sheet", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  for (const forbidden of ["0%", "100%", "Grade", "Passed", "Failed", "Rank"]) {
    assert.ok(!t.includes(forbidden), `PDF must not contain "${forbidden}"`);
  }
});

test("the foot explains salary and attendance honesty and generation", () => {
  const t = flatten(buildPdfModel(FULL_REPORT));
  assert.match(t, /Salary is what is on record per month/);
  assert.match(t, /^.*Generated.*$/m);
});

test("renderStaffReport writes a real, openable PDF for every state", () => {
  const cases = [
    [FULL_REPORT],
    [{ ...FULL_REPORT, salary: { window: [], window_size: 0, records: [], months_paid: 0, outstanding_months: 0, total_paid: 0, average_monthly: null }, attendance: {} }],
  ];
  for (const [report] of cases) {
    const doc = renderStaffReport(report, new jsPDF({ unit: "pt", format: "a4" }));
    const out = doc.output();
    assert.ok(out.length > 1000, "PDF must not be empty");
    assert.match(out.toString("latin1").slice(0, 8), /%PDF-/);
  }
});

test("renderStaffReport returns the document it drew on", () => {
  const doc = new jsPDF();
  assert.equal(renderStaffReport(FULL_REPORT, doc), doc);
});

test("lengthy staff reports (many attendance days) still render", () => {
  const long = {
    ...FULL_REPORT,
    attendance: {
      ...FULL_REPORT.attendance,
      recent: Array.from({ length: 120 }, (_, i) => ({
        date: `2026-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 25) + 1).padStart(2, "0")}`,
        status: i % 3 ? "Present" : "Absent",
      })),
    },
  };
  const doc = renderStaffReport(long, new jsPDF({ unit: "pt", format: "a4" }));
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output().length > 1000);
});

test("the downloaded filename is safe and on brand", () => {
  assert.equal(staffReportFilename({ name: "Meera Iyer" }), "staff-report-meera-iyer.pdf");
  assert.equal(staffReportFilename({ name: "Meera   Iyer!?" }), "staff-report-meera-iyer.pdf");
  assert.equal(staffReportFilename({}), "staff-report-staff.pdf");
  assert.equal(staffReportFilename(null), "staff-report-staff.pdf");
});

test("downloadStaffReport renders then saves under the staff member's filename", () => {
  const report = {
    ...FULL_REPORT,
    staff: { ...FULL_REPORT.staff, name: "Meera Iyer" },
    salary: { window: [], window_size: 0, records: [], months_paid: 0, outstanding_months: 0, total_paid: 0, average_monthly: null },
    attendance: { recent: [] },
  };
  let saved = null;
  const fakeDoc = {
    save(name) { saved = name; return this; },
    ...makeFakeDrawSurface(),
  };
  downloadStaffReport(report, () => fakeDoc);
  assert.equal(saved, "staff-report-meera-iyer.pdf");
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