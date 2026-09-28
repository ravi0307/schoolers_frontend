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
  assertContains("src/api/marks.js", [/\/marks\/student/, /\/marks\/class/, /\/marks\/\$\{studentId\}/]);
  assertContains("src/api/leave.js", [/\/leave/, /approve/, /reject/, /\/leave\/mine/]);
  assertContains("src/api/people.js", [/\/teachers/, /\/staff/, /\/parents/, /\/students/]);
  assertContains("src/api/transport.js", [/\/routes/, /\/vehicles/, /\/pilots/, /\/stops/, /students/, /\/routes\/mine/]);
  assertContains("src/api/schools.js", [/\/schools/, /features/, /status/, /stats/]);
  assertContains("src/api/reports.js", [/\/reports\/school/, /\/reports\/class/]);
  assertContains("src/api/notifications.js", [/\/notifications\/school/, /\/notifications\/\$\{id\}\/read/]);
  assertContains("src/api/barter.js", [/\/barter/]);
  assertContains("src/api/activities.js", [/\/activities/]);
  assertContains("src/api/communication.js", [/\/broadcasts/, /\/media/]);
  assertContains("src/api/website.js", [/\/website\/settings/, /\/website\/pages/, /\/website\/go-live/, /\/public\/sites\/by-name/, /\/public\/sites/]);
  assertContains("src/api/media.js", [/\/media/]);
  assertContains("src/api/uploads.js", [/\/schools\/\$\{schoolId\}\/upload/, /\/documents\/upload/, /School ID is required/]);
  assertContains("src/api/systemHealth.js", [/\/health/, /\/health\/services/]);
  assertContains("src/api/timetable.js", [
    /\/timetable\/class\/\$\{classId\}/,
    /\/timetable\/class\/\$\{classId\}\/period/,
    /\/timetable\/entry\/\$\{entryId\}/,
  ]);
});

test("academics API exposes subject deactivation and reactivation (soft delete)", () => {
  const academics = source("src/api/academics.js");
  assert.match(academics, /deactivateSubject/);
  assert.match(academics, /activateSubject/);
});

