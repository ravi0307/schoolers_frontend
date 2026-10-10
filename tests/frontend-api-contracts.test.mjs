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

function tokenColor(styles, name) {
  const value = styles.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  assert.ok(value, `missing hex color token ${name}`);
  return value;
}

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("design tokens meet body-text contrast on light and dark surfaces", () => {
  const styles = source("src/styles/tokens.css");
  const value = (name) => tokenColor(styles, name);
  const lightSurfaces = ["--color-surface", "--color-surface-raised"].map(value);
  const darkSurfaces = ["--color-background", "--color-primary"].map(value);
  for (const surface of lightSurfaces) {
    for (const text of ["--color-text", "--color-text-muted", "--color-danger"]) {
      assert.ok(contrastRatio(value(text), surface) >= 4.5, `${text} lacks AA contrast on ${surface}`);
    }
  }
  for (const surface of darkSurfaces) {
    for (const text of ["--color-text-on-dark", "--color-text-muted-on-dark"]) {
      assert.ok(contrastRatio(value(text), surface) >= 4.5, `${text} lacks AA contrast on ${surface}`);
    }
    assert.ok(contrastRatio(value("--color-focus-on-dark"), surface) >= 3, `dark focus color lacks 3:1 contrast on ${surface}`);
  }
  for (const surface of lightSurfaces) {
    assert.ok(contrastRatio(value("--color-focus"), surface) >= 3, `focus color lacks 3:1 contrast on ${surface}`);
  }
});

