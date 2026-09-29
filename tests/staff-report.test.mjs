import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAmount,
  monthLabel,
  salaryHeadline,
  salaryRows,
  salaryWindowLabel,
  filterStaff,
  statusTone,
} from "../src/utils/staffReport.js";
import { hasAttendance } from "../src/utils/staffReport.js";

// The staff report is the student report's mirror, with money. The same
// honesty holds: a salary with no record must not read as "paid nothing", a
// staff member nobody ever marked must not look like they were absent "0%"
// of the time, and an unpaid window month is a dash -- the exact visual the
// accounts grid already uses.

const SALARY = {
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
  from_month: "2026-06",
  to_month: "2026-09",
};

test("months render as readable labels for the window and the grid", () => {
  assert.equal(monthLabel("2026-09"), "Sep 2026");
  assert.equal(monthLabel("2026-01"), "Jan 2026");
  assert.equal(monthLabel("2026-04"), "Apr 2026");
  assert.equal(monthLabel(null), "");
  assert.equal(monthLabel("not-a-month"), "not-a-month");
});

test("the window label spans the first to the last month", () => {
  assert.equal(salaryWindowLabel(SALARY), "Apr 2026 – Sep 2026");
  assert.equal(salaryWindowLabel({ window: [] }), "");
  assert.equal(salaryWindowLabel({}), "");
});

test("amounts group thousands the way the ledger does", () => {
  assert.equal(formatAmount(80000), "80,000");
  assert.equal(formatAmount(45000.5), "45,000.5");
  assert.equal(formatAmount(0), "0");
  assert.equal(formatAmount(null), "—");
  assert.equal(formatAmount(undefined), "—");
});

test("every window month is a row, unpaid months as a null record", () => {
  const rows = salaryRows(SALARY);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0], { month: "2026-04", record: null });
  assert.equal(rows[0].record, null, "an unpaid window month is a dash, not 0");
  assert.equal(rows[2].record.month, "2026-06");
  assert.deepEqual(
    rows.map((r) => [r.month, r.record?.amount ?? "—"]),
    [
      ["2026-04", "—"],
      ["2026-05", "—"],
      ["2026-06", 35000],
      ["2026-07", "—"],
      ["2026-08", "—"],
      ["2026-09", 45000],
    ]
  );
  assert.deepEqual(salaryRows({}), []);
});

test("the salary headline carries the summary without inventing zeros", () => {
  assert.deepEqual(salaryHeadline(SALARY), {
    monthsPaid: 2,
    outstanding: 4,
    total: "80,000",
    average: "40,000",
  });
  // No records at all: average is a dash, never a confident "0".
  assert.deepEqual(salaryHeadline({ months_paid: 0, outstanding_months: 6, total_paid: 0, average_monthly: null }), {
    monthsPaid: 0,
    outstanding: 6,
    total: "0",
    average: "—",
  });
});

test("attendance helpers stay honest for a person nobody ever marked", () => {
  assert.equal(hasAttendance({ present: 5, marked_days: 5 }), true);
  assert.equal(hasAttendance({ present: 0, absent: 0, marked_days: 0 }), false);
  assert.equal(hasAttendance(undefined), false);
});

test("staff day statuses map to Pill's own tones, half day and leave as info", () => {
  assert.equal(statusTone("Present"), "ok");
  assert.equal(statusTone("Absent"), "warn");
  assert.equal(statusTone("On leave"), "info");
  assert.equal(statusTone("Half day"), "info");
  assert.equal(statusTone("Anything Else"), "mute");
});

const STAFF = [
  { staff_id: 1, name: "Meera Iyer", role: "driver", role_title: "Driver" },
  { staff_id: 2, name: "Arun", role: "teacher", role_title: "Maths teacher", person_type: "teacher" },
  { staff_id: 3, name: "Priya", role: "staff", person_type: "staff", phone: "9811200220" },
];

test("searching the staff list hits name, role, role title and phone", () => {
  const ids = (q) => filterStaff(STAFF, q).map((s) => s.staff_id);
  assert.deepEqual(ids("meera"), [1]);
  assert.deepEqual(ids("driver"), [1], "a role search catches the role itself");
  assert.deepEqual(ids("teacher"), [2], "a role search finds the role and title");
  assert.deepEqual(ids("staff"), [3], "person_type staff matches");
  assert.deepEqual(ids("maths"), [2]);
  assert.deepEqual(ids("9811200220"), [3]);
  assert.deepEqual(ids("priya"), [3]);
  assert.deepEqual(ids("zzz"), []);
});

test("an empty or blank staff search is no filter", () => {
  assert.equal(filterStaff(STAFF, "").length, 3);
  assert.equal(filterStaff(STAFF, "   ").length, 3);
  assert.equal(filterStaff(STAFF, null).length, 3);
  assert.equal(filterStaff(null, "").length, 0);
});