/**
 * The student report as a PDF.
 *
 * The browser-side alternative to this is a print stylesheet, which hands the
 * reader a browser print dialog and calls it a download. This writes a real
 * .pdf the admin asked for, from the same report object the popup renders.
 *
 * The drawing code is intentionally thin. Everything a PDF may or may not
 * contain is decided in buildPdfModel, which is pure and returns the document
 * as data, because a page of PostScript tells a test almost nothing about the
 * report it describes -- and the reports in this app are defined by what they
 * refuse to print. No grade, no pass/fail, no 0% for a student nobody marked.
 *
 * The same caveats as the popup: scores are out of 100 as recorded per subject
 * per term, there is no exam or grade band in the system, and a missing value
 * is printed as a dash or "No records", never as a confident zero.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  attendanceLabel,
  attendanceRangeLabel,
  averageLabel,
  formatDay,
  subjectCoverage,
} from "./studentReport.js";

/**
 * The report as plain data, ready to draw.
 *
 * `term` is the term to print, matching the popup's selector. A PDF is a
 * snapshot, and the snapshot is of what the admin is looking at now.
 */
export function buildPdfModel(report, term) {
  const student = report?.student || {};
  const attendance = report?.attendance;
  const terms = report?.terms || [];

  const byTerm = (report?.marks_by_term || []).find((t) => t.term === term) || null;

  const sub = [
    student.admission_no,
    student.class_name,
    student.gender,
  ].filter(Boolean).join(" · ");

  const sections = [];

  sections.push({
    type: "title",
    name: student.name || "Student report",
    sub,
  });

  sections.push({
    type: "details",
    items: [
      { label: "Admission no", value: student.admission_no },
      { label: "Class", value: student.class_name },
      { label: "Date of birth", value: student.date_of_birth ? formatDay(student.date_of_birth) : "" },
      { label: "Gender", value: student.gender },
      { label: "Recorded on", value: student.recorded_on ? formatDay(student.recorded_on) : "" },
    ],
  });

  sections.push({
    type: "guardians",
    guardians: student.guardians || [],
  });

  if (terms.length) {
    const coverage = subjectCoverage(byTerm);
    sections.push({
      type: "marks",
      term,
      rows: (byTerm?.subjects || []).map((s) => ({
        subject: s.subject_name || `Subject ${s.subject_id}`,
        score: s.score,
      })),
      average: averageLabel(byTerm),
      coverage,
    });
  } else {
    sections.push({ type: "note", title: "Marks", text: "No marks recorded for this student yet." });
  }

  const pct = attendanceLabel(attendance);
  const range = attendanceRangeLabel(attendance);
  if (attendance?.marked_days) {
    sections.push({
      type: "attendance",
      pct,
      present: attendance.present,
      absent: attendance.absent,
      marked: attendance.marked_days,
      range,
      recent: (attendance.recent || [])
        .map((d) => ({ date: formatDay(d.date), status: d.status }))
        .slice(0, 14),
    });
  } else {
    sections.push({
      type: "note",
      title: "Attendance",
      text: "No attendance has been recorded for this student. This is not a percentage of zero, it is an absence of records.",
    });
  }

  sections.push({
    type: "foot",
    lines: [
      "Scores are out of 100 as recorded per subject per term. There is no exam, grade band or pass/fail in the system, so none is shown.",
      `Generated ${formatDay(new Date().toISOString())}.`,
    ],
  });

  return sections;
}

/**
 * Draw a model into an open jsPDF document.
 *
 * Accepts the document so tests can hand this a fake and so a caller can put
 * the report on company letterhead later without the drawing code moving.
 */
