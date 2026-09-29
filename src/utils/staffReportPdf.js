/**
 * The staff report as a PDF.
 *
 * Same bargain as the student report's sheet: this writes a real .pdf the
 * admin asked for, from the same report object the popup renders, and the
 * drawing code stays thin because every decision lives in buildPdfModel as
 * data where the tests can read it. An unpaid window month prints as "—",
 * never as 0. A staff member nobody ever marked prints "No records", never a
 * confident percentage. And every paid amount carries its paid-on date, so a
 * sheet can never be mistaken about when the money moved.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatAmount,
  monthLabel,
  salaryRows,
  salaryWindowLabel,
  hasAttendance,
  attendanceLabel,
  attendanceRangeLabel,
  formatDay,
} from "./staffReport.js";

/**
 * The report as plain data, ready to draw.
 *
 * `buildPdfModel` is what a test reads; the drawing code below just walks the
 * sections it returns. That mirrors the student report's PDF exactly, so the
 * two sheets hang together and the honesty rules cannot drift apart quietly.
 */
export function buildPdfModel(report) {
  const staff = report?.staff || {};
  const salary = report?.salary || {};
  const attendance = report?.attendance || {};

  const sub = [
    staff.designation,
    staff.person_type,
    staff.gender,
  ].filter(Boolean).join(" · ");

  const sections = [];

  sections.push({
    type: "title",
    name: staff.name || "Staff report",
    sub,
  });

  sections.push({
    type: "details",
    items: [
      { label: "Designation", value: staff.designation },
      { label: "Phone", value: staff.phone },
      { label: "Email", value: staff.email },
      { label: "Date of birth", value: staff.date_of_birth ? formatDay(staff.date_of_birth) : "" },
      { label: "Gender", value: staff.gender },
      { label: "Marital status", value: staff.marital_status },
      { label: "Present address", value: staff.present_address },
      { label: "Permanent address", value: staff.permanent_address },
      { label: "Aadhaar card", value: staff.aadhaar_card },
      { label: "Emergency number", value: staff.emergency_number },
      { label: "Driving license", value: staff.driving_license },
      { label: "Recorded on", value: staff.recorded_on ? formatDay(staff.recorded_on) : "" },
    ],
  });

  // Salary: always print the window, dash for months without a record.
  const rows = salaryRows(salary).map((r) => [
    monthLabel(r.month),
    r.record ? formatAmount(r.record.amount) : "—",
    r.record?.paid_on ? formatDay(r.record.paid_on) : (r.record ? "—" : ""),
  ]);
  const records = salary.records || [];
  sections.push({
    type: "salary",
    windowLabel: salaryWindowLabel(salary),
    rows,
    headline: {
      monthsPaid: salary.months_paid || 0,
      outstanding: salary.outstanding_months || 0,
      total: formatAmount(salary.total_paid),
      average: salary.average_monthly === null || salary.average_monthly === undefined
        ? "—"
        : formatAmount(salary.average_monthly),
    },
    hasRecords: records.length > 0,
  });

  if (hasAttendance(attendance)) {
    sections.push({
      type: "attendance",
      pct: attendanceLabel(attendance),
      present: attendance.present,
      absent: attendance.absent,
      onLeave: attendance.on_leave,
      halfDay: attendance.half_day,
      marked: attendance.marked_days,
      range: attendanceRangeLabel(attendance),
      recent: (attendance.recent || [])
        .map((d) => ({ date: formatDay(d.date), status: d.status }))
        .slice(0, 14),
    });
  } else {
    sections.push({
      type: "note",
      title: "Attendance",
      text: "No attendance has been recorded for this staff member. This is not a percentage of zero, it is an absence of records.",
    });
  }

  sections.push({
    type: "foot",
    lines: [
      "Salary is what is on record per month, each with the date it was actually paid; an unpaid month within the window shows as \"—\". Attendance counts only days someone marked.",
      `Generated ${new Date().toISOString()}.`,
    ],
  });

  return sections;
}

/** Draw a model into an open jsPDF document. Accepts the doc for tests. */
export function renderStaffReport(report, doc) {
  const model = buildPdfModel(report);
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
    } else if (section.type === "salary") {
      place("Salary", { size: 12, bold: true, gap: 6 });
      place(`Window: ${section.windowLabel}`, { size: 9, color: [110, 110, 110], gap: 12 });
      const head = [["Month", "Amount", "Paid on"]];
      const body = section.rows;
      if (body.length) {
        if (y > bottom - 60) {
          doc.addPage();
          y = 56;
        }
        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M },
          head,
          headStyles: { fillColor: [236, 238, 244], textColor: [40, 40, 40], fontStyle: "bold", fontSize: 10 },
          body,
          bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
          styles: { cellPadding: 5, lineColor: [226, 228, 234] },
          theme: "grid",
        });
        y = doc.lastAutoTable.finalY + 12;
      }
      const h = section.headline;
      place(`${h.monthsPaid} months paid · ${h.outstanding} unpaid in window`, { size: 9, color: [110, 110, 110], gap: 8 });
      place(`Total paid: ${h.total} · Average per paid month: ${h.average}`, { size: 10, bold: true, gap: 16 });
      if (!section.hasRecords) {
        place("No salary is on record for this window. This is not a payment of zero, it is an absence of records.", { size: 9, italic: true, color: [110, 110, 110], gap: 16 });
      }
    } else if (section.type === "attendance") {
      place("Attendance", { size: 12, bold: true, gap: 8 });
      place(`${section.pct} present`, { size: 16, bold: true, gap: 16 });
      place(
        `${section.present} days present · ${section.absent} days absent · ${section.onLeave} on leave · ${section.halfDay} half days · ${section.marked} days marked`,
        { size: 10, gap: 10 }
      );
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

/** A filename safe to put on disk, e.g. "staff-report-meera.pdf". */
export function staffReportFilename(staff) {
  const name = String(staff?.name || "staff")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `staff-report-${name || "staff"}.pdf`;
}

/** Build, render and download the report in one call, ready for a button. */
export function downloadStaffReport(report, docFactory) {
  const makeDoc = docFactory || (() => new jsPDF({ unit: "pt", format: "a4", compress: true }));
  const doc = renderStaffReport(report, makeDoc());
  doc.save(staffReportFilename(report?.staff));
}