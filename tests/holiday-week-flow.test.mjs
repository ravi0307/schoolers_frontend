import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  TIMETABLE_DAYS,
  buildWeekColumns,
  formatWeekRange,
  formatHolidayDate,
  holidayMapByDate,
  holidayNamesByWeekday,
  isSameWeekIso,
  mergeWeekColumns,
  shiftWeekIso,
  startOfWeekIso,
  toIsoDate,
} from "../src/utils/timetableFlow.js";

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

/*
 * The week helpers must agree with the backend's common/week.py. If they drift,
 * the timetable would highlight the wrong column as a holiday, so the Monday
 * arithmetic is pinned here rather than only smoke-tested through the UI.
 */

test("startOfWeekIso snaps every day back to its Monday", () => {
  // 2026-09-21 is a Monday, 2026-09-27 the Sunday of the same week.
  assert.equal(startOfWeekIso(new Date(2026, 8, 21)), "2026-09-21");
  assert.equal(startOfWeekIso(new Date(2026, 8, 23)), "2026-09-21");
  assert.equal(startOfWeekIso(new Date(2026, 8, 27)), "2026-09-21");
  // Week boundaries roll correctly.
  assert.equal(startOfWeekIso(new Date(2026, 8, 28)), "2026-09-28");
  assert.equal(startOfWeekIso(new Date(2026, 9, 1)), "2026-09-28");
  assert.equal(startOfWeekIso(new Date(2026, 0, 1)), "2025-12-29");
});

test("startOfWeekIso defaults to the current week", () => {
  const now = new Date();
  const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  expected.setDate(expected.getDate() - ((expected.getDay() + 6) % 7));
  assert.equal(startOfWeekIso(), startOfWeekIso(expected));
  assert.equal(isSameWeekIso(startOfWeekIso(), now), true);
});

