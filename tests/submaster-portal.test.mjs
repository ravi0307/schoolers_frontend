import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("src/App.jsx");
const login = read("src/pages/Login.jsx");
const profile = read("src/pages/UserProfile.jsx");
const webLayout = read("src/components/layout/WebLayout.jsx");
const mobileLayout = read("src/components/layout/MobileLayout.jsx");
const masterShell = read("src/components/layout/MasterShell.jsx");
const accountsPage = read("src/pages/master/MasterAccounts.jsx");
const accountsApi = read("src/api/privilegedAccounts.js");
const featureContext = read("src/context/FeatureContext.jsx");

test("the master portal group admits both master and submaster", () => {
  assert.match(app, /roles=\{\["master", "submaster"\]\}/);
  assert.match(app, /import MasterAccounts from "\.\/pages\/master\/MasterAccounts"/);
  assert.match(app, /path="accounts" element=\{<MasterAccounts \/>\}/);
});

test("every role map lands a sub-master on the shared master portal home", () => {
  // Root redirect (deep entry), post-login landing, and the profile page's
  // "back to portal" link must all agree on /master/schools.
  assert.match(app, /submaster: "\/master\/schools"/);
  assert.match(login, /submaster: "\/master\/schools"/);
  assert.match(profile, /submaster: "\/master\/schools"/);
  // Labels and shells: the Sub-Master renders as itself inside MasterShell.
  assert.match(profile, /submaster: "Sub-Master"/);
  assert.match(profile, /submaster: MasterShell/);
  // Profile lives under the master portal prefix in both layouts.
  for (const layout of [webLayout, mobileLayout]) {
    assert.match(layout, /submaster: "\/master\/profile"/);
  }
});

test("a sub-master never enters the accounts screen", () => {
  // The page bounces non-Masters back to the shared home before rendering,
  // and the shell never even offers the nav link without a master session.
  assert.match(accountsPage, /if \(!isMaster\) return <Navigate to="\/master\/schools" replace \/>/);
  assert.match(masterShell, /user\?\.role === "master"/);
  assert.match(masterShell, /\/master\/accounts/);
  // Master-only nav must not degrade the sidebar into group headings.
  assert.doesNotMatch(masterShell, /group:\s*"/);
});

test("account creation never sends a role — the server assigns it", () => {
  assert.match(accountsPage, /const payload = \{ username \};/);
  assert.doesNotMatch(accountsPage, /payload\.role|role:/);
  // The client posts the caller's object untouched — no role injection.
  assert.match(accountsApi, /client\.post\("\/auth\/privileged-accounts", data\)/);
});

test("the generated password is shown once, then discarded", () => {
  assert.match(accountsPage, /setFreshCredentials\(created\)/);
  assert.match(accountsPage, /role="alert"/);
  assert.match(accountsPage, /shown only once and cannot be retrieved/);
  assert.match(accountsPage, /setFreshCredentials\(null\)/);
});

test("deactivate is confirmed, then goes through the dedicated endpoint", () => {
  assert.match(accountsPage, /window\.confirm\(/);
  assert.match(accountsPage, /accountsApi\.deactivatePrivilegedAccount\(account\.user_id\)/);
  // Activation is the reversible PATCH, not the delete endpoint.
  assert.match(accountsPage, /accountsApi\.updatePrivilegedAccount\(account\.user_id, \{ is_active: true \}\)/);
});

test("the privileged accounts client covers the full lifecycle", () => {
  assert.match(accountsApi, /client\.get\("\/auth\/privileged-accounts"\)/);
  assert.match(accountsApi, /client\.post\("\/auth\/privileged-accounts", data\)/);
  assert.match(accountsApi, /client\.patch\(`\/auth\/privileged-accounts\/\$\{userId\}`, data\)/);
  assert.match(accountsApi, /client\.delete\(`\/auth\/privileged-accounts\/\$\{userId\}`\)/);
});

test("sub-master keeps master's session semantics, not a school admin's", () => {
  // No staff row: the profile summary must not try to mount one for it.
  const staffLinked = /const STAFF_LINKED_ROLES = new Set\(\[([^\]]*)\]\)/.exec(profile);
  assert.ok(staffLinked, "staff-linked role set is missing");
  assert.ok(!staffLinked[1].includes("submaster"), "submaster must not be treated as staff-linked");
  // No school of its own: feature flags stay a school-admin concern.
  assert.match(featureContext, /user\?\.role === "admin" \? user\.schoolId : null/);
});

test("the accounts form validates before it sends anything", () => {
  assert.match(accountsPage, /toast\("Enter a username"\)/);
  assert.match(accountsPage, /toast\("The password must be at least 8 characters"\)/);
  // Trimmed username travels; empty optional fields are simply omitted.
  assert.match(accountsPage, /if \(form\.email\.trim\(\)\) payload\.email = form\.email\.trim\(\)/);
  assert.match(accountsPage, /if \(form\.password\) payload\.password = form\.password/);
});

test("the edit sheet prefills the email and only sends a new password when typed", () => {
  assert.match(accountsPage, /setEditForm\(\{ email: account\.email \|\| "", password: "" \}\)/);
  assert.match(accountsPage, /placeholder="Leave blank to keep the current one"/);
  assert.match(accountsPage, /if \(editForm\.password\) payload\.password = editForm\.password/);
  // Email always travels — empty string is the API's documented "clear".
  assert.match(accountsPage, /const payload = \{ email: editForm\.email\.trim\(\) \};/);
  assert.match(accountsPage, /placeholder="Leave blank to clear"/);
});

test("row actions are offered only on sub-master rows", () => {
  assert.match(accountsPage, /\{account\.role === "submaster" && \(/);
  // Master rows still render, read-only, with both pills.
  assert.match(accountsPage, /account\.role === "master" \? "mute" : "info"/);
  assert.match(accountsPage, /account\.role === "master" \? "Master" : "Sub-Master"/);
});

test("submits disable while in flight and both forms cancel cleanly", () => {
  const submits = accountsPage.match(/disabled=\{busy\}/g) || [];
  assert.ok(submits.length >= 2, "create and edit submits should both disable while busy");
  assert.match(accountsPage, /onClick=\{\(\) => setFormOpen\(false\)\}/);
  assert.match(accountsPage, /onClick=\{\(\) => setEditing\(null\)\}/);
});

test("an empty roster renders an empty state, not a blank card", () => {
  assert.match(accountsPage, /accounts\.length === 0 && \(\s*<Empty/);
  assert.match(accountsPage, /<Spinner \/>/);
  assert.match(accountsPage, /<ErrorBanner message=\{error\} \/>/);
});

test("the accounts nav entry sits between Schools and System Health", () => {
  // Structure pin: master-only insert after BASE_NAV[0], before the rest —
  // so the roster link cannot drift to the end of the sidebar unnoticed.
  assert.match(masterShell, /BASE_NAV\[0\],/);
  assert.match(masterShell, /\.\.\.BASE_NAV\.slice\(1\)/);
  assert.match(masterShell, /icon: Users, label: "Accounts"/);
});

test("the support inbox keeps status management for the whole master portal", () => {
  // MasterSupport passes canManageStatus unconditionally — a Sub-Master in
  // the shared inbox moves ticket status exactly like a Master (the backend
  // require_role("master") guard admits both).
  const masterSupport = read("src/pages/master/MasterSupport.jsx");
  assert.match(masterSupport, /canManageStatus(=|\s)/);
  assert.doesNotMatch(masterSupport, /canManageStatus=\{user\?\.role ===/);
});
