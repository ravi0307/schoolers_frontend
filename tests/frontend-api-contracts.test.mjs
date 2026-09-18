import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(".");

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertContains(file, patterns) {
  const text = source(file);
  for (const pattern of patterns) {
    assert.match(text, pattern, `${file} is missing ${pattern}`);
  }
}

test("every frontend API module is wired to its required backend surface", () => {
  assertContains("src/api/auth.js", [
    /\/auth\/login/,
    /\/auth\/me/,
    /\/auth\/forgot-password/,
    /\/auth\/forgot-password\/reset/,
    /otp/,
  ]);
  assertContains("src/api/academics.js", [/\/classes/, /\/subjects/, /\/periods/, /\/holidays/]);
  assertContains("src/api/attendance.js", [/\/attendance\/mark/, /\/attendance/]);
  assertContains("src/api/marks.js", [/\/marks\/student/, /\/marks\/\$\{studentId\}/]);
  assertContains("src/api/leave.js", [/\/leave/, /approve/, /reject/]);
  assertContains("src/api/people.js", [/\/teachers/, /\/staff/, /\/parents/, /\/students/]);
  assertContains("src/api/transport.js", [/\/routes/, /\/vehicles/, /\/pilots/, /\/stops/, /students/]);
  assertContains("src/api/schools.js", [/\/schools/, /features/, /status/, /stats/]);
  assertContains("src/api/reports.js", [/\/reports\/school/, /\/reports\/class/]);
  assertContains("src/api/notifications.js", [/\/notifications\/school/, /\/notifications\/\$\{id\}\/read/]);
  assertContains("src/api/barter.js", [/\/barter/]);
  assertContains("src/api/activities.js", [/\/activities/]);
  assertContains("src/api/communication.js", [/\/broadcasts/, /\/media/]);
  assertContains("src/api/website.js", [/\/website\/settings/, /\/website\/pages/, /\/website\/go-live/, /\/public\/sites\/by-name/, /\/public\/sites/]);
  assertContains("src/api/media.js", [/\/media/]);
  assertContains("src/api/uploads.js", [/\/schools\/\$\{schoolId\}\/upload/, /School ID is required/]);
  assertContains("src/api/systemHealth.js", [/\/health/, /\/health\/services/]);
  assertContains("src/api/timetable.js", [
    /\/timetable\/class\/\$\{classId\}/,
    /\/timetable\/class\/\$\{classId\}\/period/,
    /\/timetable\/entry\/\$\{entryId\}/,
  ]);
});

test("timetable API uses entry updates for subject, teacher, and time changes", () => {
  const timetable = source("src/api/timetable.js");
  assert.match(timetable, /client\.patch\(`\/timetable\/entry\/\$\{entryId\}`, data\)/);
  assert.doesNotMatch(source("src/pages/admin/AdminTimetable.jsx"), /academicsApi\.updatePeriod/);
});

test("key frontend workflows remain represented by application routes", () => {
  const app = source("src/App.jsx");
  for (const route of ["/login", "/site/:schoolId", "/website/:schoolName"]) {
    assert.ok(app.includes(`path="${route}"`), `route ${route} is not registered`);
  }
  const routeGroups = {
    parent: ["home", "attendance", "marks", "leave", "barter"],
    teacher: ["dashboard", "attendance", "marks", "timetable"],
    admin: ["dashboard", "classes", "timetable", "album", "broadcast", "students", "staff", "routes", "leave", "website", "notifications"],
    pilot: ["pickdrop", "leave"],
    master: ["schools", "schools/:schoolId", "system-health"],
  };
  for (const [role, routes] of Object.entries(routeGroups)) {
    assert.ok(app.includes(`path="/${role}/*"`), `route group /${role} is not registered`);
    for (const route of routes) {
      assert.ok(app.includes(`path="${route}"`), `route /${role}/${route} is not registered`);
    }
  }
});

test("public website is reachable by school slug and supports go-live", () => {
  const app = source("src/App.jsx");
  assert.ok(app.includes('path="/website/:schoolName"'), "public website slug route is not registered");
  const website = source("src/api/website.js");
  assert.match(website, /\/website\/go-live/);
  assert.match(website, /\/public\/sites\/by-name/);
  const publicPage = source("src/pages/PublicWebsite.jsx");
  assert.match(publicPage, /getPublicSiteByName/);
  assert.match(publicPage, /getPublicSite\(/);
});

test("admin website publishes from the preview and edits every content section", () => {
  const admin = source("src/pages/admin/AdminWebsite.jsx");
  assert.match(admin, /website-preview-overlay/);
  assert.match(admin, /Go Live/);
  assert.match(admin, /RichTextEditor/);
  assert.match(admin, /Footer/);
  assert.match(admin, /Testimonials/);
  const editor = source("src/components/ui/RichTextEditor.jsx");
  assert.match(editor, /contentEditable/);
  assert.match(source("src/components/site/PublicSiteView.jsx"), /dangerouslySetInnerHTML/);
});

test("role shells and feature pages are imported by the application", () => {
  const app = source("src/App.jsx");
  for (const component of [
    "Login", "PublicWebsite", "ParentHome", "TeacherDashboard", "AdminDashboard",
    "AdminTimetable", "AdminBroadcast", "AdminWebsite", "AdminRoutes",
    "PilotPickDrop", "MasterSchools", "MasterSystemHealth",
  ]) {
    assert.match(app, new RegExp(`import ${component} from`), `${component} is not imported`);
  }
});

test("authentication persists and clears the complete session lifecycle", () => {
  const auth = source("src/context/AuthContext.jsx");
  assert.match(auth, /schoolers_access_token/);
  assert.match(auth, /schoolers_refresh_token/);
  assert.match(auth, /schoolers_user/);
  assert.match(auth, /localStorage\.clear\(\)/);
  assert.match(auth, /setUser\(null\)/);
});