test("toIsoDate formats in local time, not UTC", () => {
  assert.equal(toIsoDate(new Date(2026, 8, 21)), "2026-09-21");
  assert.equal(toIsoDate(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(toIsoDate(new Date("nonsense")), "");
});

test("shiftWeekIso moves whole weeks in both directions", () => {
  assert.equal(shiftWeekIso("2026-09-21", 1), "2026-09-28");
  assert.equal(shiftWeekIso("2026-09-21", 2), "2026-10-05");
  assert.equal(shiftWeekIso("2026-09-21", -1), "2026-09-14");
  assert.equal(shiftWeekIso("2026-09-21", 0), "2026-09-21");
  // Crosses a month and a year boundary without drifting.
  assert.equal(shiftWeekIso("2026-09-28", 1), "2026-10-05");
  assert.equal(shiftWeekIso("2026-12-28", 1), "2027-01-04");
  assert.equal(shiftWeekIso("2027-01-04", -1), "2026-12-28");
});

test("isSameWeekIso compares by week, not by exact date", () => {
  assert.equal(isSameWeekIso("2026-09-21", "2026-09-23"), true);
  assert.equal(isSameWeekIso("2026-09-21", "2026-09-27"), true);
  assert.equal(isSameWeekIso("2026-09-21", "2026-09-28"), false);
});

test("formatWeekRange labels the visible week", () => {
  assert.equal(formatWeekRange("2026-09-21"), "21 Sep - 27 Sep 2026");
  // Spanning a month keeps both month names.
  assert.equal(formatWeekRange("2026-09-28"), "28 Sep - 4 Oct 2026");
});

test("buildWeekColumns returns seven Monday-first columns with dates", () => {
  const columns = buildWeekColumns("2026-09-21");
  assert.equal(columns.length, 7);
  assert.deepEqual(columns.map((c) => c.day), TIMETABLE_DAYS);
  assert.equal(columns[0].date, "2026-09-21");
  assert.equal(columns[6].date, "2026-09-27");
  // Local columns are not holidays or entries until the API says so.
  assert.ok(columns.every((c) => c.isHoliday === false));
  assert.ok(columns.every((c) => c.entries.length === 0));
});

test("buildWeekColumns accepts a date in the middle of the target week", () => {
  assert.deepEqual(
    buildWeekColumns("2026-09-21").map((c) => c.date),
    buildWeekColumns("2026-09-23").map((c) => c.date)
  );
});

test("mergeWeekColumns applies the server's holiday flags and entries", () => {
  const columns = buildWeekColumns("2026-09-21");
  const week = {
    week_start: "2026-09-21",
    week_end: "2026-09-27",
    days: [
      { day_of_week: "Mon", date: "2026-09-21", is_holiday: false, entries: [{ entry_id: 1 }] },
      { day_of_week: "Sat", date: "2026-09-26", is_holiday: true, entries: [] },
      { day_of_week: "Sun", date: "2026-09-27", is_holiday: true, entries: [] },
    ],
  };
  const merged = mergeWeekColumns(columns, week);
  assert.equal(merged.length, 7);
  const byDay = new Map(merged.map((c) => [c.day, c]));
  assert.equal(byDay.get("Mon").entries.length, 1);
  assert.equal(byDay.get("Mon").isHoliday, false);
  // The days the server did not mention keep their locally built date.
  assert.equal(byDay.get("Tue").date, "2026-09-22");
  assert.equal(byDay.get("Tue").isHoliday, false);
  assert.equal(byDay.get("Sat").isHoliday, true);
  assert.equal(byDay.get("Sun").isHoliday, true);
  // Every column is still present, so the grid never loses a weekday.
  assert.deepEqual(merged.map((c) => c.day), TIMETABLE_DAYS);
});

test("mergeWeekColumns tolerates an empty or absent week response", () => {
  const columns = buildWeekColumns("2026-09-21");
  assert.equal(mergeWeekColumns(columns, null), columns);
  assert.equal(mergeWeekColumns(columns, { days: [] }), columns);
});

test("holidayMapByDate keys the GET /holidays list by date, not weekday", () => {
  const map = holidayMapByDate([
    { occasion: "Diwali", holiday_date: "2026-11-08" },
    { occasion: "Christmas", holiday_date: "2026-12-25" },
  ]);
  assert.equal(map.get("2026-11-08"), "Diwali");
  assert.equal(map.get("2026-12-25"), "Christmas");
  // A weekday key is what made every future Diwali a holiday; it must be absent.
  assert.equal(map.get("Sun"), undefined);
  assert.equal(holidayMapByDate([]).size, 0);
  assert.equal(holidayMapByDate(null).size, 0);
});

test("holidayMapByDate skips rows with no usable date", () => {
  const map = holidayMapByDate([
    { occasion: "No date" },
    { occasion: "Diwali", holiday_date: "2026-11-08" },
  ]);
  assert.equal(map.size, 1);
  assert.equal(map.get("2026-11-08"), "Diwali");
});

test("holidayNamesByWeekday marks only the week that contains a holiday", () => {
  const list = [
    { occasion: "Diwali", holiday_date: "2026-11-08" },   // Sunday
    { occasion: "Christmas", holiday_date: "2026-12-25" }, // Friday
  ];
  // The week containing Diwali highlights that Sunday only.
  assert.deepEqual(holidayNamesByWeekday(list, "2026-11-02"), { Sun: "Diwali" });
  // A different week is clean, even though it shares that weekday.
  assert.deepEqual(holidayNamesByWeekday(list, "2026-11-09"), {});
  // Christmas highlights its own Friday, not Diwali's Sunday.
  assert.deepEqual(holidayNamesByWeekday(list, "2026-12-21"), { Fri: "Christmas" });
  // A mid-week start snaps to the same Monday.
  assert.deepEqual(holidayNamesByWeekday(list, "2026-11-05"), { Sun: "Diwali" });
});

test("holidayNamesByWeekday can report two holidays in one week", () => {
  const list = [
    { occasion: "A", holiday_date: "2026-11-10" },
    { occasion: "B", holiday_date: "2026-11-12" },
  ];
  assert.deepEqual(holidayNamesByWeekday(list, "2026-11-09"), { Tue: "A", Thu: "B" });
});

test("formatHolidayDate renders a stable label for the table", () => {
  assert.equal(formatHolidayDate("2026-11-08"), "8 Nov 2026");
  assert.equal(formatHolidayDate("2026-01-01"), "1 Jan 2026");
  assert.equal(formatHolidayDate("2026-12-25"), "25 Dec 2026");
  assert.equal(formatHolidayDate(""), "");
  assert.equal(formatHolidayDate(null), "");
  // Unparseable input is passed through rather than rendered as "NaN".
  assert.equal(formatHolidayDate("nonsense"), "nonsense");
});

test("academics client exposes holiday CRUD", () => {
  assertContains("src/api/academics.js", [
    /export const listHolidays = \(\) => client\.get\("\/holidays"\)/,
    /export const createHoliday = \(data\) => client\.post\("\/holidays", data\)/,
    /export const updateHoliday = \(id, data\) => client\.patch\(`\/holidays\/\$\{id\}`, data\)/,
    /export const deleteHoliday = \(id\) => client\.delete\(`\/holidays\/\$\{id\}`\)/,
  ]);
});

test("timetable client can fetch a single week", () => {
  assertContains("src/api/timetable.js", [
    /classTimetableWeek = \(classId, weekStart\)/,
    /\/timetable\/class\/\$\{classId\}\/week/,
    /week_start: weekStart/,
  ]);
});

test("admin holidays page is a two-column Occasion/Date table with add/update/remove", () => {
  const page = source("src/pages/admin/AdminHolidays.jsx");
  assertContains("src/pages/admin/AdminHolidays.jsx", [
    /academicsApi\.listHolidays\(\)/,
    /academicsApi\.createHoliday\(/,
    /academicsApi\.updateHoliday\(/,
    /academicsApi\.deleteHoliday\(/,
    /<th>Occasion<\/th>/,
    /<th>Date<\/th>/,
    /Add holiday/,
    /Update/,
    /Remove/,
    /formatHolidayDate\(holiday\.holiday_date\)/,
  ]);
  // The old recurring-weekday form must be gone.
  for (const forbidden of [
    "holiday-toggle",
    "createHolidays",
    "selectedHolidayDays",
    "day_of_week",
  ]) {
    assert.ok(!page.includes(forbidden), `holidays page must not contain ${forbidden}`);
  }
});

test("holiday edits are sent as a partial update, not the whole row", () => {
  // Sending an unchanged date back would collide with the row's own date on the
  // server's duplicate-date check, so only changed fields may be sent.
  const page = source("src/pages/admin/AdminHolidays.jsx");
  assert.match(page, /if \(occasion !== current\.occasion\) payload\.occasion = occasion/);
  assert.match(page, /if \(draft\.holiday_date !== current\.holiday_date\)/);
});

test("admin holidays page is routed and linked", () => {
  assertContains("src/App.jsx", [
    /import AdminHolidays from "\.\/pages\/admin\/AdminHolidays"/,
    /<Route path="holidays" element=\{<AdminHolidays \/>\} \/>/,
  ]);
  assertContains("src/components/layout/AdminShell.jsx", [
    /to: "\/admin\/holidays"/,
  ]);
});

test("both timetables default to the current week and navigate weeks", () => {
  for (const page of [
    "src/pages/admin/AdminTimetable.jsx",
    "src/pages/teacher/TeacherTimetable.jsx",
  ]) {
    assertContains(page, [
      /useState\(\(\) => startOfWeekIso\(\)\)/,
      /timetableApi\.classTimetableWeek\(selectedClassId, weekStart\)/,
      /mergeWeekColumns\(buildWeekColumns\(weekStart\), week\)/,
      /<WeekSelector weekStart=\{weekStart\} onChange=\{setWeekStart\}/,
    ]);
  }
});

test("both timetables mark holiday columns in red", () => {
  for (const page of [
    "src/pages/admin/AdminTimetable.jsx",
    "src/pages/teacher/TeacherTimetable.jsx",
  ]) {
    const text = source(page);
    assert.match(text, /className=\{column\.isHoliday \? "timetable-day-holiday" : undefined\}/);
  }
  assertContains("src/components/ui/TimetableWeekHeader.jsx", [
    /className=\{column\.isHoliday \? "timetable-day-holiday" : undefined\}/,
    /timetable-day-flag/,
    /formatWeekRange\(weekStart\)/,
  ]);
  // The red treatment exists in CSS, not just as a class name.
  const css = source("src/styles/global.css");
  assert.match(css, /\.timetable-day-holiday[^}]*var\(--red-pen\)/);
  assert.match(css, /\.timetable-day-holiday[^}]*var\(--red-pen-light\)/);
});

test("week selector offers previous, next, and back-to-this-week", () => {
  assertContains("src/components/ui/WeekSelector.jsx", [
    /go\(-1\)/,
    /go\(1\)/,
    /goToToday/,
    /startOfWeekIso\(\)/,
    /formatWeekRange\(weekStart\)/,
    /type="date"/,
  ]);
});

test("teacher timetable stays read-only with the week view", () => {
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
});

/*
 * Column alignment between the week header and the grid body.
 *
 * The header leads with a caption column, so the body needs a matching leading
 * cell. When it was missing, all seven day cells rendered one column to the
 * left: the header correctly showed Gandhi Jayanti on Fri 2 Oct while the body
 * note landed under Thu 1 Oct, so the holiday appeared to fall on two days.
 */

test("admin timetable body opens with a corner cell for the header caption", () => {
  const admin = source("src/pages/admin/AdminTimetable.jsx");
  assert.match(
    admin,
    /<tr>\s*\{?\/\*[^*]*\*\/\}?\s*<td className="timetable-week-corner"\s*\/>\s*\{weekColumns\.map/,
    "admin timetable body must render timetable-week-corner before the day cells"
  );
  assert.match(admin, /TimetableWeekHeader columns=\{weekColumns\}/);
  assert.match(admin, /weekColumns\.map\(\(column\) => \(\s*<td/);
});

test("teacher timetable body opens with the same corner cell", () => {
  const teacher = source("src/pages/teacher/TeacherTimetable.jsx");
  assert.match(
    teacher,
    /<tr>\s*\{?\/\*[^*]*\*\/\}?\s*<td className="timetable-week-corner"\s*\/>\s*\{weekColumns\.map/,
    "teacher timetable body must render timetable-week-corner before the day cells"
  );
  assert.match(teacher, /TimetableWeekHeader columns=\{weekColumns\}/);
});

test("the week header emits a caption cell that the body corner cell must match", () => {
  // Guards the count relationship rather than a literal: one caption + 7 days.
  const header = source("src/components/ui/TimetableWeekHeader.jsx");
  assert.match(header, /timetable-week-caption/);
  assert.match(header, /columns\.map\(\(column\) => \(/);
  const columns = buildWeekColumns("2026-09-28");
  assert.equal(columns.length, 7, "a week is seven day columns");
  assert.equal(columns.length + 1, 8, "header is caption + seven day cells");
});

test("a holiday note renders in the same column as its header flag", () => {
  // The two holidays from the reported bug: Gandhi Jayanti on Fri 2 Oct and
  // Founders Day on Sun 4 Oct, both inside the week of Mon 28 Sep.
  const week = {
    days: [
      { day_of_week: "Mon", date: "2026-09-28", is_holiday: false, entries: [] },
      { day_of_week: "Tue", date: "2026-09-29", is_holiday: false, entries: [] },
      { day_of_week: "Wed", date: "2026-09-30", is_holiday: false, entries: [] },
      { day_of_week: "Thu", date: "2026-10-01", is_holiday: false, entries: [] },
      { day_of_week: "Fri", date: "2026-10-02", is_holiday: true, holiday_name: "Gandhi Jayanti", entries: [] },
      { day_of_week: "Sat", date: "2026-10-03", is_holiday: false, entries: [] },
      { day_of_week: "Sun", date: "2026-10-04", is_holiday: true, holiday_name: "Founders Day", entries: [] },
    ],
  };
  const columns = mergeWeekColumns(buildWeekColumns("2026-09-28"), week);

  // Header cells: index 0 is the caption, so day columns start at 1.
  const headerCells = ["Period", ...columns.map((c) => c.day)];
  assert.equal(headerCells.length, 8);

  // Body cells: the corner cell plus one per column.
  const bodyCells = ["corner", ...columns];
  assert.equal(bodyCells.length, headerCells.length);

  const flagged = columns
    .map((column, index) => ({ column, bodyIndex: index + 1 }))
    .filter(({ column }) => column.isHoliday);

  assert.equal(flagged.length, 2);
  assert.equal(flagged[0].bodyIndex, 5, "Gandhi Jayanti is the 5th day cell = Fri 2 Oct");
  assert.equal(headerCells[flagged[0].bodyIndex], "Fri");
  assert.equal(flagged[0].column.date, "2026-10-02");
  assert.equal(flagged[1].bodyIndex, 7, "Founders Day is the 7th day cell = Sun 4 Oct");
  assert.equal(headerCells[flagged[1].bodyIndex], "Sun");
  assert.equal(flagged[1].column.date, "2026-10-04");

  // The two holidays must not collide on a neighbouring day.
  assert.notEqual(flagged[0].column.date, flagged[1].column.date);
  assert.equal(
    columns.filter((c) => c.isHoliday).reduce((sum, c) => sum + Number(c.date.slice(-2)), 0),
    2 + 4,
    "holiday day-of-month numbers should be 2 and 4"
  );
});

/*
 * Week selector placement and legibility.
 *
 * It moved into the "Manage Timetable" title row so a week can be chosen before
 * picking a class. The shared `.btn.ghost` rule is styled for the dark sidebar,
 * which left the arrows near-white on the light page background.
 */

test("week selector lives in the page title row and is available before a class is picked", () => {
  const admin = source("src/pages/admin/AdminTimetable.jsx");
  const titleRow = admin.slice(admin.indexOf("scr-title-row"), admin.indexOf("scr-title-row") + 600);
  assert.match(titleRow, /<WeekSelector weekStart=\{weekStart\}/, "selector must sit in the title row");
  // No longer conditional on a class selection.
  const selectorCount = (admin.match(/<WeekSelector/g) || []).length;
  assert.equal(selectorCount, 1, "exactly one WeekSelector on the page");
  const selectedBlock = admin.slice(
    admin.indexOf("selected-timetable-label"),
    admin.indexOf("selected-timetable-label") + 400
  );
  assert.ok(!selectedBlock.includes("WeekSelector"), "the per-class label must not carry a second selector");
});

test("week selector buttons are legible on the light page background", () => {
  const css = source("src/styles/global.css");
  // Scoped light-surface styling, not the dark-sidebar ghost default.
  assert.match(css, /\.web-content \.week-selector \.btn\.ghost \{[\s\S]*?color: var\(--chalk-green-dark\)/);
  assert.match(css, /\.web-content \.week-selector \.btn\.ghost \{[\s\S]*?background: var\(--paper-light\)/);
  assert.match(css, /\.web-content \.week-selector \.btn\.ghost \{[\s\S]*?border-color: var\(--ruled-blue\)/);
  // The current week is a chip, not bare 14px text between two arrows.
  assert.match(css, /\.web-content \.week-selector-range \{[\s\S]*?font-size: 16px/);
  assert.match(css, /\.web-content \.week-selector-range \{[\s\S]*?background: var\(--ruled-blue-light\)/);
  assert.match(css, /\.web-content \.week-selector-range \{[\s\S]*?white-space: nowrap/);
});

test("the title row keeps the teacher selector's standalone margins", () => {
  const css = source("src/styles/global.css");
  assert.match(css, /\.scr-title-row \.week-selector \{ margin: 0; \}/);
  assert.match(css, /\.week-selector \{[\s\S]*?margin: 10px 0 14px;/);
  assert.match(css, /\.scr-title-row \{[\s\S]*?align-items: flex-end/);
});
