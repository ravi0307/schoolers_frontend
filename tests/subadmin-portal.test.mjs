import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("src/App.jsx");
const login = read("src/pages/Login.jsx");
const profile = read("src/pages/UserProfile.jsx");
const webLayout = read("src/components/layout/WebLayout.jsx");
const mobileLayout = read("src/components/layout/MobileLayout.jsx");
const adminStaff = read("src/pages/admin/AdminStaff.jsx");
const featureContext = read("src/context/FeatureContext.jsx");
const featureRoute = read("src/components/layout/FeatureRoute.jsx");
const gallery = read("src/utils/galleryAlbums.js");
const adminBroadcast = read("src/pages/admin/AdminBroadcast.jsx");
const readme = read("README.md");

test("the admin portal group admits admin and subadmin together", () => {
  assert.match(app, /roles=\{\["admin", "subadmin"\]\}/);
  // The master group stays exactly as it was — Sub-Admin never joins it.
  assert.match(app, /roles=\{\["master", "submaster"\]\}/);
  assert.doesNotMatch(app, /roles=\{\["master", "submaster", "subadmin"\]\}/);
});

test("every role map lands a sub-admin on the admin portal home", () => {
  // Root redirect (deep entry), post-login landing, and the profile page's
  // "back to portal" link must all agree on /admin/dashboard.
  assert.match(app, /subadmin: "\/admin\/dashboard"/);
  assert.match(login, /subadmin: "\/admin\/dashboard"/);
  assert.match(profile, /subadmin: "\/admin\/dashboard"/);
  // Label and shell: the Sub-Admin renders as itself inside AdminShell.
  assert.match(profile, /subadmin: "Sub-Admin"/);
  assert.match(profile, /subadmin: AdminShell/);
  // Profile lives under the admin portal prefix in both layouts.
  for (const layout of [webLayout, mobileLayout]) {
    assert.match(layout, /subadmin: "\/admin\/profile"/);
  }
});

test("school features and feature gates follow the school-admin tier", () => {
  // Without a schoolId the feature config stays null and every gated nav
  // entry fails closed — the Sub-Admin's portal would gut itself.
  assert.match(featureContext, /\["admin", "subadmin"\]\.includes\(user\?\.role\)/);
  // FeatureRoute gates Sub-Admin sessions exactly like Admin sessions, so
  // direct URLs to disabled features bounce both the same way.
  assert.match(featureRoute, /\["admin", "subadmin"\]\.includes\(user\?\.role\)/);
});

test("add staff shows the sub-admin option only to an admin session", () => {
  assert.match(adminStaff, /import \{ useAuth \} from "\.\.\/\.\.\/context\/AuthContext"/);
  assert.match(adminStaff, /const canAssignSubAdmin = user\?\.role === "admin"/);
  // Option renders for Admin sessions, and also while round-tripping an
  // existing Sub-Admin row — but its presence is keyed on the actor.
  assert.match(
    adminStaff,
    /\{canAssignSubAdmin \|\| roleCategory === "Sub-Admin" \? \(\s*<option value="Sub-Admin">Sub-Admin<\/option>\s*\) : null\}/
  );
  // A Sub-Admin session never reaches canAssignSubAdmin true.
  assert.doesNotMatch(adminStaff, /canAssignSubAdmin = user\?\.role === "subadmin"/);
});

test("the staff form recognizes and round-trips the Sub-Admin label", () => {
  // Normalization maps the label to its own category (before the Other-staff
  // fallback), so edit prefill and the select value stay truthful.
  assert.match(adminStaff, /replace\(\/\[\^a-z\]\/gi, ""\)\.toLowerCase\(\) === "subadmin"/);
  assert.match(adminStaff, /\? "Sub-Admin"\s*:/);
  // The payload sends the category straight through as the role label — no
  // separate account-creation API, no role field invented by the client.
  assert.match(
    adminStaff,
    /role: roleCategory === "Other staff" \? customRoleTitle\.trim\(\) : roleCategory/
  );
  assert.match(adminStaff, /peopleApi\.createStaff\(payload\)/);
  assert.match(adminStaff, /peopleApi\.updateStaff\(editingId, payload\)/);
  assert.doesNotMatch(adminStaff, /person_type/);
});

test("sub-admin rows hide edit and remove from non-admin sessions", () => {
  assert.match(
    adminStaff,
    /const canManageRow =\s*canAssignSubAdmin \|\| person\.role_category !== "Sub-Admin"/
  );
  // Both actions render only inside the gate. (`.*?` spans the `=>` inside
  // the onClick handler — `[^>]*` would stop at the arrow's `>`.)
  assert.match(
    adminStaff,
    /\{canManageRow \? \(\s*<>\s*<button.*?startEdit\(person\)\}>Edit<\/button>\s*<button.*?remove\(staffId\)\}>Remove<\/button>/
  );
  // Attendance toggles stay outside the gate: marking staff present is an
  // ordinary school operation for both admin tiers.
  assert.match(adminStaff, /onClick=\{\(\) => toggleAttendance\(staffId\)\}/);
});

test("admin-equivalent display gates admit the sub-admin tier", () => {
  assert.match(gallery, /user\.role === "admin" \|\| user\.role === "subadmin"\) return true/);
  assert.match(gallery, /user\.role !== "subadmin"\) return false/);
  assert.match(
    adminBroadcast,
    /\["admin", "subadmin"\]\.includes\(user\?\.role\) \|\| editable/
  );
});

test("the profile staff summary mounts for a sub-admin session", () => {
  // A Sub-Admin has a linked staff row exactly like an Admin, so the summary
  // (attendance register, payslip) must mount for it — and never for a
  // submaster, which has no staff record at all.
  assert.match(
    profile,
    /STAFF_LINKED_ROLES = new Set\(\["admin", "subadmin", "teacher", "staff", "pilot"\]\)/
  );
  assert.doesNotMatch(profile, /STAFF_LINKED_ROLES = new Set\(\[[^\]]*"submaster"/);
});

test("there is no separate sub-admin portal to reach", () => {
  // The Sub-Admin shares the /admin/* routes and AdminShell: no route group,
  // link target or shell of its own was introduced to drift out of sync.
  assert.doesNotMatch(app, /path="subadmin/);
  assert.doesNotMatch(app, /to="\/subadmin/);
  assert.doesNotMatch(profile, /SubAdminShell/);
});

test("the admin shell nav is role-agnostic", () => {
  // One shared nav for both tiers: AdminShell never inspects the session, so
  // there is no second list to keep in sync and no link a Sub-Admin misses.
  const adminShell = read("src/components/layout/AdminShell.jsx");
  assert.doesNotMatch(adminShell, /useAuth|user\?\.role|user\.role/);
});

test("the readme documents sub-admin creation through add staff", () => {
  assert.match(readme, /\*\*Sub-Admin\*\*/);
  assert.match(readme, /Add Staff/);
  assert.match(readme, /subadmin|Sub-Admin/);
});
