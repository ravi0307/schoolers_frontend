import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  attendanceScopeLabel,
  currentMonth,
  salaryCanPageNewer,
  salaryNote,
  salaryPageAnchor,
  shiftMonth,
} from "../src/utils/staffReport.js";

// The staff report used to be admin-only, so a teacher had no way to read their
// own register or their own payslips. The profile page now shows both, which
// means the report's honesty rules have to hold on a page the subject reads:
// the full register rather than a 30-day tail, a month filter that narrows the
// counters along with the list, unpaid months as dashes, and the admin's
// remark shown against the payment it belongs to.

const SALARY = {
  window: ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"],
  window_size: 6,
  records: [
    { month: "2026-06", amount: 35000, paid_on: "2026-06-28", note: "Includes a bonus" },
    { month: "2026-09", amount: 45000, paid_on: "2026-09-28", note: null },
  ],
};

function source(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

// ---- month arithmetic behind the pager and the filter ----

test("months shift forwards and backwards, rolling the year", () => {
  assert.equal(shiftMonth("2026-09", -1), "2026-08");
  assert.equal(shiftMonth("2026-09", 1), "2026-10");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2025-12", 1), "2026-01");
  assert.equal(shiftMonth("2026-09", -6), "2026-03");
  assert.equal(shiftMonth("2026-09", 0), "2026-09");
});

test("a value that is not a month cannot become a request anchor", () => {
  assert.equal(shiftMonth(null, -6), null);
  assert.equal(shiftMonth(undefined, -6), null);
  assert.equal(shiftMonth("", -6), null);
  assert.equal(shiftMonth("not-a-month", -6), null);
  assert.equal(shiftMonth("2026-9", -6), null);
});

test("the current month is offered as a YYYY-MM anchor", () => {
  assert.match(currentMonth(), /^\d{4}-\d{2}$/);
  assert.equal(currentMonth(new Date(2026, 8, 15)), "2026-09");
  assert.equal(currentMonth(new Date(2026, 0, 1)), "2026-01");
  assert.equal(currentMonth(new Date(2026, 11, 31)), "2026-12");
});

// ---- the salary pager ----

test("paging older steps off the earliest month on screen", () => {
  // Stepping off window[0] rather than the anchor keeps the months just browsed
  // visible at the top of the next page instead of skipping them.
  assert.equal(salaryPageAnchor(SALARY, "older"), "2025-10");
});

test("paging newer steps off the latest month on screen", () => {
  assert.equal(salaryPageAnchor(SALARY, "newer", "2027-06"), "2027-03");
});

test("paging forward lands on this month rather than past it", () => {
  // A window left open across a term still has to be walkable forward to now,
  // but must not offer three future months with a dash in each.
  assert.equal(salaryPageAnchor(SALARY, "newer", "2026-10"), "2026-10");
  assert.equal(salaryPageAnchor(SALARY, "newer", "2026-12"), "2026-12");
  // "older" is unaffected by where we are today.
  assert.equal(salaryPageAnchor(SALARY, "older", "2026-10"), "2025-10");
});

test("paging is a whole window at a time, not one month", () => {
  const size = SALARY.window_size;
  assert.equal(salaryPageAnchor(SALARY, "older"), shiftMonth(SALARY.window[0], -size));
  assert.equal(
    salaryPageAnchor(SALARY, "newer", "2027-06"),
    shiftMonth(SALARY.window.at(-1), size)
  );
});

test("there is nothing to page without a window", () => {
  assert.equal(salaryPageAnchor({}, "older"), null);
  assert.equal(salaryPageAnchor({ window: [] }, "newer"), null);
  assert.equal(salaryPageAnchor(null, "older"), null);
});

test("the newer control is dead once the window reaches this month", () => {
  assert.equal(salaryCanPageNewer(SALARY, "2026-09"), false);
  // One month behind is still a page away: that month's pay has happened and
  // is not on screen.
  assert.equal(salaryCanPageNewer(SALARY, "2026-10"), true);
  assert.equal(salaryCanPageNewer(SALARY, "2026-12"), true);
  assert.equal(salaryCanPageNewer(SALARY, "2027-01"), true);
});

test("a window that has fallen behind can still be walked forward to now", () => {
  const stale = { ...SALARY, window: ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"] };
  assert.equal(salaryCanPageNewer(stale, "2026-09"), true);
  assert.equal(salaryPageAnchor(stale, "newer", "2026-09"), "2026-09");
  // And once it has arrived, the control stops rather than inviting a jump to
  // a page full of months nobody has paid yet.
  assert.equal(salaryCanPageNewer({ ...stale, window: SALARY.window }, "2026-09"), false);
});

// ---- the remark an admin left on a payment ----

test("a remark is shown as written, and its absence is not a remark", () => {
  assert.equal(salaryNote({ note: "Includes a bonus" }), "Includes a bonus");
  assert.equal(salaryNote({ note: null }), null);
  assert.equal(salaryNote({ note: "" }), null);
  assert.equal(salaryNote({ note: "   " }), null);
  assert.equal(salaryNote({}), null);
  assert.equal(salaryNote(null), null);
});

// ---- which slice of the register the summary covers ----

test("the scope says which slice of the register is on screen", () => {
  assert.equal(attendanceScopeLabel({ month: "2026-09" }), "Sep 2026");
  assert.equal(attendanceScopeLabel({ month: null }), "All time");
  assert.equal(attendanceScopeLabel({}), "All time");
});

// ---- the page wiring ----

test("the reports client reads the self endpoint with no id in it", () => {
  const api = source("src/api/reports.js");
  assert.match(api, /export const myStaffSummary = /);
  assert.match(api, /client\s*\n?\s*\.get\("\/reports\/staff\/me"/);
  assert.match(api, /attendance_month: attendanceMonth/);
  assert.match(api, /salary_end: salaryEnd/);
  // The self call must not smuggle an id past the session scoping.
  const call = api.slice(api.indexOf("export const myStaffSummary"));
  assert.doesNotMatch(call, /staffId|staff_id/);
});

test("the summary is its own component so only staff-linked roles fetch it", () => {
  const page = source("src/pages/UserProfile.jsx");
  assert.match(page, /const STAFF_LINKED_ROLES = new Set\(\["admin", "teacher", "staff", "pilot"\]\)/);
  // parent and master have no staff row, so the fetch must never run for them.
  assert.doesNotMatch(page, /new Set\(\[[^\]]*"parent"/);
  assert.doesNotMatch(page, /new Set\(\[[^\]]*"master"/);
  // The role alone is not enough: an admin can exist before its staff row, so
  // the linked record has to be present before the fetch is made.
  assert.match(page, /const hasStaffRecord = Boolean\(data\?\.linked_person_id\)/);
  // For staff, teacher and pilot, the attendance+salary now live under the
  // "My Report" portal page rather than on the profile. The component and
  // the staff-linked gate remain for admin so its own report still renders.
  assert.doesNotMatch(
    page,
    /<StaffSelfSummary \/>\s*<\/div>\s*<\/Card>/,
    "staff self-summary must not be mounted on the profile for non-admin staff-linked roles"
  );
});

test("an account with no linked staff row shows neither a summary nor its 403", () => {
  // The self-report endpoint refuses an unmatched account with this detail. It
  // is not an error the reader can act on, so the message must never surface as
  // a banner: the page skips the mount, and the component refuses the render.
  const component = source("src/components/profile/StaffSelfSummary.jsx");
  assert.match(component, /isn't linked to a staff record/);
  assert.match(component, /const notLinked = \/isn't linked to a staff record\/\.test\(error \|\| ""\)/);
  assert.match(component, /if \(notLinked\) return null/);
});

test("the summary page filters by month and pages the salary window", () => {
  const component = source("src/components/profile/StaffSelfSummary.jsx");
  assert.match(component, /reportsApi\.myStaffSummary\(\{ attendanceMonth, salaryEnd \}\)/);
  assert.match(component, /\[attendanceMonth, salaryEnd\]/);
  assert.match(component, /type="month"/);
  assert.match(component, /onMonth\(""\)/);
  assert.match(component, /salaryPageAnchor\(data\?\.salary, direction\)/);
  // A month picker must not offer a future month of attendance.
  assert.match(component, /max=\{currentMonth\(\)\}/);
});

test("the summary states its honesty rules instead of implying zeros", () => {
  const component = source("src/components/profile/StaffSelfSummary.jsx");
  assert.match(component, /absence of records, not a percentage of zero/);
  assert.match(component, /never a payment of zero/);
  // The remark column is the point of showing pay here.
  assert.match(component, /salaryNote\(row\.record\)/);
  assert.match(component, /<th scope="col">Remark<\/th>/);
  assert.match(component, /className="sr-dash">—<\/span>/);
});
