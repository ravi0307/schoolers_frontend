import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const contrast = (foreground, background) => {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
};
const filesIn = (directory, extension) =>
  fs.readdirSync(path.resolve(directory))
    .filter((file) => file.endsWith(extension))
    .map((file) => path.join(directory, file));

const pageFiles = [
  ...filesIn("src/pages/parent", ".jsx"),
  ...filesIn("src/pages/staff", ".jsx"),
];

test("parent navigation keeps every destination inside the shared responsive shell", () => {
  const shell = read("src/components/layout/ParentShell.jsx");
  for (const route of [
    "/parent/home",
    "/parent/pickdrop",
    "/parent/trips",
    "/parent/attendance",
    "/parent/timetable",
    "/parent/marks",
    "/parent/report",
    "/parent/gallery",
    "/parent/leave",
    "/parent/barter",
  ]) {
    assert.ok(shell.includes(`to: "${route}"`), `ParentShell lost ${route}`);
  }
  assert.match(shell, /<WebLayout navItems=\{TABS\} portalLabel="PARENT PORTAL">/);
  assert.doesNotMatch(shell, /MobileLayout|useIsWide/);
  assert.match(shell, /setSelectedChildId\(Number\(e\.target\.value\)\)/);
  assert.match(shell, /No children linked to this parent account yet/);
});

test("admin and parent trip history sidebar entries open registered pages", () => {
  const admin = read("src/components/layout/AdminShell.jsx");
  const parent = read("src/components/layout/ParentShell.jsx");
  const app = read("src/App.jsx");

  assert.match(admin, /to: "\/admin\/trips", icon: History, label: "Trip History"/);
  assert.match(parent, /to: "\/parent\/trips", icon: History, label: "Trip History"/);
  assert.match(app, /path="trips" element=\{<AdminTripHistory \/>\}/);
  assert.match(app, /path="trips" element=\{<ParentTripHistory \/>\}/);
});

test("staff navigation and profile/sign-out use the shared shell configuration", () => {
  const shell = read("src/components/layout/StaffShell.jsx");
  for (const route of ["/staff/broadcast", "/staff/gallery", "/staff/report"]) {
    assert.ok(shell.includes(`to: "${route}"`), `StaffShell lost ${route}`);
  }
  assert.match(shell, /<WebLayout navItems=\{NAV\} portalLabel="STAFF PORTAL">/);
  const layout = read("src/components/layout/WebLayout.jsx");
  assert.match(layout, /staff:\s*"\/staff\/profile"/);
  assert.match(layout, /<span>My Profile<\/span>/);
  assert.match(layout, /<span>Sign Out<\/span>/);
});

test("staff and parent screens use semantic shared page headers", () => {
  for (const page of pageFiles) {
    assert.match(read(page), /<PageHeader\b/, `${page} should render the shared page header`);
  }
  assert.match(read("src/pages/UserProfile.jsx"), /<PageHeader\b/);
});

test("Staff and Parent code has no inline styles, hard-coded colors, px values, overrides or emoji icons", () => {
  const scopedFiles = [
    ...pageFiles,
    ...filesIn("src/pages/parent", ".module.css"),
    ...filesIn("src/pages/staff", ".module.css"),
    "src/components/layout/ParentShell.jsx",
    "src/components/layout/ParentShell.module.css",
    "src/components/layout/StaffShell.jsx",
    "src/components/ui/RichTextEditor.jsx",
    "src/components/ui/RichTextEditor.module.css",
  ];
  const scopedSource = scopedFiles.map(read).join("\n");
  assert.doesNotMatch(scopedSource, /style\s*=\s*\{\{/i);
  assert.doesNotMatch(scopedSource, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(scopedSource, /\b\d+(?:\.\d+)?px\b/i);
  assert.doesNotMatch(scopedSource, /!important/i);
  assert.doesNotMatch(scopedSource, /\p{Extended_Pictographic}/u);
});

test("shared portal shell keeps its responsive drawer and desktop sidebar breakpoints", () => {
  const layout = read("src/components/layout/WebLayout.jsx");
  const css = read("src/components/layout/WebLayout.module.css");
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(layout, /event\.key === "Escape"/);
  assert.match(layout, /event\.key !== "Tab"/);
  assert.match(layout, /toggleButton\.focus\(\)/);
  assert.match(layout, /aria-modal=\{isMobile && drawerOpen \? "true" : undefined\}/);
});

test("new portal surfaces and text styles inherit light-surface tokens", () => {
  assert.match(read("src/components/ui/Card.module.css"), /color:\s*var\(--color-text\)/);
  assert.match(read("src/pages/parent/ParentHome.module.css"), /color:\s*var\(--color-text\)/);
  const broadcast = read("src/pages/staff/StaffBroadcast.module.css");
  assert.match(broadcast, /background:\s*var\(--color-surface-raised\)/);
  assert.match(broadcast, /color:\s*var\(--color-text\)/);
  assert.match(broadcast, /--surface-text-muted:\s*var\(--color-text-muted\)/);
});

test("Staff and Parent light-surface foreground tokens meet WCAG AA", () => {
  const tokens = read("src/styles/tokens.css");
  const value = (name) => {
    const hex = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
    assert.ok(hex, `missing color token ${name}`);
    return hex;
  };
  const lightBackgrounds = ["--color-surface", "--color-surface-raised", "--color-neutral-100"];
  const lightText = [
    "--color-text",
    "--color-text-muted",
    "--color-primary",
    "--color-secondary",
    "--color-success",
    "--color-warning",
    "--color-danger",
  ];
  for (const background of lightBackgrounds) {
    for (const foreground of lightText) {
      const ratio = contrast(value(foreground), value(background));
      assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
});
