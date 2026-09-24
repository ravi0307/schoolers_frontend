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
  assertContains("src/api/uploads.js", [/\/schools\/\$\{schoolId\}\/upload/, /\/documents\/upload/, /School ID is required/]);
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
    parent: ["home", "attendance", "marks", "gallery", "leave", "barter"],
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
    /item\.media_kind === "video"/,
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

test("gallery upload form gates file type, size, and required title before sending", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /const ACCEPT = "image\/png,image\/jpeg,image\/gif,image\/webp,video\/mp4,video\/webm,video\/quicktime"/,
    /const MAX_BYTES = 5 \* 1024 \* 1024/,
    /"Choose a JPEG\/PNG\/GIF\/WebP image or an MP4\/WebM\/MOV video\."/,
    /"Files must be 5 MB or smaller\."/,
    /"Give the media a title\."/,
    /"Choose a photo or video to upload\."/,
    /accept=\{ACCEPT\}/,
    /type="file"/,
    /disabled=\{saving\}/,
    /Uploading…/,
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
    /alt=\{item\.title\}/,
    /resolveMediaUrl\(item\.file_url\)/,
    /key=\{item\.media_id\}/,
    /gallery-tile-meta/,
    /item\.posted_by/,
    /formatDate\(item\.created_at\)/,
    /toLocaleDateString\(\)/,
  ]);
});

test("gallery removal asks for confirmation scoped to the item title", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /window\.confirm\(`Remove "\$\{item\.title\}" from the gallery\?`\)/,
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

