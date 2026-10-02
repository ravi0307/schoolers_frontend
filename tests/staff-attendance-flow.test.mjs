import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Staff attendance.
 *
 * The staff_attendance table and the /attendance/staff endpoints shipped in
 * the unified-staff refactor with no frontend caller anywhere in src/ — no
 * component, page or API method reached them. These pin the wiring that now
 * does, so the feature cannot silently become unreachable again.
 *
 * Kept in its own file rather than appended to frontend-api-contracts so the
 * staff-attendance and admin-nav changes can merge independently.
 */

const root = path.resolve(".");

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const ATTENDANCE_API = "src/api/attendance.js";
const ADMIN_STAFF = "src/pages/admin/AdminStaff.jsx";

test("attendance API exposes the staff attendance endpoints", () => {
  const api = source(ATTENDANCE_API);
  assert.match(api, /export const getStaffAttendance/);
  assert.match(api, /export const markStaffAttendance/);
  assert.match(api, /"\/attendance\/staff"/);
  assert.match(api, /"\/attendance\/staff\/mark"/);
});

test("staff attendance reads pass a date range, not an open-ended window", () => {
  // With no date_from/date_to the endpoint returns every row ever recorded,
  // which would seed today's toggles from stale months-old attendance.
  assert.match(
    source(ATTENDANCE_API),
    /getStaffAttendance[\s\S]{0,200}date_from:\s*date[\s\S]{0,120}date_to:\s*date/,
    "getStaffAttendance must bound the query with date_from and date_to"
  );
});

test("admin staff page can read and mark staff attendance", () => {
  const page = source(ADMIN_STAFF);
  // Tolerate line breaks between the namespace and the method: the formatter
  // wraps long call chains, and a source test must not depend on that.
  assert.match(page, /import \* as attendanceApi/);
  assert.match(page, /attendanceApi\s*\.\s*getStaffAttendance\s*\(/);
  assert.match(page, /attendanceApi\s*\.\s*markStaffAttendance\s*\(/);
  assert.match(page, /toggleAttendance/);
});

test("staff attendance defaults to Present and toggles both ways", () => {
  const page = source(ADMIN_STAFF);
  assert.match(
    page,
    /if \(!seeded\[id\]\) seeded\[id\] = "Present"/,
    "staff with no row today must default to Present"
  );
  assert.match(
    page,
    /statuses\[staffId\] === "Present" \? "Absent" : "Present"/,
    "the toggle must flip Present <-> Absent"
  );
});

test("staff attendance default is not silently persisted as a record", () => {
  // Viewing the page must not create attendance rows. "recorded" is tracked
  // separately from the displayed status so unsaved defaults stay visible.
  const page = source(ADMIN_STAFF);
  assert.match(page, /setSaved\(/, "must track which staff actually have a saved row");
  assert.doesNotMatch(
    page,
    /useEffect[\s\S]{0,400}markStaffAttendance/,
    "the seeding effect must not write attendance rows on page view"
  );
});

test("a staff attendance toggle is rendered for every staff row", () => {
  const page = source(ADMIN_STAFF);
  assert.match(page, /aria-pressed=\{statuses\[staffId\] === "Present"\}/);
  assert.match(page, /className=\{`btn sm \$\{statuses\[staffId\] === "Present"/);
});

test("toggling staff attendance cannot expand the staff detail row", () => {
  // The list item toggles expansion on click, so the attendance button must
  // sit inside the existing stopPropagation wrapper or every toggle would
  // also open the detail panel.
  const page = source(ADMIN_STAFF);
  const wrapper = page.match(
    /<div className=(?:"cta-row"|{`cta-row \$\{styles\.staffActions\}`})[^>]*onClick=\{\(e\) => e\.stopPropagation\(\)\}>([\s\S]*?)<\/div>/
  );
  assert.ok(wrapper, "expected a cta-row with stopPropagation");
  assert.match(
    wrapper[1],
    /toggleAttendance/,
    "the attendance toggle must live inside the stopPropagation wrapper"
  );
});
