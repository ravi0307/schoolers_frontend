import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const globalCss = read("src/styles/global.css");

const ruleBody = (source, selector, description = selector) => {
  const match = source.match(new RegExp(`${selector}\\s*\\{([^{}]*)\\}`, "s"));
  assert.ok(match, `missing ${description} rule`);
  return match[1];
};

test("native date inputs pin a light color scheme and the shared control height", () => {
  // The calendar popup itself is browser-rendered; forcing the light scheme
  // keeps it off any dark-OS rendering, and the shared height keeps the
  // input level with the Select-based month/year controls.
  const schemeRule = ruleBody(
    globalCss,
    'input\\[type="date"\\],\\s*input\\[type="month"\\]',
    "date/month color scheme"
  );
  assert.match(schemeRule, /color-scheme:\s*light/);
  const heightRule = ruleBody(
    globalCss,
    '\\.field input\\[type="date"\\],\\s*\\.field input\\[type="month"\\]',
    "date/month control height"
  );
  assert.match(heightRule, /min-height:\s*var\(--control-height\)/);
});

test("calendar indicator matches the muted form-control iconography", () => {
  const indicator = ruleBody(
    globalCss,
    'input\\[type="date"\\]::-webkit-calendar-picker-indicator,\\s*input\\[type="month"\\]::-webkit-calendar-picker-indicator',
    "calendar picker indicator"
  );
  assert.match(indicator, /width:\s*1rem/);
  assert.match(indicator, /height:\s*1rem/);
  assert.match(indicator, /cursor:\s*pointer/);
  assert.match(indicator, /border-radius:\s*var\(--radius-sm\)/);
  assert.doesNotMatch(indicator, /#[0-9a-fA-F]{3,8}\b|\b(?:white|black)\b|rgba?\(/i);
  assert.match(globalCss, /:hover::-webkit-calendar-picker-indicator\s*\{[^}]*opacity:\s*1/s);
  assert.match(globalCss, /:focus-visible::-webkit-calendar-picker-indicator\s*\{[^}]*outline:\s*3px solid/s);
  assert.match(globalCss, /:disabled::-webkit-calendar-picker-indicator\s*\{[^}]*cursor:\s*not-allowed/s);
});

test("every date input has an accessible label", () => {
  for (const file of [
    "src/components/ui/WeekNavigator.jsx",
    "src/components/profile/StaffSelfSummary.jsx",
    "src/pages/admin/AdminStudents.jsx",
    "src/pages/admin/AdminTeachers.jsx",
    "src/pages/admin/AdminHolidays.jsx",
    "src/pages/admin/AdminStaff.jsx",
    "src/pages/admin/AdminTripHistory.jsx",
    "src/pages/parent/ParentLeave.jsx",
    "src/pages/pilot/PilotLeave.jsx",
  ]) {
    const src = read(file);
    if (!/type="(date|month)"/.test(src)) continue;
    assert.ok(
      /<label[\s>]/.test(src) || /aria-label=/.test(src) || /<FormField\b/.test(src),
      `${file} should label its date inputs`
    );
  }
});
