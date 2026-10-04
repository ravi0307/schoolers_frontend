import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function source(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

// A staff account logs in successfully, but the SPA had no portal for it: the
// role was missing from every home-route map, so sign-in bounced straight back
// to the login screen. These tests pin the staff portal's wiring -- the login
// redirect, the guarded routes, the shell, and the three pages -- so the role
// cannot be dropped again without a failing test.

test("staff login lands on the staff portal instead of back at /login", () => {
  const login = source("src/pages/Login.jsx");
  assert.match(login, /staff:\s*"\/staff\/broadcast"/, "login has no home route for staff");
  assert.match(source("src/App.jsx"), /staff:\s*"\/staff\/broadcast"/, "root redirect has no home route for staff");
});

test("staff attempting a non-staff route returns to Broadcast with an explanation", () => {
  const guard = source("src/components/layout/ProtectedRoute.jsx");
  assert.match(guard, /user\.role === "staff"/);
  assert.match(guard, /to="\/staff\/broadcast"/);
  assert.match(guard, /accessDenied: true/);
  assert.match(source("src/pages/staff/StaffBroadcast.jsx"), /That page is not available to staff/);
});

test("the staff route group is guarded to the staff role and registers each page", () => {
  const app = source("src/App.jsx");
  assert.match(app, /path="\/staff"/, "the /staff route group is not registered");
  assert.match(app, /roles=\{\["staff"\]\}/, "the /staff group is not guarded to staff");
  for (const page of ["broadcast", "gallery", "report", "profile"]) {
    assert.match(app, new RegExp(`path="${page}"`), `staff route /staff/${page} is missing`);
  }
  assert.match(app, /<StaffBroadcast\s*\/>/, "broadcast page is not mounted");
  assert.match(app, /<StaffGallery\s*\/>/, "gallery page is not mounted");
  assert.match(app, /<StaffReport\s*\/>/, "report page is not mounted");
});

test("the staff shell offers broadcast, gallery and the signed-in report", () => {
  const shell = source("src/components/layout/StaffShell.jsx");
  for (const to of ["/staff/broadcast", "/staff/gallery", "/staff/report"]) {
    assert.ok(shell.includes(`to: "${to}"`), `staff nav is missing ${to}`);
  }
  assert.match(shell, /WebLayout/, "the staff shell must reuse the shared web layout");
});

test("staff profile resolves under its own portal, not the fallback home", () => {
  // WebLayout derives the footer profile link from the session role; without a
  // staff entry it silently points at "/".
  assert.match(source("src/components/layout/WebLayout.jsx"), /staff:\s*"\/staff\/profile"/);
  const profile = source("src/pages/UserProfile.jsx");
  assert.match(profile, /staff:\s*StaffShell/, "UserProfile has no shell for staff");
  assert.match(profile, /staff:\s*"\/staff\/broadcast"/, "UserProfile has no home for staff");
  assert.match(
    profile,
    /STAFF_LINKED_ROLES = new Set\(\[[^\]]*"staff"/,
    "staff must stay in the staff-linked roles so its report mounts"
  );
});

test("staff gallery reuses the school-wide gallery with per-item ownership", () => {
  const page = source("src/pages/staff/StaffGallery.jsx");
  assert.match(page, /GalleryView/);
  assert.match(page, /canUpload\s+canManage/, "staff may upload and manage only via per-item ownership");
});

test("staff report reads the signed-in user's own attendance and salary", () => {
  const page = source("src/pages/staff/StaffReport.jsx");
  assert.match(page, /StaffSelfSummary/, "the report must reuse the self-summary fetch, not an admin lookup");
  assert.doesNotMatch(page, /StaffShell/, "route-level StaffShell must be the only staff shell");
  assert.match(source("src/App.jsx"), /<StaffShell\s*\/>/, "staff routes must use their shared shell");
});

test("staff may address school, class, route and pilot audiences", () => {
  const page = source("src/pages/staff/StaffBroadcast.jsx");
  for (const scope of ["school", "class", "route", "pilot"]) {
    assert.ok(page.includes(`value="${scope}"`), `staff broadcast is missing the ${scope} audience`);
  }
  // The route audience needs a route id, which the create call must send.
  assert.match(page, /route_id:\s*scope === "route" \? Number\(routeId\) : null/);
  assert.match(page, /splitBroadcastsByAuthor/, "staff must get the same Posted/Received split as admin");
});

test("staff can request delete confirmation only from their own outgoing broadcasts", () => {
  const page = source("src/pages/staff/StaffBroadcast.jsx");
  assert.match(page, /postedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, true\)\)/);
  assert.match(page, /receivedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, false\)\)/);
  assert.match(page, /communicationApi\.deleteBroadcast/);
  assert.match(page, /<ConfirmDialog/);
});

// Attendance and salary moved out of My Profile and onto a "My Report" page in
// the sidebar, for the three roles who have a staff row and read their own
// register: staff, teacher and pilot. They share one component, so a teacher
// and a pilot see exactly what an admin's own report shows -- the same fetch,
// the same month filter, the same honest "no records" wording.

test("teacher and pilot get a My Report page in the sidebar", () => {
  for (const [shell, to] of [
    ["src/components/layout/TeacherShell.jsx", "/teacher/report"],
    ["src/components/layout/PilotShell.jsx", "/pilot/report"],
  ]) {
    const nav = source(shell);
    assert.ok(nav.includes(`to: "${to}"`), `${shell} nav is missing ${to}`);
    assert.match(nav, /label:\s*"My Report"/, `${shell} must label the link My Report`);
  }
});

test("the teacher and pilot report routes are registered and guarded", () => {
  const app = source("src/App.jsx");
  assert.match(app, /<Route path="report" element=\{<TeacherReport \/>\}/, "/teacher/report is not registered");
  assert.match(app, /<Route path="report" element=\{<PilotReport \/>\}/, "/pilot/report is not registered");
  assert.match(app, /roles=\{\["teacher"\]\}/);
  assert.match(app, /roles=\{\["pilot"\]\}/);
});

test("every staff-linked non-admin report page reuses the shared self-summary", () => {
  for (const page of [
    "src/pages/teacher/TeacherReport.jsx",
    "src/pages/pilot/PilotReport.jsx",
  ]) {
    const text = source(page);
    // The shared component is what carries the /reports/staff/me fetch, so a
    // per-role copy would be a second implementation of the same report.
    assert.match(text, /StaffSelfSummary/, `${page} must reuse StaffSelfSummary`);
    assert.doesNotMatch(text, /staffReport\(|reportsApi\.staffReport/, `${page} must not look up another person's report`);
  }
});

test("My Profile no longer carries attendance and salary", () => {
  const page = source("src/pages/UserProfile.jsx");
  assert.doesNotMatch(
    page,
    /<StaffSelfSummary\s*\/>/,
    "the self-summary must not also render on the profile page"
  );
});