test("admin staff, student, and class pages use tokenized responsive CSS modules", () => {
  const pages = [
    ["src/pages/admin/AdminStaff.jsx", "src/pages/admin/AdminStaff.module.css"],
    ["src/pages/admin/AdminStudents.jsx", "src/pages/admin/AdminStudents.module.css"],
    ["src/pages/admin/AdminClasses.jsx", "src/pages/admin/AdminClasses.module.css"],
  ];

  for (const [pagePath, stylesPath] of pages) {
    const page = source(pagePath);
    const styles = source(stylesPath);
    assert.match(page, /import styles from "\.\/Admin(?:Staff|Students|Classes)\.module\.css"/);
    assert.doesNotMatch(page, /style=\{\{/i, `${pagePath} should not use inline style objects`);
    assert.doesNotMatch(page, /#[0-9a-fA-F]{3,8}\b/, `${pagePath} should not hard-code colors`);
    assert.match(styles, /var\(--(?:color|space|font|radius)-/, `${stylesPath} should use design tokens`);
    assert.match(styles, /@media/, `${stylesPath} should include a responsive layout`);
    assert.doesNotMatch(styles, /#[0-9a-fA-F]{3,8}\b|!important/, `${stylesPath} should not reintroduce hard-coded colors or overrides`);
  }
});

test("every frontend API module is wired to its required backend surface", () => {
  assertContains("src/api/auth.js", [
    /\/auth\/login/,
    /\/auth\/me/,
    /\/auth\/forgot-password/,
    /\/auth\/forgot-password\/reset/,
    /\/auth\/change-password/,
    /current_password/,
    /new_password/,
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
  assertContains("src/api/website.js", [/\/website\/builder/, /\/builder\/draft/, /\/builder\/publish/, /\/builder\/assets/, /\/public\/sites\/by-name/, /\/public\/sites/]);
  assertContains("src/api/media.js", [/\/media/]);
  assertContains("src/api/uploads.js", [/\/schools\/\$\{schoolId\}\/upload/, /\/documents\/upload/, /School ID is required/]);
  assertContains("src/api/systemHealth.js", [/\/health/, /\/health\/services/]);
  assertContains("src/api/support.js", [
    /\/support\/tickets/,
    /\/support\/tickets\/\$\{ticketId\}/,
    /\/support\/tickets\/\$\{ticketId\}\/messages/,
    /\/support\/tickets\/\$\{ticketId\}\/status/,
  ]);
  assertContains("src/api/timetable.js", [
    /\/timetable\/class\/\$\{classId\}/,
    /\/timetable\/class\/\$\{classId\}\/period/,
    /\/timetable\/entry\/\$\{entryId\}/,
  ]);
});

test("trip history API paths are relative to the versioned API base URL", () => {
  const pilotTrips = source("src/api/trips.js");
  const transport = source("src/api/transport.js");

  assert.match(pilotTrips, /client\.get\("\/trips\/mine"/);
  assert.match(pilotTrips, /client\.get\(`\/trips\/mine\/\$\{tripId\}`\)/);
  assert.match(transport, /client\.get\("\/trips"/);
  assert.match(transport, /client\.get\(`\/trips\/\$\{tripId\}`\)/);
  assert.doesNotMatch(pilotTrips + transport, /\/api\/v1\/trips/);
});

test("admin and parent trip history are registered in portal navigation and routes", () => {
  assert.match(source("src/components/layout/AdminShell.jsx"), /to: "\/admin\/trips", icon: History, label: "Trip History"/);
  assert.match(source("src/components/layout/ParentShell.jsx"), /to: "\/parent\/trips", icon: History, label: "Trip History"/);
  assert.match(source("src/App.jsx"), /path="trips" element=\{<AdminTripHistory \/>\}/);
  assert.match(source("src/App.jsx"), /path="trips" element=\{<ParentTripHistory \/>\}/);
  assert.match(source("src/api/trips.js"), /getChildTripHistory = \(studentId, params\)/);
});

test("admin and teacher portals use shared outlet layouts", () => {
  const app = source("src/App.jsx");
  assert.match(app, /path="\/admin"/);
  assert.match(app, /<AdminShell \/>/);
  assert.match(app, /path="\/teacher"/);
  assert.match(app, /<TeacherShell \/>/);
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.match(layout, /import \{ NavLink, Outlet,/);
  assert.match(layout, /\{children \?\? <Outlet \/>\}/);
  assert.match(layout, /aria-expanded=\{drawerOpen\}/);
  assert.match(layout, /event\.key === "Escape"/);
  assert.match(layout, /event\.key !== "Tab"/);
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
    parent: ["home", "pickdrop", "attendance", "timetable", "marks", "gallery", "leave", "barter"],
    teacher: ["dashboard", "attendance", "marks", "timetable", "broadcast", "gallery", "report"],
    staff: ["broadcast", "gallery", "report"],
    admin: ["dashboard", "classes", "timetable", "gallery", "broadcast", "students", "staff", "routes", "leave", "website", "build-your-site", "my_website2", "notifications", "support"],
    pilot: ["pickdrop", "broadcast", "leave", "report"],
    master: ["schools", "schools/:schoolId", "system-health", "support"],
  };
  for (const [role, routes] of Object.entries(routeGroups)) {
    const portalRoute = ["teacher", "admin", "staff", "parent"].includes(role)
      ? `path="/${role}"`
      : `path="/${role}/*"`;
    assert.ok(app.includes(portalRoute), `route group /${role} is not registered`);
    for (const route of routes) {
      assert.ok(app.includes(`path="${route}"`), `route /${role}/${route} is not registered`);
    }
  }
});

test("public website is reachable by school slug after builder publish", () => {
  const app = source("src/App.jsx");
  assert.ok(app.includes('path="/website/:schoolName"'), "public website slug route is not registered");
  const website = source("src/api/website.js");
  assert.match(website, /client\.get\(`\/website\/\$\{schoolId\}`\)/);
  assert.match(website, /readLocalWebsiteDraft\(window\.localStorage, schoolId\)/);
  assert.match(website, /catch \(error\) \{[\s\S]*?readLocalWebsiteDraft\(window\.localStorage, schoolId\)/);
  assert.match(website, /if \(!localDraft\) throw error/);
  assert.match(website, /client\.put\("\/website\/builder\/draft", content\)/);
  assert.match(website, /client\.post\("\/website\/builder\/publish"\)/);
  assert.match(website, /form\.append\("file", file\)/);
  assert.match(website, /client\.post\("\/website\/builder\/assets", form\)/);
  assert.match(website, /\/website\/builder\/publish/);
  assert.match(website, /\/public\/sites\/by-name/);
  assert.match(website, /axios\.get\(`\$\{BASE_URL\}\/public\/sites\/\$\{schoolId\}`\)/);
  const publicPage = source("src/pages/PublicWebsite.jsx");
  assert.match(publicPage, /getPublicSiteByName/);
  assert.match(publicPage, /getPublicSite\(/);
  assert.match(publicPage, /nodes=\{site\.nodes\}/);
  assert.match(publicPage, /canvasSize=\{site\.canvas_size\}/);
  assert.doesNotMatch(publicPage, /PublicSiteView/);
});

test("admin website builder saves and publishes the canvas through the API", () => {
  const builder = source("src/pages/admin/AdminWebsiteBuilder.jsx");
  assert.match(builder, /websiteApi\.getBuilderState\(user\?\.schoolId\)/);
  assert.match(builder, /websiteApi\.saveBuilderDraft\(content\)/);
  assert.match(builder, /websiteApi\.publishBuilderSite\(\)/);
  assert.match(builder, /const draft = await websiteApi\.saveBuilderDraft\(content\);[\s\S]*?const site = await websiteApi\.publishBuilderSite\(\)/);
  assert.match(builder, /Publish website/);
  assert.match(builder, /getPublicSite|publicSitePath/);
  assert.doesNotMatch(builder, /writeWebsiteBuilderDraft\(window\.localStorage/);
  assert.match(builder, /school_name: user\?\.schoolName/);
  assert.match(builder, /canvas_size: canvasSize/);
  assert.match(builder, /pending_testimonials: pendingTestimonials/);
  assert.match(builder, /apiErrorMessage\(error\)/);
  assert.match(builder, /disabled=\{publishing \|\| !savedDraft \|\| dirty \|\| Boolean\(previewDraft\)\}/);
  assert.match(builder, /setPreviewDraft\(null\);\s*setShowPreview\(true\)/);
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
    "AdminTimetable", "AdminBroadcast", "AdminRoutes",
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
  assert.ok(
    source("src/pages/pilot/PilotPickDrop.jsx").includes(
      "s.student_name || `Student #${s.student_id}`"
    ),
    "pilot assigned-route rows should show the student name when available",
  );
});

test("parent pick & drop shows each child's live route status, bus, and stops", () => {
  assertContains("src/pages/parent/ParentPickDrop.jsx", [
    /getMyPickdropStatus\(\)/,
    /getMyPickdropStatus/,
    /STATUS_META\[snapshot\.status\]/,
    /pending|picked|dropped/,
    /not_assigned/,
    // The stop schedule arrives on the snapshot itself, so the page must not
    // re-fetch it per route — that was the source of the missing where/when.
    /snapshot\?\.stops \|\| NO_STOPS/,
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
    /useParentContext\(\)/,
    /selectedChild/,
    /No stops set for this route\./,
    /has not been assigned a transport route yet\./,
  ]);
});

test("pilot and parent shells use the shared drawer-based web layout on every screen", () => {
  assertContains("src/hooks/useIsWide.js", [/min-width: \$\{breakpoint\}px/]);
  for (const file of ["src/components/layout/PilotShell.jsx", "src/components/layout/ParentShell.jsx"]) {
    const shell = source(file);
    assert.match(shell, /<WebLayout navItems=\{TABS\} portalLabel="(?:PILOT|PARENT) PORTAL">/);
    assert.doesNotMatch(shell, /MobileLayout/);
    assert.doesNotMatch(shell, /useIsWide\(\)/);
  }
  assertContains("src/components/layout/PilotShell.jsx", [/WebLayout/, /portalLabel="PILOT PORTAL"/]);
  assertContains("src/components/layout/ParentShell.jsx", [/WebLayout/, /portalLabel="PARENT PORTAL"/, /TABS/]);
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
      /postedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, true\)\)/,
      /receivedPager\.pageItems\.map\(\(item\) => renderBroadcastRow\(item, false\)\)/,
      // Ownership is decided by the author's user id in the shared helper, not
      // by comparing the sender's display name against the signed-in user's.
      /splitBroadcastsByAuthor\(filteredBroadcasts, user\)/,
      /\{(?:editable|canManage) &&/,
    ]);
    // The name comparison that put every message in Received is gone, and with
    // it the local sender-name helper it needed.
    const text = source(file);
    assert.doesNotMatch(text, /senderNameOf\(item\) === myName/,
      `${file} still decides ownership by display name`);
    assert.doesNotMatch(text, /senderNameForUser/);
  }
  assertContains("src/pages/admin/AdminBroadcast.module.css", [
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    /@media \(max-width: 48rem\)/,
  ]);
  assertContains("src/pages/teacher/TeacherBroadcast.jsx", [
    /minmax\(0, 1fr\) minmax\(0, 1fr\)/,
  ]);
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
    /styles\.timetableCard/,
    /styles\.timetableTable/,
    /styles\.activeCell/,
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

test("parent timetable page shows the selected child's class week", () => {
  assertContains("src/pages/parent/ParentTimetable.jsx", [
    /useParentContext/,
    /selectedChild\?\.class_id/,
    /timetableApi\.classTimetableWeek\(classId, weekStart\)/,
    /mergeWeekColumns\(buildWeekColumns\(weekStart\), week\)/,
    /TimetableWeekHeader/,
    /WeekSelector/,
    /No timetable has been published for this class yet\./,
  ]);
  const shell = source("src/components/layout/ParentShell.jsx");
  assert.match(shell, /to: "\/parent\/timetable"/, "ParentShell lacks the Timetable tab");
});

test("parent home groups announcements with the timetable and stretches the gallery beside both", () => {
  assertContains("src/components/ui/BroadcastFeed.jsx", [/bare = false/]);
  const home = source("src/pages/parent/ParentHome.jsx");
  assert.match(home, /<Megaphone/);
  assert.match(home, /limit=\{12\}/);
  assert.match(home, /\bbare\b/);
  // Announcements flow under the quick links, then the timetable joins the same grid.
  assert.ok(
    home.indexOf('title: "Leave Request"') < home.indexOf("> Announcements"),
    "announcements must follow the Leave Request card"
  );
  assert.ok(
    home.indexOf("Announcements & timetable") < home.indexOf("> Announcements"),
    "announcements sit inside the combined section"
  );
  // Timetable is pinned to the left column; gallery spans both rows on the right,
  // so its height equals Announcements + Timetable.
  const styles = source("src/pages/parent/ParentHome.module.css");
  assert.match(styles, /\.updatesGrid\s*\{[^}]*grid-template-rows:\s*auto auto/s);
  assert.match(styles, /\.timetable\s*\{[^}]*grid-column:\s*1/s, "timetable must sit on the left column");
  assert.match(styles, /\.timetableTable\s*\{[^}]*min-width:/s, "weekly timetable needs its own scrollable table sizing");
  assert.match(styles, /\.gallery\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ 3/s, "gallery must span announcements + timetable rows");
  assert.match(home, /<GalleryCard[\s\S]*<\/div>\s+<\/>\s+\);/, "gallery card closes the timetable row");
});

test("parent home quick access cards show live summary + history for each portal", () => {
  const home = source("src/pages/parent/ParentHome.jsx");
  const styles = source("src/pages/parent/ParentHome.module.css");
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
  assert.match(styles, /\.previewList,\s*\.historyList\s*\{[^}]*max-height:/s, "cards need a max-height scroll area");
  assert.match(styles, /\.previewList,\s*\.historyList\s*\{[^}]*overflow-y:\s*auto/s, "cards need a vertical scrollbar");
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
  assert.match(styles, /\.previewList,\s*\.historyList\s*\{[^}]*flex-direction:\s*column/s, "gallery media list must stack vertically");
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
    /icon:\s*Megaphone/,
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
    /kind=\{it\.media_kind\}/,
    /uploadGalleryMedia/,
    /deleteGalleryMedia/,
  ]);
  assertContains("src/components/gallery/GalleryMedia.jsx", [/kind === "video"/, /<video/, /<img/]);
  // Fileless media are dropped by the helper that builds the cards.
  assert.match(source("src/utils/galleryAlbums.js"), /if \(!item\?\.file_url\) return/);
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
  assertContains("src/pages/admin/AdminGallery.jsx", [/<GalleryView canUpload canManage \/>/]);
  assertContains("src/pages/teacher/TeacherGallery.jsx", [/<GalleryView canUpload canManage \/>/]);
  assertContains("src/pages/parent/ParentGallery.jsx", [/<GalleryView empty=/]);
});

test("gallery role matrix keeps write controls off the read-only and teacher pages", () => {
  const teacher = source("src/pages/teacher/TeacherGallery.jsx");
  const parent = source("src/pages/parent/ParentGallery.jsx");
  assert.doesNotMatch(teacher, /canDelete/, "teachers must not get the remove button");
  assert.doesNotMatch(parent, /canUpload/, "parents must not get the upload button");
  assert.doesNotMatch(parent, /deleteGalleryMedia/, "parents must not call the delete API");
  assertContains("src/components/gallery/GalleryView.jsx", [
    /canUpload = false,\s*canManage = false/,
    /empty = "No gallery media yet\."/,
    /<GalleryMedia/,
    /className="album-item-meta"/,
  ]);
  assertContains("src/components/gallery/GalleryMedia.jsx", [
    /setFailed\(true\)/,
    /Preview unavailable/,
    /kind === "video"/,
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

test("gallery drops fileless media, then renders thumbnails that open in the viewer", () => {
  // Albums and the file_url filter moved into a tested helper; the grid is now
  // a set of thumbnails, and playback/enlargement happens in the viewer.
  assertContains("src/utils/galleryAlbums.js", [
    /if \(!item\?\.file_url\) return/,
    /groups\.set\(key, \[\]\)/,
    /groupItems\.length >= 2/,
  ]);
  assertContains("src/components/gallery/GalleryView.jsx", [
    /buildGalleryCards\(data\)/,
    /kind=\{it\.media_kind\}/,
    /resolveMediaUrl\(it\.file_url\)/,
    /key=\{it\.media_id\}/,
    /gallery-tile-meta/,
    /it\.posted_by/,
    /formatDateTime\(it\.created_at\)/,
    /toLocaleString\(\)/,
  ]);
  assertContains("src/components/gallery/GalleryMedia.jsx", [
    /kind === "video"/,
    /<video/,
    /preload="metadata"/,
    /<img/,
    /loading="lazy"/,
    /alt=\{alt \|\| "Gallery media"\}/,
    /Preview unavailable/,
  ]);
  // controls belong to the viewer now, so a tile stays a clean click target.
  assertContains("src/components/gallery/MediaLightbox.jsx", [
    /<video/,
    /controls/,
  ]);
});

test("gallery removal opens a confirmation dialog before deleting", () => {
  assertContains("src/components/gallery/GalleryView.jsx", [
    /pendingDelete/,
    /ConfirmDialog/,
    /canManageItem\(it\)/,
    /canManageCard\(card,\s*user\)/,
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
  "/admin/trips",
  "/admin/broadcast",
  "/admin/leave",
  "/admin/gallery",
  "/admin/notifications",
  "/admin/support",
  "/admin/staff",
  "/admin/subjects",
  "/admin/classes",
  "/admin/students",
  "/admin/timetable",
  "/admin/holidays",
  "/admin/accounts",
  "/admin/reports",
  "/admin/build-your-site",
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
  "src/components/layout/StaffShell.jsx",
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

test("admin setup links keep their prerequisite sequence", () => {
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

test("admin sidebar keeps its dependency order without non-clickable group headings", () => {
  const shell = source(ADMIN_SHELL);
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.deepEqual(navOrder(ADMIN_SHELL), ADMIN_NAV);
  assert.doesNotMatch(shell, /group:\s*"/);
  assert.match(layout, /navItems\.filter\(\(item\) => item\.to\)\.map/);
  assert.doesNotMatch(layout, /sidebar-group|item\.group/);
  assert.doesNotMatch(source("src/styles/layout.css"), /sidebar-group/);
});

test("parent, teacher, pilot and master sidebars stay flat", () => {
  for (const file of FLAT_NAV_SHELLS) {
    assert.doesNotMatch(source(file), /group:\s*"/, `${file} must not opt into sidebar groups`);
  }
});

// ---------------------------------------------------------------------------
// Parent pick & drop: stop name and time
//
// ParentPickDropRead used to carry no stop name or time, so a parent saw
// "Route 1 / Picked up" and could not tell where the bus stops or when. The
// backend now returns the route's stop schedule on each snapshot and the
// parent portal must actually surface it.
// ---------------------------------------------------------------------------

test("parent home pairs pick & drop status with a stop and time", () => {
  const home = source("src/pages/parent/ParentHome.jsx");
  // The card summary must include the stop, not just the status label.
  assert.match(home, /pickdropStopText/);
  assert.match(
    home,
    /\$\{stop\.stop_name\} · \$\{when\}/,
    "the pick & drop summary must name the stop and its time"
  );
  assert.match(home, /stop\.pickup_time/);
  assert.match(
    home,
    /PICKDROP_LABEL\[pickdropRow\.status\][\s\S]{0,200}pickdropStopText\(pickdropRow\)/,
    "status and stop must be shown together on the quick card"
  );
});

test("parent home and pick & drop read stops off the snapshot", () => {
  for (const file of ["src/pages/parent/ParentHome.jsx", "src/pages/parent/ParentPickDrop.jsx"]) {
    assert.match(source(file), /\.stops\b/, `${file} must read the snapshot stop list`);
  }
});

test("parent pick & drop no longer re-fetches stops per route", () => {
  // One payload, one request. listStops stays available for admin screens.
  const page = source("src/pages/parent/ParentPickDrop.jsx");
  assert.doesNotMatch(
    page,
    /transportApi\s*\.\s*listStops/,
    "the parent page must not issue a second request for stops"
  );
});

// ---------------------------------------------------------------------------
// School branding header
//
// Every role of a school (admin, teacher, parent, pilot) needs the school's
// name and logo pinned at the top of the sidebar, on every page. The name and
// logo arrive on /auth/me because a parent or teacher cannot read the school
// endpoints at all — both are 403 for those roles.
// ---------------------------------------------------------------------------

test("the sidebar header shows the caller's school name and logo", () => {
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.match(layout, /user\?\.schoolName/, "the header must read the school name off the session");
  assert.match(layout, /className="school-name"/, "the school name must be rendered");
  assert.match(layout, /className="school-logo"/, "the school logo must be rendered");
});

test("the school logo goes through resolveMediaUrl", () => {
  // logo_url is stored server-relative (/api/v1/schools/uploads/...). The dev
  // server has no /api proxy, so an unresolved path makes the <img> receive
  // the SPA's index.html and silently fail to decode -- which is exactly what
  // happened before this was caught in the browser.
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.match(layout, /import \{ resolveMediaUrl \} from "\.\.\/\.\.\/api\/client"/);
  assert.match(layout, /resolveMediaUrl\(user\?\.schoolLogoUrl\)/);
});

test("a missing or broken logo falls back to a monogram", () => {
  const layout = source("src/components/layout/WebLayout.jsx");
  // Both schools have logo_url = NULL today, so the monogram is the normal
  // path, not an edge case.
  assert.match(layout, /className="school-monogram"/);
  assert.match(layout, /onError=/, "a 404 or stale file must not leave a broken image icon");
  // A school name is still shown when there is no logo at all.
  assert.match(layout, /hidden=\{!!schoolLogo && !schoolLogoFailed\}/);
});

test("a user with no school keeps the product brand", () => {
  // Master has no school of its own; /auth/me returns nulls for it.
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.match(layout, /\{schoolName \? \(/);
  assert.match(layout, /<b>Schoolers<\/b>/, "master must fall back to the product brand");
});

test("the header is pinned so it survives a long nav", () => {
  const css = source("src/components/layout/WebLayout.module.css");
  const head = /\.shell \.sidebar \.sidebarHead\s*\{([^}]*)\}/.exec(css);
  assert.ok(head, "there is no .sidebar-head rule");
  assert.match(head[1], /position:\s*sticky/, "the school header must be sticky");
  assert.match(
    css,
    /@media \(max-width: 1023px\)[\s\S]*?\.sidebar\s*\{[^}]*overflow-y:\s*auto/
  );
  assert.match(head[1], /background:\s*var\(--color-primary\)/);
  assert.match(head[1], /z-index:\s*2/);
  assert.match(head[1], /top:\s*calc\(-1 \* var\(--space-6\)\)/);
});

test("all five role shells share the branding header", () => {
  // The requirement is admin, staff and parents -- implemented once in
  // WebLayout rather than per shell, so a new role cannot miss it.
  for (const shell of [
    "src/components/layout/AdminShell.jsx",
    "src/components/layout/MasterShell.jsx",
    "src/components/layout/ParentShell.jsx",
    "src/components/layout/PilotShell.jsx",
    "src/components/layout/TeacherShell.jsx",
  ]) {
    assert.match(source(shell), /WebLayout/, `${shell} does not render through WebLayout`);
  }
});

test("the session hydrates the school name and logo from /auth/me", () => {
  const auth = source("src/context/AuthContext.jsx");
  assert.match(auth, /authApi\.me\(\)/, "the session must ask /auth/me for the branding");
  assert.match(auth, /schoolName:\s*me\.school_name/);
  assert.match(auth, /schoolLogoUrl:\s*me\.school_logo_url/);
  // A failure here must not sign the user out: the cached session still
  // works, the header just falls back to the portal label.
  assert.match(auth, /catch\s*\{[^}]*keep the cached session/s);
  // It runs once per session, not on every render.
  assert.match(auth, /\[user\?\.userId\]/);
});

test("the branding does not add a request per page", () => {
  // One extra call per session, not one per route. WebLayout must read from
  // the already-hydrated context rather than fetching the school itself.
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.doesNotMatch(layout, /useApi|schoolsApi|getSchool|listSchools/);
});

/* ---- Admin accounts ---- */

test("the accounts API module matches the backend accounts surface", () => {
  assertContains("src/api/accounts.js", [
    /client\.get\("\/accounts\/salaries"/,
    /client\.get\("\/accounts\/fees"/,
    /client\.post\("\/accounts\/salaries"/,
    /client\.post\("\/accounts\/fees"/,
    /client\.get\("\/accounts\/fees\/plans"/,
    /client\.post\("\/accounts\/fees\/deposit\/preview"/,
    /client\.post\("\/accounts\/fees\/deposit"/,
    /client\.delete\(`\/accounts\/salaries\/\$\{staffId\}\/\$\{month\}`/,
    /client\.delete\(`\/accounts\/fees\/\$\{studentId\}\/\$\{month\}`/,
  ]);
});

test("the month window comes from the API rather than being recomputed per client", () => {
  // One definition of "the months this grid shows", owned by the server, so the
  // columns and the totals can never disagree. The page sends an anchor and
  // renders whatever months come back.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.doesNotMatch(page, /monthWindowValues\(/, "the page must not build its own window");
  assert.match(page, /const SALARY_MONTHS = 2/);
  assert.match(page, /const FEE_MONTHS = 2/);
  assert.match(page, /salarySheet\(SALARY_MONTHS, salaryAnchor\)/);
  assert.match(page, /feeSheet\(FEE_MONTHS, feeAnchor\)/);
  assert.match(page, /const months = sheet\?\.months \|\| \[\]/, "the grid must render the months the API returned");
});

test("one keystroke sends one write, not two", () => {
  // Pressing Enter in a cell fires both the key handler and the blur that
  // follows it, so `commit` runs twice for a single edit. Left unguarded the
  // second call races the first: for a month with no row yet both try to
  // INSERT, one loses to the unique constraint, and the admin is shown a 409
  // for a payment that was recorded perfectly well. The guard is a ref, not
  // state, because both calls land inside the same render.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.equal((page.match(/const saving = useRef\(false\)/g) || []).length, 2, "both cells must guard");
  assert.equal((page.match(/if \(saving\.current\) return;/g) || []).length, 2, "both commits must check it");
  assert.equal((page.match(/saving\.current = true;/g) || []).length, 2, "both commits must claim it");
  assert.equal((page.match(/saving\.current = false;/g) || []).length, 2, "both must release it in a finally, so a failed save can be retried");
});

test("an unpaid month is shown as a dash, never as a zero", () => {
  // "Nothing recorded" and "recorded as zero" are different facts, and an
  // admin chasing unpaid money needs to tell them apart.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /value === null \|\| value === undefined/);
  // With the totals row gone, nothing may collapse a missing month into a 0.
  // A per-month sum would render "0" for a month nobody was paid in, which
  // reads as "we paid everyone nothing" rather than "we paid nobody".
  assert.doesNotMatch(page, /<tfoot>/, "the grid must not sum months into a totals row");
  assert.doesNotMatch(page, /rows\.reduce\(/, "a row total would reintroduce the missing-as-zero sum");
});

test("a recorded amount must be a non-negative number before it is sent", () => {
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /Number\.isFinite\(num\)/);
  assert.match(page, /num < 0/);
});

test("Accounts and Reporting remain clickable admin navigation links", () => {
  const shell = source("src/components/layout/AdminShell.jsx");
  const accounts = shell.indexOf('to: "/admin/accounts"');
  const reports = shell.indexOf('to: "/admin/reports"');
  assert.ok(accounts !== -1 && reports !== -1);
  assert.ok(accounts < reports, "Accounts must stay before Reporting");
  assert.doesNotMatch(shell, /group:\s*"/);
});

test("both new admin pages are routed and reachable", () => {
  assertContains("src/App.jsx", [
    /import AdminAccounts from "\.\/pages\/admin\/AdminAccounts"/,
    /import AdminReports from "\.\/pages\/admin\/AdminReports"/,
    /<Route path="accounts" element=\{<AdminAccounts \/>\}/,
    /<Route path="reports" element=\{<AdminReports \/>\}/,
  ]);
  // Both are admin-only pages; they must render through AdminShell so they
  // cannot lose the pinned school header.
  for (const page of ["src/pages/admin/AdminAccounts.jsx", "src/pages/admin/AdminReports.jsx"]) {
    assert.match(source(page), /AdminShell/, `${page} must render through AdminShell`);
  }
});

test("a paid amount shows the date it was paid, formatted not raw", () => {
  // The API returns paid_on next to every amount; the grid must show the
  // "when" beside "how much" on mobile, with the full date available through
  // the tooltip. Neither renders the raw ISO date.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /formatDay/);
  assert.match(page, /paidOn=\{row\.paid_on\?\.\[m\]\}/);
  assert.match(page, /formatDay\(paidOn\)/);
  assert.doesNotMatch(page, /\{paidOn\}/, "the ISO date must not reach the DOM raw");
  // The figure is the rightmost thing in the cell, so the paid date below it
  // shares its right edge (ledger alignment). If the hover buttons came after
  // it, the invisible-buttons slot would push the number off the date's edge.
  const actionsAt = page.indexOf("className={styles.cellActions}");
  const valueAt = page.indexOf("className={styles.amountValue}");
  assert.ok(actionsAt !== -1 && valueAt !== -1, "the paid cell must have actions and a value");
  assert.ok(actionsAt < valueAt, "actions must sit before the figure, keeping the right edge aligned");
  assertContains("src/pages/admin/AdminAccounts.module.css", [
    /\.paid\s*\{[^}]*color:\s*var\(--surface-muted-text\)/s,
    /\.amountValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
  ]);
});

test("the accounts grid uses a fixed layout without forcing desktop horizontal scrolling", () => {
  assertContains("src/pages/admin/AdminAccounts.module.css", [
    /\.sheetCard \.table\s*\{[^}]*table-layout:\s*fixed/s,
    /\.nameColumn\s*\{[^}]*width:\s*20%/s,
    /\.amountColumn\s*\{[^}]*width:\s*12%/s,
    /\.salaryTable \.remarkColumn\s*\{[^}]*width:\s*28%/s,
    /\.feeTable \.remarkColumn\s*\{[^}]*width:\s*22%/s,
  ]);
});

test("the accounts page asks for an explicit window, not an unbounded range", () => {
  const page = source("src/pages/admin/AdminAccounts.jsx");
  // The grid renders whatever months the API returns, so the window has to be
  // requested explicitly. Without the argument the API default would apply,
  // which happens to be 6 today but is not a guarantee the page makes.
  // Salaries ask for two months and fees for six, so each read has to name the
  // width it wants rather than inherit the server default.
  const reads = [...page.matchAll(/accountsApi\.(salarySheet|feeSheet)\(([^)]*)\)/g)];
  assert.ok(reads.length > 0, "the page must read the accounts API");
  for (const [, fn, arg] of reads) {
    assert.match(arg, /MONTHS/, `${fn} must name its window width, got "${arg}"`);
  }
  assert.match(page, /const SALARY_MONTHS = 2/);
  assert.match(page, /const FEE_MONTHS = 2/);
  // The write and delete calls take no window: they address one person and
  // one month, so requiring a range of them would be wrong.
  assert.match(page, /accountsApi\.recordSalary\(\{ staff_id: id, month, amount, note \}\)/);
});

test("each selector now uses dropdowns rather than a range label", () => {
  // The range label has been replaced by two dropdowns (month + year) that let
  // the admin jump to any month directly. The width of the window is still
  // honoured by the grid, but the label that used to show "Apr 2026 – Sep 2026"
  // is no longer rendered above the selector.
  assert.match(
    source("src/components/ui/MonthSelector.jsx"),
    /<MonthYearPicker/
  );
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /anchor=\{salaryAnchor\}\s+onChange=\{setSalaryAnchor\}\s+busy=\{busy\}\s+label="salary period"/);
  assert.match(page, /anchor=\{feeAnchor\}\s+onChange=\{setFeeAnchor\}\s+busy=\{busy\}\s+label="fee period"/);
});

test("each grid pairs every month with an editable remark", () => {
  // A figure with no reason beside it is not actionable, and a remark that can
  // only be written at the moment of payment cannot be corrected later. Both
  // grids give each of their two months one: last month's is still in view to
  // amend, this month's is open to write. Fees carry the same column as
  // salaries, because a family that pays quarterly needs the same sentence
  // beside the same figure.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /<RemarkCell/);
  // Both grids ask for remarks, each with its own save path. Counted at the two
  // call sites rather than in the file, because the shared table reads the prop
  // several times itself.
  assert.match(page, /title="Staff salaries"[\s\S]*?withRemarks/, "the staff grid pairs each month with a remark");
  assert.match(page, /title="Student fees"[\s\S]*?withRemarks/, "the student grid pairs each month with a remark");
  assert.match(page, /onSaveNote=\{\(id, m, amount, note\) => saveNote\("salary", id, m, amount, note\)\}/);
  assert.match(page, /onSaveNote=\{\(id, m, amount, note\) => saveNote\("fee", id, m, amount, note\)\}/);
  // The remark shown is the one the server stored for that month.
  assert.match(page, /note=\{row\.notes\?\.\[m\]\}/);
  // And it is editable, not a read-only label.
  assert.match(page, /onClick=\{begin\}/);
  assert.match(page, /Add a remark/);
});

test("editing a figure keeps the remark standing beside it", () => {
  // The remark lives on the same row as the amount, so an amount edit that
  // omits it reads as "no remark" and silently deletes the sentence
  // explaining the figure. The amount save therefore carries the remark the
  // grid is showing, for both grids.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(
    page,
    /onSave=\{\(amount\) => onSave\(rowId, m, amount, row\.notes\?\.\[m\] \?\? null\)\}/,
    "an amount edit must re-send the remark already on the row",
  );
  assert.match(page, /onSave=\{\(id, m, amount, note\) => save\("fee", id, m, amount, note\)\}/);
  assert.match(page, /onSave=\{\(id, m, amount, note\) => save\("salary", id, m, amount, note\)\}/);
  assert.match(page, /async function save\(kind, id, month, amount, note = null\)/);
  assert.match(page, /await accountsApi\.recordFee\(\{ student_id: id, month, amount, note \}\)/);
});

test("a remark is saved onto the payment it belongs to, without restamping it", () => {
  // The remark is stored on the payment, so saving one re-sends the amount
  // already on the server. It must come from the row the admin is looking at,
  // never from the cell being edited, or a stale read would overwrite a
  // correction. And the paid date is left out: a remark edit is not a second
  // payment and must not rewrite the day the money actually moved.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /onSave=\{\(next\) => onSaveNote\(rowId, m, row\.amounts\?\.\[m\], next\)\}/);
  assert.match(page, /accountsApi\.recordSalary\(\{ staff_id: id, month, amount, note \}\)/);
  assert.doesNotMatch(page, /recordSalary\(\{ staff_id: id, month, amount, note, paid_on/, "an edit must not resend a paid date");
  assert.doesNotMatch(page, /recordFee\(\{ student_id: id, month, amount, note, paid_on/, "an edit must not resend a paid date");
});

test("an empty remark is a clearing, and an unpaid month has nothing to remark on", () => {
  // Two ways a remark column could quietly lie. Blanking the box is a real
  // answer ("nothing to add"), so it is saved rather than discarded; and a
  // month with no payment has no remark cell to fill in, because there is no
  // figure to explain.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /onSave\(trimmed \|\| null\)/);
  assert.match(page, /if \(trimmed === \(note \|\| ""\)\.trim\(\)\)/, "an unchanged remark must not issue a write");
  assert.match(page, /if \(value === null \|\| value === undefined\)/, "an unpaid month shows a dash, not an editor");
  // A write on a failed save must leave the editor open so the text is not lost.
  assert.match(page, /const ok = await onSave\(trimmed \|\| null\);\s*if \(ok\) setEditing\(false\);/);
});

test("both accounts sheets are on one page, with no tab to navigate", () => {
  // A salary grid and a fee grid are one decision for the admin, so both
  // render together rather than behind a tab.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /Staff salaries/);
  assert.match(page, /Student fees/);
  assert.doesNotMatch(page, /setTab\(|activeTab/);
});

test("every rendered amount passes through the thousands formatter", () => {
  // A raw amount would print 10000 while a total prints 10,000, and an
  // accounts page that disagrees with itself about number formatting is one
  // nobody trusts.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /function money\(value\)/);
  assert.match(page, /new Intl\.NumberFormat\(undefined/);
  assert.match(page, /numberFormatter\.format\(amount\)/);
  // A raw amount may be handed to a cell as a prop, but must never be printed
  // directly: the only two places a number reaches the DOM are the cell and
  // the total row, and both wrap it in money(). An amount inside a handler
  // (onSaveNote(id, m, row.amounts?.[m], next)) is a write, not a label.
  const printed = [...page.matchAll(/\{([^{}]*(?:amounts|total_paid|total_collected)[^{}]*)\}/g)]
    .map((m) => m[1].trim())
    .filter((expr) => expr.includes("amounts") && !expr.startsWith("money("));
  for (const expr of printed) {
    // row.amounts?.[m] is only ever passed as a prop, never as text.
    const isProp = expr === "row.amounts?.[m]" || expr.includes("=>");
    assert.ok(isProp, `amount printed without money(): {${expr}}`);
  }
  // The two aggregates the API returns are formatted, not printed raw.
  assert.match(page, /money\(salarySheet\?\.total_paid\)/);
  assert.match(page, /money\(feeSheet\?\.total_collected\)/);
});

test("the accounts grid has no totals row, and the per-month cards carry the totals", () => {
  // The sum of a column of mostly-missing cells is not information an admin
  // can act on, and it competed with the person rows for vertical space. The
  // school-wide figures live in the summary cards above each grid instead.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.doesNotMatch(page, /<tfoot>/);
  assert.doesNotMatch(page, /acct-total/);
  assert.match(page, /money\(salarySheet\?\.total_paid\)/, "the salary total still has a home");
  assert.match(page, /money\(feeSheet\?\.total_collected\)/, "the fee total still has a home");
});

test("each accounts grid can search and sort its own people", () => {
  // Sorting and filtering are per-grid state, so a search for a staff member
  // must not filter the student list below it.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /const \[query, setQuery\] = useState\(""\)/);
  assert.match(page, /const \[sort, setSort\] = useState\("name"\)/);
  assert.match(page, /filterAndSortRows\(\{ rows: allRows, months, query, sort, nameOf, secondaryOf \}\)/);
  // SheetTable is rendered once per grid, and each call supplies its own label,
  // so the two cannot share one search box.
  assert.match(page, /label="staff"/);
  assert.match(page, /label="students"/);
  assert.match(page, /No \{singular\} match/);
});

test("the accounts grids scroll vertically with a sticky header", () => {
  // A school of hundreds of staff or students would otherwise bury the person
  // the admin is looking for under a full-page table.
  const utils = source("src/utils/accountsTable.js");
  assert.match(utils, /export const VISIBLE_ROWS = 8/);
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /className=\{styles\.tableScroll\}/);
  assert.doesNotMatch(page, /scrollHintText\(rows\.length\)/);
  assert.match(page, /peopleCountLabel\(\{ matched: rows\.length/);
  assertContains("src/pages/admin/AdminAccounts.module.css", [
    /\.tableScroll\s*\{[^}]*overflow:\s*auto/s,
    /\.sheetCard \.table thead th\s*\{[^}]*position:\s*sticky/s,
    /--account-table-min-height:\s*15rem/,
  ]);
});

test("the scroll box has a responsive tokenized height without inline styles", () => {
  // Keep the viewport bounded without setting layout styles imperatively.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  const module = source("src/pages/admin/AdminAccounts.module.css");
  assert.doesNotMatch(page, /style\.[a-zA-Z]+\s*=/);
  assert.match(module, /max-height:\s*max\(var\(--account-table-min-height\), calc\(\(100dvh \+ var\(--account-table-viewport-overflow\)\) \/ 2\)\)/);
  // And a narrowed grid must not stay scrolled past its own new end.
  assert.match(page, /box\.scrollTop = 0/);
});

test("the count note only does arithmetic once the grid is narrowed", () => {
  // "16 of 16 staff" on load reads as though a filter is already applied.
  const utils = source("src/utils/accountsTable.js");
  assert.match(utils, /export function peopleCountLabel/);
  // Joined once, so the note never reads "1 of 16  students".
  assert.match(utils, /const count = matched === total \? String\(total\) : `\$\{matched\} of \$\{total\}`/);
  assert.doesNotMatch(utils, /\$\{total\} `\}/, "no trailing space smuggled into the branch");
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /peopleCountLabel\(\{ matched: rows\.length, total: allRows\.length, singular, plural: label \}\)/);
  // Both grids pass a real singular, rather than the component guessing by
  // trimming an "s" off a word that may not end in one.
  assert.match(page, /singular="staff"/);
  assert.match(page, /singular="student"/);
  assert.doesNotMatch(page, /label\.replace\(\/s\$\//, "singular forms are stated, not derived");
});

test("editing and clearing are both reachable without hover", () => {
  // Hover-revealed actions are unusable on touch, so the stylesheet also
  // exposes them when there is no hover.
  assertContains("src/pages/admin/AdminAccounts.module.css", [
    /@media\s*\(hover:\s*none\)\s*\{[^}]*\.cellActions\s*\{\s*opacity:\s*1/s,
  ]);
  // And the cell offers an empty-state target, so an unpaid month can be
  // filled in without knowing the hover trick.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /className=\{styles\.recordButton\}/);
  assert.match(page, /aria-label=\{`Record payment for \$\{rowName\}, \$\{monthLabel\(month\)\}`\}/);
  assert.match(page, /onClick=\{begin\}/);
});

test("clearing an entry asks the server, it does not just hide the cell", () => {
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /accountsApi\.clearSalary\(id, month\)/);
  assert.match(page, /accountsApi\.clearFee\(id, month\)/);
  // And it refetches the grid it cleared, so the total cannot drift from what
  // the server holds.
  assert.match(page, /if \(kind === "salary"\) salaries\.refetch\(\);\s*else fees\.refetch\(\);/);
});

/* ---- Accounts month selector ---- */

test("salary and fee grids page independently", () => {
  // Two selectors, two anchors, two fetches. Sharing one would mean paging
  // salaries also moved the fees, losing the side-by-side comparison the
  // separate controls exist for.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /const \[salaryAnchor, setSalaryAnchor\] = useState/);
  assert.match(page, /const \[feeAnchor, setFeeAnchor\] = useState/);
  assert.match(page, /salarySheet\(SALARY_MONTHS, salaryAnchor\)/);
  assert.match(page, /feeSheet\(FEE_MONTHS, feeAnchor\)/);
  // Both default to the current month rather than being derived from each other.
  assert.equal(
    (page.match(/useState\(\(\) => currentMonthAnchor\(\)\)/g) || []).length,
    2,
    "both anchors must default to the current month"
  );
  // And each selector is bound to its own anchor.
  assert.match(page, /anchor=\{salaryAnchor\}\s+onChange=\{setSalaryAnchor\}/);
  assert.match(page, /anchor=\{feeAnchor\}\s+onChange=\{setFeeAnchor\}/);
});

test("a write refetches only the grid it belongs to", () => {
  // Refetching both would re-request the other sheet at its current anchor,
  // which is harmless on the server but wasted, and flashes the wrong grid.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /if \(kind === "salary"\) salaries\.refetch\(\);\s*else fees\.refetch\(\);/);
  assert.doesNotMatch(page, /Promise\.all\(\[salaries\.refetch\(\), fees\.refetch\(\)\]\)/);
});

test("each grid owns its loading and error state", () => {
  // With independent paging, one shared spinner would blank the whole page
  // every time either selector moved.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.doesNotMatch(page, /const loading = salaries\.loading \|\| fees\.loading/);
  assert.doesNotMatch(page, /const error = salaries\.error \|\| fees\.error/);
  assert.match(page, /salaries\.error && <ErrorBanner message=\{salaries\.error\}/);
  assert.match(page, /fees\.error && <ErrorBanner message=\{fees\.error\}/);
  assert.match(page, /salarySheet && \(/);
  assert.match(page, /feeSheet && \(/);
});

test("the accounts API forwards the anchor so the server owns the window", () => {
  assertContains("src/api/accounts.js", [
    /client\.get\("\/accounts\/salaries", \{ params: \{ months, end \} \}\)/,
    /client\.get\("\/accounts\/fees", \{ params: \{ months, end \} \}\)/,
  ]);
});

test("the month selector uses dropdowns and a return shortcut", () => {
  // The week selector steps week-by-week; the month selector now uses two
  // dropdowns for month and year, with a "This month" button that returns the
  // grid to the current month rather than stepping one month at a time.
  assertContains("src/components/ui/MonthSelector.jsx", [
    /This month/,
    /aria-label=\{`Select \$\{label\}`\}/,
    /<MonthYearPicker/,
  ]);
});

test("the selector has no forward stepping controls", () => {
  // Forward stepping has been removed: the month is now chosen from dropdowns
  // rather than by clicking arrow buttons, so there are no forward controls to
  // guard. The "This month" button still returns the grid to the current month.
  const selector = source("src/components/ui/MonthSelector.jsx");
  assert.doesNotMatch(selector, /go\(1\)/, "the forward one-step control is gone");
  assert.doesNotMatch(selector, /go\(6\)/, "the forward six-step control is gone");
  assert.match(selector, /This month/, "the grid still has a way back to now");
  // Backwards stays open: history is the point. Checked on the two backward
  // buttons themselves, not the whole file, since isCurrent is legitimately
  // declared above them for the shortcut button.
  const backButtons = selector.slice(0, selector.indexOf("formatMonthWindow(anchor, months)"));
  assert.doesNotMatch(backButtons, /disabled=\{[^}]*isCurrent/, "backwards must not be blocked at the current month");
});

// The month picker is shared: the accounts grids and the deposit dialog all pick
// a month the same way, so a month cannot end up spelled two different ways in
// two places. These read the shared component, and the callers are checked
// separately to prove they use it rather than reaching for an input.

const PICKER = "src/components/ui/MonthYearPicker.jsx";

test("no accounts month control is typed, not chosen from a list", () => {
  // A type="month" input renders its own month and year spinners, so how it
  // looks is the browser's decision and differs by platform; on several of them
  // it is a text box that will read a half-typed year as a real one. The
  // dropdowns can only ever hold valid values, which is the point of the change.
  for (const file of [
    PICKER,
    "src/components/ui/MonthSelector.jsx",
    "src/components/accounts/FeeDepositDialog.jsx",
  ]) {
    assert.doesNotMatch(source(file), /type="month"/, `${file} still has a month input`);
  }
  assert.doesNotMatch(source(PICKER), /type="date"/, "the window is whole months, not days");
  assert.match(source(PICKER), /<select[\s\S]*className="week-selector-pick"/);
  // The week selector is a different control and keeps its date input.
  assertContains("src/components/ui/WeekNavigator.jsx", [/type="date"/]);
});

test("the month dropdown offers the twelve months and the year dropdown a year list", () => {
  // Both lists come from the shared helpers rather than being written out here,
  // so a month cannot be spelled two different ways in two places.
  const picker = source(PICKER);
  assert.match(picker, /MONTH_OPTIONS\.map/);
  assert.match(picker, /years\.map/);
  assert.match(picker, /monthAnchorParts\(value\) \|\| monthAnchorParts\(stopAt\)/);
});

test("the dropdowns follow the value rather than local state", () => {
  // The value is what the caller is showing, so a value that disagrees with it
  // is a value claiming to look at a month that is not on screen. This is also
  // why `useState` and the picked-value plumbing are gone: with two dropdowns
  // there is no half-typed value to hold on to.
  const picker = source(PICKER);
  assert.doesNotMatch(picker, /useState/, "a controlled dropdown needs no local copy of the value");
  assert.doesNotMatch(picker, /setPicked/);
  assert.doesNotMatch(picker, /fromMonthInputValue/);
});

test("either dropdown moves the value, and both are resolved against the other", () => {
  // Picking April in 2027 while the value is September 2026 is a jump of seven
  // months, not of four -- so the year is not a modifier on the old value, it
  // replaces it and the month is carried across.
  const picker = source(PICKER);
  assert.match(picker, /function onPickMonth\(month\)[\s\S]*anchorFromParts\(parts\.year, month\)/);
  assert.match(picker, /function onPickYear\(year\)[\s\S]*anchorFromParts\(year, parts\.month\)/);
  // A pick that does not make a month changes nothing rather than sending a
  // malformed anchor to the server.
  assert.match(picker, /const next = anchorFromParts\([^)]*\);\n\s*if \(next\) onChange\(next\);/);
});

test("a picker with a boundary greys the future out of both lists", () => {
  // The arrows refuse to page forward past this month, so a dropdown that will
  // happily jump there is not refusing anything. The boundary is a prop rather
  // than the clock, because whether the future is reachable is the caller's
  // decision -- the fee grid can read months a deposit has written ahead.
  const picker = source(PICKER);
  assert.match(picker, /const bounded = Boolean\(stopAt\)/);
  assert.match(picker, /bounded && isAfterMonthAnchor\(anchorFromParts\(parts\.year, month\), stopAt\)/);
  assert.match(picker, /bounded && isAfterMonthAnchor\(anchorFromParts\(year, 1\), stopAt\)/);
  assert.match(picker, /disabled=\{monthUnavailable\(option\.value\)\}/);
  assert.match(picker, /disabled=\{yearUnavailable\(year\)\}/);
  // A year is tested on its FIRST month, not its last. January of next year is
  // the only month that can put a whole year ahead of the boundary, and testing
  // December instead would grey out the current year -- the year the caller is
  // standing in and the one year that must stay selectable.
  assert.doesNotMatch(picker, /anchorFromParts\(year, 12\)/, "the year is tested on January, or the current year greys itself out");
  // Every month is still rendered -- greyed out via the disabled attribute
  // rather than filtered out of the list, so it reads as a year and not a
  // truncated one.
  assert.match(picker, /<option\s+key=\{option\.value\}\s+value=\{option\.value\}\s+disabled=\{monthUnavailable\(option\.value\)\}\s*>\s*\{option\.label\}/);
  assert.doesNotMatch(picker, /MONTH_OPTIONS\.filter/, "months are disabled, not removed");
});

test("both grids use the shared picker, and only the fee one lets it reach forward", () => {
  // The fee grid reads months a deposit has written ahead, so it is given no
  // boundary. The salary grid has nothing out there, so it is stopped at this
  // month -- the same month the forward arrows stop at. If both sides ever take
  // the same `stopAt`, the arrows and the dropdowns have quietly started
  // disagreeing.
  const selector = source("src/components/ui/MonthSelector.jsx");
  assert.match(selector, /<MonthYearPicker/);
  assert.match(selector, /stopAt=\{allowFuture \? "" : current\}/);
  assert.match(selector, /value=\{anchor\}/);
  // The label the grid passes through reaches the accessible name, so the two
  // grids' pickers stay distinguishable to a screen reader.
  assert.match(selector, /monthLabel=\{`\$\{label\} month`\}/);
  assert.match(selector, /yearLabel=\{`\$\{label\} year`\}/);
  const accounts = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(accounts, /allowFuture/, "the fee selector opts in to the future");
  assert.doesNotMatch(accounts, /label="salary period"[\s\S]{0,300}allowFuture/, "the salary selector does not");
});

test("the deposit dialog picks its start month with the same two dropdowns", () => {
  // The dialog is the other place a month is chosen on this screen, and it is
  // the one that was left holding a month input. It gets no boundary on purpose:
  // a yearly plan written from this month reaches twelve months past it, so the
  // admin has to be able to start a term before the month they happen to be
  // looking at -- and forward from it, for a term already partly in the past.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /import MonthYearPicker from "\.\.\/ui\/MonthYearPicker"/);
  assert.match(dialog, /<MonthYearPicker[\s\S]*value=\{startMonth\}[\s\S]*onChange=\{setStartMonth\}/);
  assert.doesNotMatch(dialog, /stopAt=/, "the deposit can be dated anywhere, so the picker is unbounded");
  // Two controls means a fieldset, not a label: a label can only name one.
  assert.match(dialog, /<fieldset className="fd-field">/);
  assert.match(dialog, /<legend className="fd-label">Starting from<\/legend>/);
  assert.doesNotMatch(dialog, /htmlFor="fd-start"/, "the old month input's label is gone with it");
});

// ---- Per-student report ----

test("the reports API client reaches the server's student report endpoint", () => {
  assertContains("src/api/reports.js", [
    /export const studentReport = \(studentId\) =>\s*client\.get\(`\/reports\/student\/\$\{studentId\}`\)/,
  ]);
});

test("the reports page lists students with a search rather than being a placeholder", () => {
  const page = source("src/pages/admin/AdminReports.jsx");
  assert.match(page, /peopleApi\.listStudents\(\)/, "the list must come from the students API");
  assert.match(page, /type="search"/, "the list needs a search box");
  assert.match(page, /aria-label="Search students"/);
  // A stub that renders an empty message is what this page used to be.
  assert.doesNotMatch(page, /Nothing to report yet/);
});

test("the student list scrolls instead of hiding anyone behind a page boundary", () => {
  // Slicing to N rows would hide students behind a search the reader has to
  // already know the name of.
  const page = source("src/pages/admin/AdminReports.jsx");
  assert.doesNotMatch(page, /\.slice\(0,\s*VISIBLE/, "the list must not be truncated");
  assert.doesNotMatch(page, /hidden > 0/, "no hidden-behind-a-search rows");
  assert.doesNotMatch(page, /scrollHint|scroll for/, "the count note belongs to the accounts grids");
  assertContains("src/styles/global.css", [
    /\.sr-list\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s,
  ]);
});

test("searching the student list matches name, admission number and class", () => {
  const page = source("src/pages/admin/AdminReports.jsx");
  // The students API has no class_name, so class names are loaded from /classes
  // and joined in. Matching class_id as well as the name means both "class 2"
  // and "Class 2" hit. The joining itself lives in the util, where it is
  // unit-tested -- node cannot import a .jsx, so a filter defined on the page
  // would be untestable by construction.
  assert.match(page, /listClasses\(\)/);
  assert.match(page, /import \{ classNameFor, filterStudents \} from "\.\.\/\.\.\/utils\/studentReport"/);
  assert.match(page, /filterStudents\(all, query, classesById\)/);
  assertContains("src/utils/studentReport.js", [
    /export function filterStudents/,
    /export function classNameFor/,
    /\[s\.name, s\.admission_no, className, s\.class_id\]/,
  ]);
  // And a no-match state distinct from "no students at all".
  assert.match(page, /No students match that search\./);
  assert.match(page, /No students yet\./);
});

test("the report popup is a real dialog that closes on Escape", () => {
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  const accessibility = source("src/components/reports/useReportDialogAccessibility.js");
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /import \{ useEffect, useState \} from "react"/, "the report term selector effect must be imported");
  assert.match(dialog, /useEffect\(\(\) => \{/);
  assert.match(dialog, /useReportDialogAccessibility\(onClose\)/);
  assert.match(accessibility, /event\.key === "Escape"[\s\S]*?closeRef\.current\(\)/, "Escape must close the report");
  // Clicking the backdrop closes; clicking inside must not.
  assert.match(dialog, /className="confirm-overlay" onMouseDown=/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(dialog, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
});

test("the report shows details, marks and attendance", () => {
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /<h4 className="sr-h4">Details<\/h4>/);
  assert.match(dialog, /<h4 className="sr-h4">Marks<\/h4>/);
  assert.match(dialog, /<h4 className="sr-h4">Attendance<\/h4>/);
  // Guardians are the point of a report card, so every one is rendered.
  assert.match(dialog, /student\.guardians\?\.length/);
  assert.match(dialog, /student\.guardians\.map/);
  // The class name is resolved server-side; the page must not re-derive it.
  assert.match(dialog, /student\.class_name/);
});

test("the report never invents a grade, a pass or a rank", () => {
  // There are no exam, grade or result tables in the system. Emitting a grade
  // band or a pass/fail would mean shipping thresholds nobody agreed to.
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  const invented = [
    /\bGrade:\s*[A-F]/,
    /letter_grade/i,
    /\bpassed\b/i,
    /\bRank\b/,
    /percentage\s*of\s*marks/i,
  ];
  for (const pattern of invented) {
    assert.doesNotMatch(dialog, pattern, `the report must not show ${pattern}`);
  }
  // Instead it says what the scores are and what they are not.
  assert.match(dialog, /out of 100 as recorded per subject per term/);
  assert.match(dialog, /no exam, grade band or pass\/fail in the system/);
});

test("an ungraded term is caveated rather than presented as complete", () => {
  // Three scores out of six subjects must not read like three straight results.
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /subjectCoverage\(byTerm\)/);
  const utils = source("src/utils/studentReport.js");
  assert.match(utils, /if \(graded >= total\) return null/, "a complete term needs no caveat");
});

test("the report says 'No records' rather than a percentage of zero", () => {
  // The UI half of the same rule the server enforces: marked_days of 0 must
  // not become "0%".
  assertContains("src/utils/studentReport.js", [
    /if \(!marked\) return null/,
    /if \(pct === null\) return "No records"/,
  ]);
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /No attendance has been recorded for this student/);
  // JSX wraps prose across lines, so match the words, not the spacing.
  assert.match(dialog, /not a\s+percentage of zero/s);
});

test("the report explains that unmarked days are not absences", () => {
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /nobody marked are not counted as absences/s);
});

test("the report reads its data from the single server-side endpoint", () => {
  // The marks API returns subject_id with no name and the students API returns
  // class_id with no name. A client-side join would need every subject and
  // class loaded per report, so the server does it in one read.
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /reportsApi\.studentReport\(studentId\)/);
  assert.doesNotMatch(dialog, /marksApi|marksService|api\/marks/);
  assert.doesNotMatch(dialog, /listSubjects/, "no per-report subject lookup");
});

test("the popup's Download button renders the term that is on screen", () => {
  // A PDF is a snapshot of what the admin is looking at, so the button has to
  // hand the rendered term to the printer -- not invent its own.
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /import \{ downloadStudentReport \} from "\.\.\/\.\.\/utils\/studentReportPdf"/);
  assert.match(dialog, /onClick=\{\(\) => downloadStudentReport\(data, term\)\}/);
  assert.match(dialog, />\s*Download PDF\s*<\/button>/);
  // The term lives in the dialog so both the selector and the printer agree.
  assert.match(dialog, /onTermChange=\{setTerm\}/);
});

test("Download and Close are visibly buttons, not ghost text", () => {
  // Download sits on the report's head and is the action an admin came for, so
  // it must not render as bare dark text next to the student's name. These
  // styles are what the earlier invisible-button regression was about.
  const dialog = source("src/components/reports/StudentReportDialog.jsx");
  assert.match(dialog, /className="btn gold"/, "Download is the app's add-style action");
  const css = source("src/styles/global.css");
  assert.match(css, /\.sr-head \.btn \{/);
  assert.match(css, /\.sr-head \.btn\.ghost \{/, "Close has a solid fill of its own");
});

test("the report prints through a pure model, reachable by the tests", () => {
  // The drawing code is thin; buildPdfModel decides what a PDF may and may not
  // contain, and it returns the document as data so node tests can read it
  // without a PDF parser.
  const pdf = source("src/utils/studentReportPdf.js");
  assert.match(pdf, /export function buildPdfModel/);
  assert.match(pdf, /export function downloadStudentReport/);
  assert.match(pdf, /from "jspdf"/);
  assert.match(pdf, /from "jspdf-autotable"/);
  assertContains("src/utils/studentReportPdf.js", [
    /\.save\(studentReportFilename\(/,
    /student-report-[a-z0-9-]+\.pdf/,
  ]);
});

// ---- Per-staff report ----

test("the reports API client reaches the server's staff report endpoint", () => {
  assertContains("src/api/reports.js", [
    /export const staffReport = \(staffId\) =>\s*client\.get\(`\/reports\/staff\/\$\{staffId\}`\)/,
  ]);
});

test("the reports page lists staff next to students with its own search", () => {
  const page = source("src/pages/admin/AdminReports.jsx");
  assert.match(page, /peopleApi\.listStaff\(\)/, "the staff list must come from the staff API");
  assert.match(page, /aria-label="Search staff"/);
  assert.match(page, /StaffReportDialog/);
  assert.match(page, /openStaffId/);
  // The staff search is filtered by the util (page filters are untestable by import).
  assert.match(page, /filterStaff\(allStaff, staffQuery\)/);
});

test("the staff report popup is a real dialog that closes on Escape", () => {
  const dialog = source("src/components/reports/StaffReportDialog.jsx");
  const accessibility = source("src/components/reports/useReportDialogAccessibility.js");
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /useReportDialogAccessibility\(onClose\)/);
  assert.match(accessibility, /event\.key === "Escape"[\s\S]*?closeRef\.current\(\)/);
  assert.match(dialog, /className="confirm-overlay" onMouseDown=/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(dialog, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
});

test("the staff report shows details, salary and attendance", () => {
  const dialog = source("src/components/reports/StaffReportDialog.jsx");
  assert.match(dialog, /<h4 className="sr-h4">Details<\/h4>/);
  assert.match(dialog, /<h4 className="sr-h4">Salary<\/h4>/);
  assert.match(dialog, /<h4 className="sr-h4">Attendance<\/h4>/);
  // Salary is a set of window months, each with its paid-on date.
  assert.match(dialog, /salaryRows\(salary\)/);
  assert.match(dialog, /row\.record\.paid_on/);
});

test("an unpaid staff month is a dash, never a payment of zero", () => {
  const dialog = source("src/components/reports/StaffReportDialog.jsx");
  assert.match(dialog, /unpaid in that window, never a\s+payment of zero/s);
  assert.match(dialog, /salaryRows\(salary\)/);
  const utils = source("src/utils/staffReport.js");
  assert.match(utils, /record: byMonth\.get\(month\) \|\| null/);
});

test("no attendance is 'No records', never a percentage of zero", () => {
  assertContains("src/utils/staffReport.js", [
    /hasAttendance\(attendance\)/,
  ]);
  const dialog = source("src/components/reports/StaffReportDialog.jsx");
  assert.match(dialog, /No attendance has been recorded for this staff member/);
});

test("the staff popup's Download renders the same report object on screen", () => {
  const dialog = source("src/components/reports/StaffReportDialog.jsx");
  assert.match(dialog, /import \{ downloadStaffReport \} from "\.\.\/\.\.\/utils\/staffReportPdf"/);
  assert.match(dialog, /onClick=\{\(\) => downloadStaffReport\(data\)\}/);
  assert.match(dialog, />\s*Download PDF\s*<\/button>/);
});

test("the staff PDF prints through a pure model like the student sheet", () => {
  const pdf = source("src/utils/staffReportPdf.js");
  assert.match(pdf, /export function buildPdfModel/);
  assert.match(pdf, /export function downloadStaffReport/);
  assert.match(pdf, /from "jspdf"/);
  assert.match(pdf, /from "jspdf-autotable"/);
  assertContains("src/utils/staffReportPdf.js", [
    /\.save\(staffReportFilename\(/,
    /staff-report-[a-z0-9-]+\.pdf/,
  ]);
});

test("the profile page shows the caller's own details read-only", () => {
  // Details are shown, not edited: a name lives on the linked staff/parent
  // row that whoever administers that record owns, and editing it here would
  // fork two sources of truth. Only the password is editable.
  assertContains("src/pages/UserProfile.jsx", [
    /authApi\.me\(\)/,
    /display_name/,
    /data\?\.username/,
    /data\?\.email/,
    /data\?\.school_name/,
  ]);
  const page = source("src/pages/UserProfile.jsx");
  // Every detail is rendered through DetailRow, and no input is bound to one.
  // Matching only <input> matters: a DetailRow's `value` prop is read-only
  // markup, so a naive search would flag it as an editable field.
  for (const field of ["username", "email", "display_name", "school_name"]) {
    assert.doesNotMatch(
      page,
      new RegExp(`<input[^>]*value=\\{[^}]*${field}`),
      `${field} must not be an editable input`
    );
  }
});

test("the profile page changes only the password, and demands the current one", () => {
  assertContains("src/pages/UserProfile.jsx", [
    /authApi\.changePassword\(form\.currentPassword, form\.newPassword\)/,
    /autoComplete="current-password"/,
    /newPassword\.length < 8/,
    /newPassword !== confirmPassword/,
  ]);
  assertContains("src/components/ui/PasswordInput.jsx", [
    /visible \? "text" : "password"/,
    /aria-pressed=\{visible\}/,
    /aria-describedby=\{hint \? `\$\{id\}-hint` : undefined\}/,
  ]);
});

test("every role has a profile route under its own portal", () => {
  const app = source("src/App.jsx");
  for (const [role, prefix] of [
    ["parent", "parent"],
    ["teacher", "teacher"],
    ["admin", "admin"],
    ["pilot", "pilot"],
    ["master", "master"],
  ]) {
    assert.match(app, new RegExp(`path="profile" element=\\{<UserProfile />\\}`), `${role} is missing a profile route`);
    const portalRoute = ["teacher", "admin", "parent"].includes(role)
      ? `path="/${prefix}"`
      : `path="/${prefix}/*"`;
    assert.ok(app.includes(portalRoute), `${role} has no portal route to hang it on`);
  }
});

test("the profile link sits above Sign Out in both layouts", () => {
  // Above, not instead: signing out is the last thing in the sidebar, so a
  // profile entry placed after it would be stranded below the fold.
  for (const layout of [
    "src/components/layout/WebLayout.jsx",
    "src/components/layout/MobileLayout.jsx",
  ]) {
    const text = source(layout);
    // The wide sidebar renders the words as a text node after an icon span; the
    // phone topbar is icon-only and carries the label as accessible text. Match
    // whichever this layout uses.
    const profileAt = Math.max(
      ...[/My Profile/.exec(text), /aria-label="My Profile"/.exec(text)].map(
        (m) => (m ? m.index : -1)
      )
    );
    // Compare rendered positions, not the first textual hit: a comment
    // mentioning Sign Out would otherwise decide the order.
    const signOutAt = /<span>Sign Out<\/span>/.exec(text)?.index ?? -1;
    assert.ok(profileAt !== -1 && signOutAt !== -1, `${layout} is missing a footer control`);
    assert.ok(
      profileAt < signOutAt,
      `${layout} puts the profile link after Sign Out`
    );
  }
});

test("the profile link is derived from the session role, not hardcoded", () => {
  // One link has to reach five different portals, so the path comes from the
  // signed-in role. Hardcoding one prefix would send four roles to a 404.
  for (const layout of [
    "src/components/layout/WebLayout.jsx",
    "src/components/layout/MobileLayout.jsx",
  ]) {
    assertContains(layout, [
      /parent: "\/parent\/profile"/,
      /teacher: "\/teacher\/profile"/,
      /admin: "\/admin\/profile"/,
      /pilot: "\/pilot\/profile"/,
      /master: "\/master\/profile"/,
    ]);
  }
});

test("the profile page renders inside the signed-in role's own shell", () => {
  // Reusing the role's shell keeps its nav and school branding rather than
  // dropping the user onto an unbranded page.
  assertContains("src/pages/UserProfile.jsx", [
    /SHELLS/,
    /parent: ParentContent/,
    /teacher: TeacherShell/,
    /admin: AdminShell/,
    /pilot: PilotShell/,
    /master: MasterShell/,
    /<Shell>/,
  ]);
});

test("the profile page lays its cards out in a grid, not one tall stack", () => {
  // Four stacked cards on one page is a long scroll with nothing beside
  // anything. Row 1 is the account beside the password form, row 2 is the
  // attendance summary beside the pay summary, and a single-column fallback has
  // to exist for a phone -- otherwise the grid overflows the viewport instead
  // of stacking.
  assertContains("src/pages/UserProfile.jsx", [/<div className="profile-grid">/]);
  const css = source("src/styles/global.css");
  assert.match(css, /\.profile-grid \{[^}]*display: grid/);
  assert.match(css, /\.profile-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  // The cards fill the content width: a max-width cap left them narrower than
  // the page title above them on a wide screen.
  assert.match(css, /\.profile-grid \{[^}]*width: 100%/);
  assert.doesNotMatch(css, /\.profile-grid \{[^}]*max-width/);
  assert.match(css, /@media \(max-width: 860px\) \{\s*\.profile-grid, \.profile-summary \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  // A grid item defaults to min-width:auto, so the salary table's min-width
  // would widen the track and overflow the page instead of scrolling.
  assert.match(css, /\.profile-grid > \* \{ min-width: 0; \}/);
  assertContains("src/components/profile/StaffSelfSummary.jsx", [/<div className="table-scroll">/]);
});

test("the account and details are one card, with the password form beside it", () => {
  // The identity header is a heading for the details list, not a separate
  // card -- two cards stacked on the left column just adds a seam.
  const page = source("src/pages/UserProfile.jsx");
  assert.match(page, /<Card className="card white profile-account">/);
  assertContains("src/pages/UserProfile.jsx", [/<div className="section-label">Your account<\/div>/]);
  assert.match(page, /<div className="profile-identity">/);
  assert.match(page, /<DescriptionList/);
  assertContains("src/pages/UserProfile.jsx", [/<Card as="form" className="card white password-form"/]);
  // Order is what places them: account then password, in the first grid row.
  // `<PasswordForm />` rather than "password-form", which also matches the
  // component's own definition further up the file.
  assert.ok(
    page.indexOf("profile-account") < page.indexOf("<PasswordForm />"),
    "the account card must come before the password form in the markup"
  );
});

test("attendance and pay are two separate sections side by side", () => {
  // The pay section carries the history table; attendance is the summary only.
  const component = source("src/components/profile/StaffSelfSummary.jsx");
  assert.match(component, /<div className="profile-summary">/);
  assertContains("src/components/profile/StaffSelfSummary.jsx", [
    /<div className="section-label">Your attendance<\/div>/,
    /<div className="section-label">Your pay<\/div>/,
  ]);
  // Spanning the page grid is what puts them beside each other rather than in
  // the left column alone.
  const css = source("src/styles/global.css");
  assert.match(css, /\.profile-summary \{[^}]*grid-column: 1 \/ -1/);
  assert.match(css, /\.profile-summary \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  // The day list is the pay table's job now; attendance shows figures only.
  assert.match(component, /<h5 className="sr-h5">History<\/h5>/);
  assert.doesNotMatch(component, /attendanceDays|profile-avatar/);
});

test("the sidebar greets the signed-in user by first name", () => {
  // Under the school name, above the portal label: the greeting belongs to the
  // person, so it must not be pushed below the nav or sit above the branding.
  const layout = source("src/components/layout/WebLayout.jsx");
  assert.match(layout, /Welcome \{firstName\}/);
  const schoolAt = /className="school-name"/.exec(layout).index;
  const welcomeAt = /className="sidebar-welcome"/.exec(layout).index;
  const portalAt = /className="portal-label"/.exec(layout).index;
  assert.ok(schoolAt < welcomeAt, "the greeting must sit under the school name");
  assert.ok(welcomeAt < portalAt, "the greeting must sit above the portal label");
});

test("the greeting takes the first name only, never the whole string", () => {
  // "Ravi Tejaswi" must greet as "Ravi", not print the full name in the narrow
  // sidebar column.
  assertContains("src/components/layout/WebLayout.jsx", [
    /\.split\(\/\\s\+\/\)\[0\]/,
  ]);
});

test("the greeting falls back to the username rather than rendering blank", () => {
  // display_name arrives from /auth/me, which runs after first paint, and a
  // failed call must still leave a greeting rather than an empty gap.
  assertContains("src/components/layout/WebLayout.jsx", [
    /user\?\.displayName \|\| user\?\.name \|\| user\?\.username/,
    /\{firstName &&/,
  ]);
});

test("the session caches display_name from /auth/me", () => {
  // The sidebar needs the name on every portal, so it has to survive in the
  // cached session rather than each layout fetching it.
  assertContains("src/context/AuthContext.jsx", [
    /displayName: me\.display_name/,
    /prev\.displayName === me\.display_name/,
  ]);
});

test("the cached session keeps username and email alongside the branding", () => {
  // All three come from the same /auth/me call, so they are cached together
  // and the effect's equality check has to consider all of them.
  assertContains("src/context/AuthContext.jsx", [
    /email: me\.email/,
    /username: me\.username/,
  ]);
});
