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
    /\/auth\/forgot-password\/verify/,
    /\/auth\/forgot-password\/reset/,
  ]);
  assertContains("src/api/academics.js", [/\/classes/, /\/subjects/, /\/periods/, /\/holidays/]);
  assertContains("src/api/attendance.js", [/\/attendance\/mark/, /\/attendance/]);
  assertContains("src/api/marks.js", [/\/marks\/student/, /\/marks\/class/, /\/marks\/\$\{studentId\}/]);
  assertContains("src/api/leave.js", [/\/leave/, /approve/, /reject/]);
  assertContains("src/api/people.js", [/\/teachers/, /\/staff/, /\/parents/, /\/students/]);
  assertContains("src/api/transport.js", [/\/routes/, /\/vehicles/, /\/pilots/, /\/stops/, /students/]);
  assertContains("src/api/schools.js", [/\/schools/, /features/, /status/, /stats/]);
  assertContains("src/api/reports.js", [/\/reports\/school/, /\/reports\/class/]);
  assertContains("src/api/notifications.js", [/\/notifications\/school/, /\/notifications\/\$\{id\}\/read/]);
  assertContains("src/api/barter.js", [/\/barter/]);
  assertContains("src/api/activities.js", [/\/activities/]);
  assertContains("src/api/communication.js", [/\/broadcasts/, /\/media/]);
  assertContains("src/api/website.js", [/\/website\/settings/, /\/website\/pages/, /\/website\/go-live/, /\/public\/sites/]);
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
  for (const route of ["/login", "/site/:schoolId"]) {
    assert.ok(app.includes(`path="${route}"`), `route ${route} is not registered`);
  }
  const routeGroups = {
    parent: ["home", "attendance", "marks", "leave", "barter"],
    teacher: ["dashboard", "attendance", "marks", "timetable"],
    admin: ["dashboard", "classes", "timetable", "album", "broadcast", "students", "staff", "routes", "leave", "website", "notifications"],
    pilot: ["pickdrop", "broadcast", "leave"],
    master: ["schools", "schools/:schoolId", "system-health"],
  };
  for (const [role, routes] of Object.entries(routeGroups)) {
    assert.ok(app.includes(`path="/${role}/*"`), `route group /${role} is not registered`);
    for (const route of routes) {
      assert.ok(app.includes(`path="${route}"`), `route /${role}/${route} is not registered`);
    }
  }
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

test("pilot broadcast is a routed tab that sends route-scoped broadcasts", () => {
  assertContains("src/App.jsx", [/import PilotBroadcast from/, /path="broadcast" element=\{<PilotBroadcast \/>\}/]);
  assertContains("src/pages/pilot/PilotBroadcast.jsx", [
    /scope: "route"/,
    /route_id: route\.route_id/,
    /communicationApi\.createBroadcast/,
  ]);
});

test("pilot tab bar orders tabs as Pick & Drop → Broadcast → Leave", () => {
  const shell = source("src/components/layout/PilotShell.jsx");
  const ordered =
    shell.indexOf('to: "/pilot/pickdrop"') !== -1 &&
    shell.indexOf("pickdrop") < shell.indexOf("broadcast") &&
    shell.indexOf("broadcast") < shell.indexOf("leave");
  assert.ok(ordered, "PilotShell does not order tabs Pick & Drop → Broadcast → Leave");
  for (const file of [
    "src/pages/pilot/PilotPickDrop.jsx",
    "src/pages/pilot/PilotBroadcast.jsx",
    "src/pages/pilot/PilotLeave.jsx",
  ]) {
    assertContains(file, [/PilotShell/]);
  }
});

test("pilot pick & drop maps stop API fields (stop_name, pickup_time, drop_time)", () => {
  assertContains("src/pages/pilot/PilotPickDrop.jsx", [
    /s\.stop_name/,
    /s\.pickup_time/,
    /s\.drop_time/,
  ]);
});

test("pilot pages render web layout on wide screens and mobile on phones", () => {
  assertContains("src/components/layout/PilotShell.jsx", [
    /WebLayout/,
    /MobileLayout/,
    /portalLabel="PILOT PORTAL"/,
    /min-width: \$\{breakpoint\}px/,
  ]);
});