test("gallery components render albums and a confirmation dialog for removal", () => {
  const gallery = source("src/components/gallery/GalleryView.jsx");
  assert.match(gallery, /album/);
  assert.match(gallery, /ConfirmDialog/);
  assert.match(gallery, /formatDateTime/);
  assert.match(gallery, /pendingDelete/);
  const primitives = source("src/components/ui/Primitives.jsx");
  assert.match(primitives, /ConfirmDialog/);
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
    parent: ["home", "pickdrop", "attendance", "marks", "gallery", "leave", "barter"],
    teacher: ["dashboard", "attendance", "marks", "timetable", "broadcast", "gallery"],
    admin: ["dashboard", "classes", "timetable", "gallery", "broadcast", "students", "staff", "routes", "leave", "website", "notifications"],
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

test("student records capture photo, identity numbers, and documents in the roster workflow", () => {
  const students = source("src/pages/admin/AdminStudents.jsx");
  assert.match(students, /ImageUpload/);
  assert.match(students, /DocumentUpload/);
  assert.match(students, /aadhaar_number/);
  assert.match(students, /birth_certificate_number/);
  assert.match(students, /photo_url/);
  assert.match(students, /documents/);
  // Uploads need the school id from the authenticated admin — the page must
  // pull the current user from AuthContext (regression: missing useAuth
  // caused a blank screen at /admin/students).
  assert.match(students, /useAuth\(\)/);
  assert.match(students, /user\?\.schoolId/);
  assert.match(source("src/components/ui/DocumentUpload.jsx"), /uploadDocument/);
});

test("role shells and feature pages are imported by the application", () => {
  const app = source("src/App.jsx");
  for (const component of [
    "Login", "PublicWebsite", "ParentHome", "TeacherDashboard", "AdminDashboard",
    "AdminTimetable", "AdminBroadcast", "AdminWebsite", "AdminRoutes",
    "PilotPickDrop", "MasterSchools", "MasterSystemHealth",
    "ParentPickDrop",
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

test("pilot broadcast is a routed tab that sends school-scoped broadcasts", () => {
  assertContains("src/App.jsx", [/import PilotBroadcast from/, /path="broadcast" element=\{<PilotBroadcast \/>\}/]);
  assertContains("src/pages/pilot/PilotBroadcast.jsx", [
    /scope: "school"/,
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

test("parent pick & drop shows each child's live route status, bus, and stops", () => {
  assertContains("src/pages/parent/ParentPickDrop.jsx", [
    /getMyPickdropStatus\(\)/,
    /getMyPickdropStatus/,
    /STATUS_META\[snapshot\.status\]/,
    /pending|picked|dropped/,
    /not_assigned/,
    /transportApi\.listStops\(snapshot\.route_id\)/,
    /setInterval\(refetch, /,
    /Pill tone=/,
    /driver_name/,
    /Pickup .*· Drop/,
  ]);
  const shell = source("src/components/layout/ParentShell.jsx");
  assert.match(shell, /to: "\/parent\/pickdrop"/, "ParentShell lacks the Pick & Drop tab");
  const home = source("src/pages/parent/ParentHome.jsx");
assert.ok(
    home.includes('to: "/parent/pickdrop"') || /navigate\("\/parent\/pickdrop"\)/.test(home),
    "ParentHome lacks the Pick & Drop shortcut"
  );
});

test("parent pick & drop maps every status to a friendly label", () => {
  const page = source("src/pages/parent/ParentPickDrop.jsx");
  for (const [key, label] of [
    ["pending", "Pickup pending"],
    ["picked", "Picked up"],
    ["dropped", "Dropped at school"],
    ["not_assigned", "No transport route"],
  ]) {
    assert.match(page, new RegExp(`${key}: \\{ label`), `missing ${key} entry`);
    assert.match(page, new RegExp(label), `missing label for ${key}: ${label}`);
  }
  assertContains("src/api/transport.js", [/getMyPickdropStatus = \(\) => client\.get\("\/routes\/mine"\)/]);
});

test("parent pick & drop is strictly read-only", () => {
  const page = source("src/pages/parent/ParentPickDrop.jsx");
  assert.doesNotMatch(page, /updatePickupStatus/, "parents must not flip pilots' status");
  assert.doesNotMatch(page, /\.post\(|\.patch\(|\.delete\(/, "parent page must not mutate route data");
  assertContains("src/pages/parent/ParentPickDrop.jsx", [
    /ParentShell/,
    /useParentContext\(\)/,
    /selectedChild/,
    /No stops set for this route\./,
    /has not been assigned a transport route yet\./,
  ]);
});

test("pilot pages render web layout on wide screens and mobile on phones", () => {
  assertContains("src/hooks/useIsWide.js", [/min-width: \$\{breakpoint\}px/]);
  assertContains("src/components/layout/PilotShell.jsx", [
    /WebLayout/,
    /MobileLayout/,
    /portalLabel="PILOT PORTAL"/,
    /useIsWide\(\)/,
  ]);
});

test("parent pages render web layout on wide screens and mobile on phones", () => {
  assertContains("src/components/layout/ParentShell.jsx", [
    /WebLayout/,
    /MobileLayout/,
    /portalLabel="PARENT PORTAL"/,
    /useIsWide\(\)/,
    /TABS/,
  ]);
});

test("parent pages keep per-child selection in every layout", () => {
  const shell = source("src/components/layout/ParentShell.jsx");
  assert.match(shell, /setSelectedChildId\(Number\(e\.target\.value\)\)/);
  assert.match(shell, /selectedChildId/);
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

test("parent home shows the selected child's timetable as an admin-style weekly summary", () => {
  assertContains("src/pages/parent/ParentHome.jsx", [
    /timetableApi\.classTimetable\(selectedChild\.class_id\)/,
    /Announcements & timetable/,
    /TIMETABLE_DAYS as DAYS/,
    /summaryEntryTimes\(entry, periodById\)/,
    /timetable-weekly-summary-card/,
    /timetable-preview-table/,
    /active-cell/,
    /displayTime\(start\)/,
    /toTimeInput/,
    /subjectNames\.get\(String\(entry\.subject_id\)\)/,
    /academicsApi\.listSubjects\(\)/,
    /academicsApi\.listPeriods\(\)/,
    /day === today/,
    /toLocaleDateString\("en-US", \{ weekday: "short" \}\)/,
    /No timetable has been published for this class yet\./,
  ]);
});

test("parent home groups announcements with the timetable and stretches the gallery beside both", () => {
  assertContains("src/components/ui/BroadcastFeed.jsx", [/bare = false/]);
  const home = source("src/pages/parent/ParentHome.jsx");
  assert.match(home, /📢 Announcements/);
  assert.match(home, /limit=\{12\}/);
  assert.match(home, /\bbare\b/);
  // Announcements flow under the quick links, then the timetable joins the same grid.
  assert.ok(
    home.indexOf('title: "Leave Request"') < home.indexOf("📢 Announcements"),
    "announcements must follow the Leave Request card"
  );
  assert.ok(
    home.indexOf("Announcements & timetable") < home.indexOf("📢 Announcements"),
    "announcements sit inside the combined section"
  );
  // Timetable is pinned to the left column; gallery spans both rows on the right,
  // so its height equals Announcements + Timetable.
  assert.match(home, /gridTemplateRows: "auto auto"/);
  assert.match(home, /gridColumn: 1/, "timetable must sit on the left column");
  assert.match(home, /gridColumn: 2, gridRow: "1 \/ 3"/, "gallery must span announcements + timetable rows");
  assert.match(home, /<GalleryCard[\s\S]*<\/div>\s+<\/ParentShell>/, "gallery card closes the timetable row");
});

test("parent home quick access cards show live summary + history for each portal", () => {
  const home = source("src/pages/parent/ParentHome.jsx");
  // Every card converges on real API data for the selected child.
  assert.match(home, /attendanceApi\.getAttendance\(selectedChild\.student_id\)/);
  assert.match(home, /marksApi\.studentMarks\(selectedChild\.student_id\)/);
  assert.match(home, /galleryApi\.listGallery\(\)/);
  assert.match(home, /leaveApi\.listMine\(\)/);
  assert.match(home, /transportApi\.getMyPickdropStatus\(\)/);
  // Barter is no longer on the home page.
  assert.doesNotMatch(home, /barter|Barter/);
  // Summaries derive from fetched records, not static copy.
  assert.match(home, /\.filter\(\(a\) => a\.status === "Present"\)\.length/);
  assert.match(home, /\.filter\(\(m\) => m\.term === terms\[terms\.length - 1\]\)/);
  assert.match(home, /childLeaves\.filter\(\(l\) => l\.status === "Pending"\)\.length/);
  assert.match(home, /pickdrop\.find\(\(r\) => r\.student_id === selectedChild\.student_id\)/);
  // History lists derive from the same records (sorted, capped, scrollable).
  assert.match(home, /\.sort\(\(a, b\) => String\(b\.date\)\.localeCompare\(String\(a\.date\)\)\)/);
  assert.match(home, /\.sort\(\(a, b\) => b\.term\.localeCompare\(a\.term\)\)/);
  assert.match(home, /\.slice\(0, 100\)/);
  assert.match(home, /maxHeight/, "cards need a max-height scroll area");
  assert.match(home, /overflowY: "auto"/, "cards need a vertical scrollbar");
  // Announcements scroll too.
  assert.match(home, /limit=\{12\}/);
  assert.match(home, /childLeaves\.slice\(0, 100\)/);
  assert.match(
    home,
    /label: `\$\{l\.from_date\} → \$\{l\.to_date\}`/,
    "leave history must show request dates"
  );
  assert.match(home, /\.filter\(\(r\) => r\.student_id !== selectedChild\?\.student_id\)/);
  assert.match(home, /PICKDROP_LABEL\[r\.status\]/);
  // Summary + Recent list render together in each card, and the gallery shows ALL media.
  assert.match(home, /function QuickCard/);
  assert.match(home, /function GalleryCard/);
  assert.match(home, /<QuickCard\n            key=\{q\.to\}/);
  assert.match(home, /<GalleryCard/);
  assert.match(home, /items=\{galleryLoading \? \[\] : galleryItems\}/, "gallery card must list every media item");
  assert.doesNotMatch(home, /slice\(0, 4\)/, "gallery must not cap its thumbnails");
  assert.match(home, /Recent/);
  assert.match(home, /onNavigate=\{\(\) => navigate\(q\.to\)\}/);
  assert.match(home, /resolveMediaUrl\(item\.file_url\)/);
  assert.match(home, /media_kind === "video"/);
  assert.match(home, /flexDirection: "column"/, "gallery media list must scroll vertically");
  // Each card keeps navigating to its portal section.
  for (const route of [
    "/parent/pickdrop",
    "/parent/attendance",
    "/parent/marks",
    "/parent/leave",
    "/parent/gallery",
  ]) {
    assert.ok(home.includes(`navigate("${route}")`) || home.includes(`to: "${route}"`), `missing quick links to ${route}`);
  }
});

test("parent leave history reads the parent-scoped /leave/mine endpoint", () => {
  assertContains("src/api/leave.js", [/listMine = \(\) => client\.get\("\/leave\/mine"\)/]);
  assertContains("src/pages/parent/ParentLeave.jsx", [/leaveApi\.listMine\(\)/]);
  assertContains("src/pages/parent/ParentHome.jsx", [/leaveApi\.listMine\(\)/]);
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
    /timetableApi\.classTimetableWeek\(selectedClassId, weekStart\)/,
    /academicsApi\.listSubjects\(\)/,
    /academicsApi\.listPeriods\(\)/,
    /getEntryTime\(entry, periodById\)/,
    /subjectNames\.get\(String\(entry\.subject_id\)\)/,
    /column\.entries\.map/,
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
  assert.match(teacher, /timetableApi\.classTimetableWeek\(selectedClassId, weekStart\)/);
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
    "src/components/gallery/GalleryView.jsx",
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

test("gallery uploads media to the school and renders photos and videos", () => {
  assertContains("src/api/gallery.js", [
    /client\.get\("\/media"\)/,
    /\.post\("\/media"/,
    /\.delete\(`\/media\/\$\{mediaId\}`\)/,
    /form\.append\("file", file\)/,
    /form\.append\("title", title\)/,
  ]);
  assertContains("src/components/gallery/GalleryView.jsx", [
    /resolveMediaUrl/,
    /media_kind === "video"/,
    /<video/,
    /<img/,
    /uploadGalleryMedia/,
    /deleteGalleryMedia/,
    /\.filter\(\(item\) => item\.file_url\)/,
  ]);
});

test("admin, teacher, and parent portals each expose the gallery route", () => {
  const app = source("src/App.jsx");
  for (const page of ["AdminGallery", "TeacherGallery", "ParentGallery"]) {
    assert.match(app, new RegExp(`import ${page} from`), `${page} is not imported`);
  }
  assertContains("src/components/layout/AdminShell.jsx", [
    /to: "\/admin\/gallery"/,
    /label: "Gallery"/,
  ]);
  assertContains("src/components/layout/TeacherShell.jsx", [/to: "\/teacher\/gallery"/]);
  assertContains("src/components/layout/ParentShell.jsx", [/to: "\/parent\/gallery"/]);
  // Teachers upload, admins can also remove, parents only view.
  assertContains("src/pages/admin/AdminGallery.jsx", [/<GalleryView canUpload canDelete \/>/]);
  assertContains("src/pages/teacher/TeacherGallery.jsx", [/<GalleryView canUpload \/>/]);
  assertContains("src/pages/parent/ParentGallery.jsx", [/<GalleryView empty=/]);
});

test("gallery role matrix keeps write controls off the read-only and teacher pages", () => {
  const teacher = source("src/pages/teacher/TeacherGallery.jsx");
  const parent = source("src/pages/parent/ParentGallery.jsx");
  assert.doesNotMatch(teacher, /canDelete/, "teachers must not get the remove button");
  assert.doesNotMatch(parent, /canUpload/, "parents must not get the upload button");
  assert.doesNotMatch(parent, /deleteGalleryMedia/, "parents must not call the delete API");
  assertContains("src/components/gallery/GalleryView.jsx", [
    /canUpload = false,\s*canDelete = false/,
    /empty = "No gallery media yet\."/,
  ]);
});

test("useIsWide consults matchMedia once and subscribes for change events", () => {
  assertContains("src/hooks/useIsWide.js", [
    /breakpoint = 900/,
    /typeof window !== "undefined"/,
    /window\.matchMedia\(\`\(min-width: \$\{breakpoint\}px\)\`\)\.matches/,
    /mq\.addEventListener\("change", handler\)/,
    /setIsWide\(event\.matches\)/,
    /mq\.removeEventListener\("change", handler\)/,
    /\[breakpoint\]/,
  ]);
});

test("gallery upload form accepts several files and gates type, size, and required title", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /const ACCEPT = "image\/png,image\/jpeg,image\/gif,image\/webp,video\/mp4,video\/webm,video\/quicktime"/,
    /const MAX_BYTES = 5 \* 1024 \* 1024/,
    /"Give the media a title\."/,
    /"Choose photos or videos to upload\."/,
    /accept=\{ACCEPT\}/,
    /type="file"/,
    /multiple/,
    /onChange=\{pickFiles\}/,
    /Array\.from\(event\.target\.files \|\| \[\]\)/,
    /\.filter\(\s*\(f\) => ACCEPT\.split\(","\)\.includes\(f\.type\) && f\.size <= MAX_BYTES/,
    /uploadGalleryMedia\(files\[i\], title\.trim\(\)\)/,
    /for \(let i = 0; i < files\.length; i\+\+\)/,
    /disabled=\{saving\}/,
    /Uploading/,
  ]);
});

test("gallery multi-upload saves each selected file in sequence with progress and partial-failure reporting", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /const \[done, setDone\] = useState\(0\)/,
    /setFiles\(valid\)/,
    /fileInputRef\.current\.value = ""/,
    /setFiles\(\[\]\)/,
    /for \(let i = 0; i < files\.length; i\+\+\) \{/,
    /uploadGalleryMedia\(files\[i\], title\.trim\(\)\)/,
    /setDone\(i \+ 1\)/,
    /`Uploading \$\{done\}\/\$\{files\.length\}(\.\.\.|…)`/,
    /`Upload \$\{files\.length\} to Gallery`/,
    /refetch\(\)/,
    /ok === files\.length/,
    /`Uploaded \$\{ok\} photos\/videos to the gallery`/,
    /`\$\{ok\} uploaded, \$\{files\.length - ok\} failed/,
    /`\$\{skipped\} file\$\{skipped === 1 \? "" : "s"\} skipped/,
    /fileListLabel/,
  ]);
});

test("gallery tiles render videos with controls and images lazily, then paginate", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /const items = \(data \|\| \[\]\)\.filter\(\(item\) => item\.file_url\)/,
    /media_kind === "video"/,
    /<video/,
    /controls/,
    /preload="metadata"/,
    /<img/,
    /loading="lazy"/,
    /alt=\{it\.title\}/,
    /resolveMediaUrl\(it\.file_url\)/,
    /key=\{it\.media_id\}/,
    /gallery-tile-meta/,
    /it\.posted_by/,
    /formatDateTime\(it\.created_at\)/,
    /toLocaleString\(\)/,
  ]);
});

test("gallery removal opens a confirmation dialog before deleting", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /pendingDelete/,
    /ConfirmDialog/,
    /canDelete && \(/,
    /gallery-tile-remove/,
    /refetch\(\)/,
  ]);
  assertContains("src/api/gallery.js", [
    /\.delete\(`\/media\/\$\{mediaId\}`\)/,
  ]);
});

test("gallery API sends a multipart form with file, title, and optional class", () => {
  assertContains("src/api/gallery.js", [
    /classId = null/,
    /form\.append\("file", file\)/,
    /form\.append\("title", title\)/,
    /if \(classId\) form\.append\("class_id", classId\)/,
    /"Content-Type": "multipart\/form-data"/,
    /\.then\(\(r\) => r\.data\)/,
  ]);
});

// ---------------------------------------------------------------------------
// Unified staff model: teachers, pilots and staff collapsed into one staff
// table, with driver names derived through pilots -> staff.name.
// ---------------------------------------------------------------------------

test("teachers are still served from the staff-backed teacher endpoints", () => {
  // teacher_id survives only as a response alias of staff_id, so the API keeps
  // /teachers even though the teachers table is gone.
  assertContains("src/api/people.js", [
    /\/teachers/,
    /\/staff/,
  ]);
  const people = source("src/api/people.js");
  assert.doesNotMatch(
    people,
    /\/pilots/,
    "pilots must come from the transport API, not people"
  );
});

test("pilots are listed from the transport pilots endpoint, keyed by pilot_id", () => {
  assertContains("src/api/transport.js", [
    /export const listPilots = \(\) => client\.get\("\/pilots"\)/,
    /export const createPilot = \(data\) => client\.post\("\/pilots", data\)/,
    /export const updatePilot = \(id, data\) => client\.patch\(`\/pilots\/\$\{id\}`, data\)/,
  ]);
  assert.doesNotMatch(
    source("src/api/transport.js"),
    /listPilots = \(\) => client\.get\("\/staff"/,
    "pilot listing must not read the staff table directly"
  );
});

test("admin route form assigns a driver via driver_pilot_id, not a free-text name", () => {
  assertContains("src/pages/admin/AdminRoutes.jsx", [
    /transportApi\.listPilots\(\)/,
    /driver_pilot_id: Number\(routeDriver\)/,
    /transportApi\.createRoute\(\{ name: name\.trim\(\), vehicle, driver_pilot_id: Number\(driver\) \}\)/,
  ]);
  // driver_name is derived server-side, so it must not appear in either route
  // write payload. (The local setRouteSummary display update may reference it.)
  const page = source("src/pages/admin/AdminRoutes.jsx");
  for (const call of ["updateRoute", "createRoute"]) {
    const start = page.indexOf(`transportApi.${call}(`);
    assert.notEqual(start, -1, `AdminRoutes.jsx must call transportApi.${call}`);
    const payload = page.slice(start, start + 220);
    assert.doesNotMatch(
      payload,
      /driver_name\s*:/,
      `${call} must send driver_pilot_id, not a derived driver_name`
    );
  }
});

test("route driver select is fed by the pilot endpoint and keyed on pilot_id", () => {
  assertContains("src/pages/admin/AdminRoutes.jsx", [
    /id: pilot\.pilot_id/,
    /pilot\.is_active !== false/,
    /pilot\.full_name \|\| pilot\.username/,
    /<select value=\{driver\} onChange=\{\(e\) => setDriver\(e\.target\.value\)\} disabled=\{!pilots\}/,
  ]);
});

test("admin route display uses the server-derived driver_name", () => {
  assertContains("src/pages/admin/AdminRoutes.jsx", [
    /Driver: \{routeSummary\.driver_name \|\| "Not assigned"\}/,
    /\{r\.driver_name\}/,
  ]);
  // The edit form reverse-maps the derived name back to an id; that fallback
  // must stay in place or opening the editor would silently drop the driver.
  assertContains("src/pages/admin/AdminRoutes.jsx", [
    /function pilotIdOf\(route, pilotRecords\)/,
    /const name = route\?\.driver_name/,
    /pilotRecords\.find\(\(record\) => record\.value === name\)/,
  ]);
});

test("parent pick & drop shows the derived driver name", () => {
  assertContains("src/pages/parent/ParentPickDrop.jsx", [
    /snapshot\.vehicle\} · Driver \{snapshot\.driver_name\}/,
  ]);
  // Parents are read-only, so they must never post a driver back.
  assert.doesNotMatch(
    source("src/pages/parent/ParentPickDrop.jsx"),
    /driver_pilot_id/,
    "parents must not assign a route driver"
  );
});

test("no frontend module posts a teacher id where the API now expects staff_id", () => {
  // /staff writes take staff_id; teacher_id is a read-only alias.
  const people = source("src/api/people.js");
  assert.doesNotMatch(
    people,
    /createTeacher[\s\S]{0,200}teacher_id\s*:/,
    "teacher creation must not send a teacher_id field"
  );
  assertContains("src/api/people.js", [/\/teachers/]);
});

// ---------------------------------------------------------------------------
// Admin sidebar ordering
//
// The admin nav is grouped by purpose and ordered by dependency inside each
// group, so these lock in the order as a contract rather than a preference.
// A route typo here silently 404s on click, which is how "/admin/commute" got
// caught during the reorder.
// ---------------------------------------------------------------------------

const ADMIN_SHELL = "src/components/layout/AdminShell.jsx";
const ADMIN_NAV = [
  "/admin/dashboard",
  "/admin/routes",
  "/admin/broadcast",
  "/admin/leave",
  "/admin/gallery",
  "/admin/notifications",
  "/admin/staff",
  "/admin/subjects",
  "/admin/classes",
  "/admin/students",
  "/admin/timetable",
  "/admin/holidays",
  "/admin/website",
];
// "Set up" is a real sequence: each entry feeds the one below it.
const SET_UP_SEQUENCE = [
  "/admin/staff",
  "/admin/subjects",
  "/admin/classes",
  "/admin/students",
  "/admin/timetable",
  "/admin/holidays",
];
// The other portals keep a flat nav, so they must stay group-free.
const FLAT_NAV_SHELLS = [
  "src/components/layout/ParentShell.jsx",
  "src/components/layout/TeacherShell.jsx",
  "src/components/layout/PilotShell.jsx",
  "src/components/layout/MasterShell.jsx",
];

function navOrder(file) {
  return [...source(file).matchAll(/to:\s*"([^"]+)"/g)].map((m) => m[1]);
}

test("admin sidebar is ordered by dependency, not alphabetically", () => {
  assert.deepEqual(
    navOrder(ADMIN_SHELL),
    ADMIN_NAV,
    "admin nav order changed; update this test only if the dependency order really changed"
  );
});

test("admin 'Set up' group keeps its prerequisite sequence", () => {
  const labels = [...source(ADMIN_SHELL).matchAll(/to:\s*"([^"]+)".*?label:\s*"([^"]+)"/g)].map(
    ([, to, label]) => ({ to, label })
  );
  const setup = labels
    .filter((i) => SET_UP_SEQUENCE.includes(i.to))
    .map((i) => i.to);
  assert.deepEqual(setup, SET_UP_SEQUENCE, "'Set up' must read Staff -> Timetable -> Holidays");
});

test("every admin sidebar link resolves to a real route", () => {
  const app = source("src/App.jsx");
  const routes = new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]));
  for (const to of navOrder(ADMIN_SHELL)) {
    const leaf = to.split("/").pop();
    assert.ok(routes.has(leaf), `admin nav "${to}" has no matching <Route path="${leaf}">`);
  }
});

test("admin sidebar keeps its four groups in order", () => {
  const groups = [...source(ADMIN_SHELL).matchAll(/group:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(groups)],
    ["Overview", "Day to day", "Set up", "Public"]
  );
});

test("grouped nav support in WebLayout is optional and off by default", () => {
  const layout = source("src/components/layout/WebLayout.jsx");
  assertContains("src/components/layout/WebLayout.jsx", [/sidebar-group/, /item\.group/]);
  // A flat nav must render zero headings rather than empty ones.
  assert.match(
    layout,
    /item\.group\s*&&/,
    "group heading must be conditional so flat portals render nothing"
  );
});

test("parent, teacher, pilot and master sidebars stay flat", () => {
  for (const file of FLAT_NAV_SHELLS) {
    assert.doesNotMatch(source(file), /group:\s*"/, `${file} must not opt into sidebar groups`);
  }
});