export function renderStudentReport(report, term, doc) {
  const model = buildPdfModel(report, term);
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bottom = pageH - 48;
  let y = 56;

  const lines = (text, maxW) => doc.splitTextToSize(String(text ?? ""), maxW);

  const place = (text, { size, bold = false, italic = false, color, gap = 20, maxW } = {}) => {
    const wrapped = lines(text, maxW || W - M * 2);
    const lh = size + 5;
    for (const ln of wrapped) {
      if (y > bottom - lh) {
        doc.addPage();
        y = 56;
      }
      doc.setFont("helvetica", bold ? "bold" : italic ? "italic" : "normal");
      doc.setFontSize(size || 10);
      doc.setTextColor(...(color || [40, 40, 40]));
      doc.text(ln, M, y);
      y += lh;
    }
    y += (gap || 20) - (size || 10) - 5;
  };

  for (const section of model) {
    if (section.type === "title") {
      place(section.name, { size: 20, bold: true, gap: 8 });
      place(section.sub, { size: 10, color: [110, 110, 110], gap: 28 });
    } else if (section.type === "details") {
      place("Details", { size: 12, bold: true, gap: 12 });
      for (const { label, value } of section.items) {
        if (!value) continue;
        place(`${label}:  ${value}`, { size: 10, gap: 14, maxW: W - M * 2 });
      }
      y += 10;
    } else if (section.type === "guardians") {
      place("Guardians", { size: 12, bold: true, gap: 12 });
      if (!section.guardians.length) {
        place("No guardian is linked to this student.", { size: 10, gap: 10 });
      }
      for (const g of section.guardians) {
        const header = [g.relationship || "Guardian", g.name].filter(Boolean).join(" · ");
        place(header, { size: 10, bold: true, gap: 8 });
        for (const { label, value } of [
          { label: "Phone", value: g.phone },
          { label: "Email", value: g.email },
          { label: "Emergency", value: g.emergency_number },
          { label: "Address", value: g.address },
        ]) {
          if (value) place(`${label}:  ${value}`, { size: 10, gap: 12, maxW: W - M * 2 });
        }
        y += 8;
      }
    } else if (section.type === "marks") {
      place(`Marks — ${section.term}`, { size: 12, bold: true, gap: 12 });
      const rows = section.rows.map((r) => [r.subject, String(r.score)]);
      if (rows.length) {
        if (y > bottom - 60) {
          doc.addPage();
          y = 56;
        }
        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M },
          head: [["Subject", "Score"]],
          headStyles: { fillColor: [236, 238, 244], textColor: [40, 40, 40], fontStyle: "bold", fontSize: 10 },
          body: rows,
          bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
          foot: [["Average", section.average]],
          footStyles: { fillColor: [245, 246, 249], textColor: [40, 40, 40], fontStyle: "bold", fontSize: 10 },
          columnStyles: { 1: { halign: "right" } },
          styles: { cellPadding: 5, lineColor: [226, 228, 234], textColor: [40, 40, 40] },
          theme: "grid",
        });
        y = doc.lastAutoTable.finalY + 14;
      } else {
        place("No marks recorded for this student yet.", { size: 10, gap: 10 });
      }
      if (section.coverage) {
        place(`${section.coverage} — only marked subjects are listed.`, { size: 9, italic: true, color: [110, 110, 110], gap: 16 });
      }
    } else if (section.type === "attendance") {
      place("Attendance", { size: 12, bold: true, gap: 8 });
      place(`${section.pct} present`, { size: 16, bold: true, gap: 16 });
      place(`${section.present} days present · ${section.absent} days absent · ${section.marked} days marked`, { size: 10, gap: 10 });
      if (section.range) {
        place(`${section.range} — the only days with a record. Days nobody marked are not counted as absences.`, { size: 9, color: [110, 110, 110], gap: 14 });
      }
      if (section.recent.length) {
        place("Most recent days", { size: 10, bold: true, gap: 8 });
        for (const d of section.recent) {
          place(`${d.date}: ${d.status}`, { size: 10, gap: 14 });
        }
      }
    } else if (section.type === "note") {
      place(section.title, { size: 12, bold: true, gap: 12 });
      place(section.text, { size: 10, gap: 16, maxW: W - M * 2 });
    } else if (section.type === "foot") {
      place("", { size: 0, gap: 24 });
      for (const ln of section.lines) {
        place(ln, { size: 8, italic: true, color: [120, 120, 120], gap: 10, maxW: W - M * 2 });
      }
    }
  }

  return doc;
}

/** A filename safe to put on disk, e.g. "student-report-aarav-sharma.pdf". */
export function studentReportFilename(student) {
  const name = String(student?.name || "student")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `student-report-${name || "student"}.pdf`;
}

/**
 * Build, render and download the report in one call, ready to hand to a
 * button's onClick in the popup.
 *
 * `docFactory` exists so tests can substitute a document that records what it
 * is told to save; the default is the real thing.
 */
export function downloadStudentReport(report, term, docFactory) {
  const makeDoc = docFactory || (() => new jsPDF({ unit: "pt", format: "a4", compress: true }));
  const doc = renderStudentReport(report, term, makeDoc());
  doc.save(studentReportFilename(report?.student));
}