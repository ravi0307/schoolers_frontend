import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const globalCss = read("src/styles/global.css");
const datePickerCss = read("src/components/ui/DatePicker.module.css");

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

test("date picking uses the shared calendar without a third-party date library", () => {
  // The input remains a native date/month control for editing, form submission,
  // validation, and min/max semantics. The shared portal calendar owns the
  // popup theme and positioning instead of relying on browser-specific chrome.
  const pkg = JSON.parse(read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const lib of ["date-fns", "moment", "dayjs", "react-datepicker", "flatpickr", "@mui/x-date-pickers"]) {
    assert.ok(!(lib in deps), `unexpected date library ${lib} in dependencies`);
  }
  assert.match(read("src/components/ui/MonthYearPicker.jsx"), /from "\.\/Select"/);
});

test("the shared calendar uses theme tokens for surfaces, states, and positioning", () => {
  assert.match(datePickerCss, /position:\s*fixed/);
  assert.match(datePickerCss, /background:\s*var\(--color-surface-raised\)/);
  assert.match(datePickerCss, /border:\s*var\(--border-width-thin\) solid var\(--color-border\)/);
  assert.match(datePickerCss, /border-radius:\s*var\(--radius-lg\)/);
  assert.match(datePickerCss, /box-shadow:\s*var\(--shadow-md\)/);
  assert.match(datePickerCss, /data-selected/);
  assert.match(datePickerCss, /background:\s*var\(--color-primary\)/);
  assert.match(datePickerCss, /data-today/);
  assert.match(datePickerCss, /data-outside-month/);
  assert.match(datePickerCss, /:disabled/);
});

test("filter-panel date inputs use the tokenized filter control", () => {
  const page = read("src/pages/admin/AdminTripHistory.jsx");
  assert.match(page, /<DatePicker className=\{styles\.filterInput\} type="date"/);
  const css = read("src/pages/admin/AdminTripHistory.module.css");
  const body = ruleBody(css, "\\.filterInput", "trip history filter input");
  assert.match(body, /height:\s*var\(--control-height\)/);
  assert.match(body, /border-radius:\s*var\(--radius-md\)/);
  assert.match(body, /background-color:\s*var\(--color-surface-raised\)/);
  assert.match(body, /color:\s*var\(--color-text\)/);
  assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b|\b\d+px\b/);
  assert.match(css, /\.filtersBar :global\(\[data-date-picker-root\]\)/);
});

test("all application date and month callsites use the shared DatePicker", () => {
  const callsites = [
    "src/components/ui/WeekNavigator.jsx",
    "src/components/profile/StaffSelfSummary.jsx",
    "src/pages/admin/AdminStudents.jsx",
    "src/pages/admin/AdminTeachers.jsx",
    "src/pages/admin/AdminHolidays.jsx",
    "src/pages/admin/AdminStaff.jsx",
    "src/pages/admin/AdminTripHistory.jsx",
    "src/pages/parent/ParentLeave.jsx",
    "src/pages/pilot/PilotLeave.jsx",
  ];
  let count = 0;
  for (const file of callsites) {
    const src = read(file);
    assert.match(src, /import DatePicker from /, `${file} should import DatePicker`);
    assert.doesNotMatch(src, /<input\b[^>]*type="(?:date|month)"/, `${file} still renders a native date/month input`);
    count += (src.match(/<DatePicker\b/g) || []).length;
  }
  assert.equal(count, 16, "the audited application callsite count changed unexpectedly");
});

test("week jump date input stays labelled and disables while busy", () => {
  const src = read("src/components/ui/WeekNavigator.jsx");
  assert.match(src, /aria-label="Jump to week"/);
  assert.match(src, /disabled=\{busy\}/);
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
