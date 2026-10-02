import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const css = read("src/styles/global.css");
const layout = read("src/styles/layout.css");
const hook = read("src/components/reports/useReportDialogAccessibility.js");
const tokens = read("src/styles/tokens.css");

function colorToken(name) {
  const value = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  assert.ok(value, `missing color token ${name}`);
  return value;
}

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((offset) => {
      const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("light cards and report dialogs establish their own light text surface", () => {
  assert.match(css, /\.card\s*\{[^}]*color:\s*var\(--color-text\)[^}]*--surface-text-muted:\s*var\(--color-text-muted\)/s);
  assert.match(css, /\.confirm-box\s*\{[^}]*color:\s*var\(--color-text\)[^}]*--surface-text-muted:\s*var\(--color-text-muted\)/s);
  assert.match(css, /\.sr-box\s*\{[^}]*color:\s*var\(--color-text\)[^}]*--surface-text-muted:\s*var\(--color-text-muted\)/s);
  assert.match(css, /\.album-dialog\s*\{[^}]*color:\s*var\(--color-text\)[^}]*--surface-text-muted:\s*var\(--color-text-muted\)/s);
  assert.match(layout, /\.web-content\s*\{[^}]*color:\s*var\(--color-text-on-dark\)/s);
  assert.match(layout, /\.web-content \.card,\s*\.web-content \.kpi\s*\{[^}]*color:\s*var\(--color-text\)[^}]*--surface-text-muted:\s*var\(--color-text-muted\)/s);
});

test("student and staff report dialogs trap focus, close on Escape, and restore focus", () => {
  assert.match(hook, /event\.key === "Escape"/);
  assert.match(hook, /event\.shiftKey && document\.activeElement === items\[0\]/);
  assert.match(hook, /document\.activeElement === items\.at\(-1\)/);
  assert.match(hook, /previousFocus\.focus\(\)/);
  for (const file of [
    "src/components/reports/StudentReportDialog.jsx",
    "src/components/reports/StaffReportDialog.jsx",
  ]) {
    assert.match(read(file), /useReportDialogAccessibility\(onClose\)/);
    assert.match(read(file), /aria-modal="true"/);
    assert.match(read(file), /event\.target === event\.currentTarget/);
    assert.match(read(file), /className="sr-actions"/);
  }
});

test("report dialogs keep their body scrollable and adapt report grids on small screens", () => {
  assert.match(css, /\.sr-body\s*\{[^}]*max-height:\s*calc\(100dvh - 2rem\)[^}]*overflow-y:\s*auto[^}]*padding:[^}]*var\(--space-8\)/s);
  assert.match(css, /\.sr-guardian\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.sr-guardian \{ grid-template-columns: repeat\(2,/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.sr-guardian \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.sr-table tbody tr \{ background: var\(--color-surface-raised\); \}/);
  assert.match(css, /\.sr-coverage \{[^}]*color: var\(--ink-soft\)[^}]*font-size: 11px/);
});

test("text and UI color token pairs meet their WCAG AA thresholds", () => {
  const pairs = [
    ["--color-text", "--color-surface", 4.5],
    ["--color-text-muted", "--color-surface", 4.5],
    ["--color-text", "--color-surface-raised", 4.5],
    ["--color-text-muted", "--color-surface-raised", 4.5],
    ["--color-text-on-dark", "--color-background", 4.5],
    ["--color-text-muted-on-dark", "--color-background", 4.5],
    ["--color-text-on-dark", "--color-primary", 4.5],
    ["--color-text-muted-on-dark", "--color-primary", 4.5],
    ["--color-success", "--color-surface", 4.5],
    ["--color-warning", "--color-surface", 4.5],
    ["--color-danger", "--color-surface", 4.5],
    ["--color-focus", "--color-surface", 3],
    ["--color-focus-on-dark", "--color-background", 3],
  ];
  for (const [foreground, background, threshold] of pairs) {
    const ratio = contrastRatio(colorToken(foreground), colorToken(background));
    assert.ok(
      ratio >= threshold,
      `${foreground} on ${background} has ${ratio.toFixed(2)}:1 (requires ${threshold}:1)`
    );
  }
});