test("broadcast history is split vertically 50-50 into Posted and Received columns", () => {
  for (const file of ["src/pages/admin/AdminBroadcast.jsx", "src/pages/teacher/TeacherBroadcast.jsx"]) {
    assertContains(file, [
      /Posted \(Outgoing\)/,
      /Received \(Incoming\)/,
      /minmax\(0, 1fr\) minmax\(0, 1fr\)/,
      /postedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, true\)\)/,
      /receivedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, false\)\)/,
      /senderNameOf\(item\) === myName/,
      /\{editable &&/,
    ]);
  }
});

test("teacher and parent homes render the broadcast feed", () => {
  assertContains("src/components/ui/BroadcastFeed.jsx", [/listitem/, /sender_name/, /broadcast_id/]);
  assertContains("src/pages/parent/ParentHome.jsx", [/BroadcastFeed/, /communicationApi\.listBroadcasts\(\)/]);
});

test("marks API loads class marks and upserts scores", () => {
  assertContains("src/api/marks.js", [
    /classMarks\s*=\s*\(classId, term\)/,
    /\/marks\/class\/\$\{classId\}/,
    /params: \{ term \}/,
    /client\.put\(`\/marks\/\$\{studentId\}\/\$\{subjectId\}`/,
  ]);
});

test("teacher marks page preloads subject names and saved scores before editing", () => {
  assertContains("src/pages/teacher/TeacherMarks.jsx", [
    /academicsApi\.listSubjects\(\)/,
    /marksApi\.classMarks\(selectedClassId, "Term 1"\)/,
    /subjectName\[subId\]/,
    /`\$\{m\.student_id\}:\$\{m\.subject_id\}`/,
    /current != null \? current : "—"/,
    /setScoreInput\(current != null \? String\(current\) : ""\)/,
    /marksApi\.upsertMark\(studentId, subjectId, "Term 1", score\)/,
  ]);
  const page = source("src/pages/teacher/TeacherMarks.jsx");
  assert.doesNotMatch(page, /Subj #\{subId\}\s*<\/th>/);
  assert.match(page, /subjectName\[id\] \|\| `Subj #\$\{id\}`/);
});

test("teacher marks save shows the new score immediately and refreshes server data", () => {
  assertContains("src/pages/teacher/TeacherMarks.jsx", [
    /return \{ \.\.\.map, \.\.\.extraScores \}/,
    /refetchMarks\(\)/,
    /setExtraScores\(\(prev\) => \(\{ \.\.\.prev,/,
  ]);
});

test("teacher student list expands an accordion with details, attendance %, and marks", () => {
  assertContains("src/pages/teacher/TeacherDashboard.jsx", [
    /div className="section-label">Personal Details</,
    /Detail label="Parent"/,
    /Detail label="Parent Phone"/,
    /attendanceApi\.getAttendance\(openId\)/,
    /status === "Present"/,
    /marksApi\.studentMarks\(openId\)/,
    /academicsApi\.listSubjects\(\)/,
    /className="section-label" style=\{\{ marginTop: 14 \}\}>Attendance</,
    /attStats\.percent/,
    /marks\.map\(\(m\) => \(/,
    /subjectName\[m\.subject_id\]/,
    /margin: "0 12px 12px"/,
    /setOpenId\(open \? null : s\.student_id\)/,
  ]);
});

test("teacher timetable shows subject names and times from the weekly grid", () => {
  assertContains("src/pages/teacher/TeacherTimetable.jsx", [
    /timetableApi\.classTimetable\(selectedClassId\)/,
    /academicsApi\.listSubjects\(\)/,
    /academicsApi\.listPeriods\(\)/,
    /getEntryTime\(entry, periodById\)/,
    /subjectNames\.get\(String\(entry\.subject_id\)\)/,
    /entry\.day_of_week === day/,
  ]);
  const page = source("src/pages/teacher/TeacherTimetable.jsx");
  assert.doesNotMatch(page, /Subj #\{e\.subject_id\}/);
});

test("teacher timetable is read-only while admin keeps write controls", () => {
  const teacher = source("src/pages/teacher/TeacherTimetable.jsx");
  for (const forbidden of [
    "timetableApi.createWeekPeriod",
    "timetableApi.updateEntry",
    "timetableApi.deleteEntry",
    "timetableApi.clearOverride",
    "Add period",
    "Save changes",
  ]) {
    assert.ok(!teacher.includes(forbidden), `teacher timetable must not contain ${forbidden}`);
  }
  assert.match(teacher, /timetableApi\.classTimetable\(selectedClassId\)/);
  assertContains("src/pages/admin/AdminTimetable.jsx", [
    /timetableApi\.createWeekPeriod/,
    /timetableApi\.updateEntry/,
    /timetableApi\.deleteEntry/,
    /openEditor\(/,
  ]);
});

test("teacher broadcasts follow the admin flow on a dedicated Broadcast page", () => {
  assertContains("src/components/layout/TeacherShell.jsx", [
    /to: "\/teacher\/broadcast"/,
    /icon: "📣"/,
    /label: "Broadcast"/,
  ]);
  assertContains("src/App.jsx", [/import TeacherBroadcast from/, /path="broadcast" element=\{<TeacherBroadcast \/>\}/]);
  assertContains("src/pages/teacher/TeacherBroadcast.jsx", [
    /TeacherShell/,
    /communicationApi\.createBroadcast/,
    /communicationApi\.listBroadcasts\(\)/,
    /RichTextEditor/,
    /useTeacherContext\(\)/,
    /classIds\.includes/,
    /\(myClasses \|\| \[\]\)\.map/,
    /myClasses\.some/,
  ]);
  const dashboard = source("src/pages/teacher/TeacherDashboard.jsx");
  assert.doesNotMatch(dashboard, /BroadcastFeed|Announcements/);
});

test("pagination caps every list at 25 records per page", () => {
  assertContains("src/components/ui/Pagination.jsx", [
    /export const PAGE_SIZE = 25/,
    /export function usePagination\(items, pageSize = PAGE_SIZE\)/,
    /list\.slice\(start, start \+ pageSize\)/,
    /Showing \{start \+ 1\}–\{end\} of \{total\}/,
    /pageCount <= 1/,
  ]);

  const paginatedPages = [
    "src/pages/admin/AdminStudents.jsx",
    "src/pages/admin/AdminStaff.jsx",
    "src/pages/admin/AdminTeachers.jsx",
    "src/pages/admin/AdminClasses.jsx",
    "src/pages/admin/AdminRoutes.jsx",
    "src/pages/admin/AdminBroadcast.jsx",
    "src/pages/admin/AdminLeave.jsx",
    "src/pages/admin/AdminNotifications.jsx",
    "src/pages/admin/AdminAlbum.jsx",
    "src/pages/admin/AdminWebsite.jsx",
    "src/pages/master/MasterSchools.jsx",
    "src/pages/master/MasterSchoolDetail.jsx",
    "src/pages/teacher/TeacherDashboard.jsx",
    "src/pages/teacher/TeacherAttendance.jsx",
    "src/pages/teacher/TeacherMarks.jsx",
    "src/pages/teacher/TeacherBroadcast.jsx",
    "src/pages/parent/ParentAttendance.jsx",
    "src/pages/parent/ParentMarks.jsx",
    "src/pages/parent/ParentLeave.jsx",
    "src/pages/parent/ParentBarter.jsx",
    "src/pages/pilot/PilotPickDrop.jsx",
    "src/pages/pilot/PilotLeave.jsx",
  ];

  for (const file of paginatedPages) {
    assertContains(file, [
      /usePagination\(/,
      /\.pageItems\.map\(/,
      /<Pagination \{\.\.\./,
    ]);
  }
});

test("teacher marks rounds scores and guards unsaved edits on class switch", () => {
  assertContains("src/pages/teacher/TeacherMarks.jsx", [
    /const score = Math\.round\(raw\)/,
    /Number\.isNaN\(raw\)/,
    /window\.confirm\("You have an unsaved mark\. Discard it and switch class\?"\)/,
    /onSelect=\{changeClass\}/,
  ]);
});

