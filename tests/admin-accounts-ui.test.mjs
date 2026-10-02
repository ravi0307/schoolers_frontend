import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/pages/admin/AdminAccounts.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/pages/admin/AdminAccounts.module.css", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

function tokenValue(name) {
  const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `missing color token ${name}`);
  return match[1];
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("accounts page uses the shared page header, light cards, and responsive controls", () => {
  assert.match(component, /AdminAccounts\.module\.css/);
  assert.match(component, /className=\{styles\.accounts\}/);
  assert.match(component, /<PageHeader/);
  assert.match(component, /<details className=\{styles\.help\}>/);
  assert.match(component, /<Card as="section"/);
  assert.match(component, /<FormField id=/);
  assert.match(component, /<DataTable label=/);
  assert.match(component, /<EmptyState>/);
  assert.doesNotMatch(component, /style=\{\{/);
  assert.doesNotMatch(component, /style\.[a-zA-Z]+\s*=/);
  assert.match(styles, /\.accounts\s*\{/);
  assert.match(styles, /\.accounts\s*\{[\s\S]*--ink-soft:\s*var\(--color-text-muted-on-dark\)/);
  assert.match(styles, /\.sheetCard\s*\{[\s\S]*color:\s*var\(--color-text\)/);
  assert.match(styles, /\.sheetCard\s*\{[\s\S]*--ink-soft:\s*var\(--color-text-muted\)/);
  assert.match(styles, /\.sheetCard\s*\{[\s\S]*--surface-muted-text:\s*var\(--color-text-muted\)/);
  assert.match(component, /<div className=\{styles\.headerControls\}>/);
  assert.match(styles, /\.headerControls\s*\{[\s\S]*display:\s*flex/);
  assert.doesNotMatch(component, /styles\.toolbar/);
  assert.match(styles, /\.tableScroll\s*\{[\s\S]*overflow:\s*auto/);
  assert.match(styles, /@media \(max-width:\s*48rem\)/);
  assert.match(styles, /--account-control-height:\s*2\.25rem/);
  assert.match(styles, /--account-row-height:\s*2\.25rem/);
  assert.match(styles, /@media \(max-width:\s*64rem\)/);
  assert.match(styles, /@media \(max-width:\s*40rem\)/);
  assert.match(styles, /@media \(pointer:\s*coarse\)/);
  assert.match(styles, /@media \(max-width:\s*48rem\)\s*\{[\s\S]*\.sheetCard \.table tbody tr\s*\{[\s\S]*display:\s*grid/);
  assert.doesNotMatch(styles, /(?:^|\s)\d+px\b/);
  assert.doesNotMatch(styles, /!important|#[0-9a-fA-F]{3,8}/);
  assert.doesNotMatch(globalStyles, /\.acct-(?:table|sticky|person|empty|amount|controls|search|sort|vertical)\b/);
});

test("Accounts text token pairs meet WCAG AA contrast", () => {
  const lightSurfaces = ["--color-surface", "--color-surface-raised"];
  const lightText = [
    "--color-text",
    "--color-text-muted",
    "--color-primary",
    "--color-success",
    "--color-warning",
    "--color-danger",
  ];
  for (const foreground of lightText) {
    for (const background of lightSurfaces) {
      const ratio = contrast(tokenValue(foreground), tokenValue(background));
      assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
  for (const foreground of ["--color-text-on-dark", "--color-text-muted-on-dark"]) {
    const ratio = contrast(tokenValue(foreground), tokenValue("--color-background"));
    assert.ok(ratio >= 4.5, `${foreground} on --color-background is ${ratio.toFixed(2)}:1`);
  }
});

test("Accounts tables group months and expose mobile cell labels", () => {
  assert.match(component, /scope="colgroup" colSpan=\{withRemarks \? 2 : 1\}/);
  assert.match(component, /className=\{styles\.numericHeader\}>Amount/);
  assert.match(component, /data-label=\{`\$\{MONTH_LABELS\[month\.slice\(-2\)\] \|\| month\}:`\}/);
  assert.match(component, /data-label=\{`\$\{MONTH_LABELS\[month\.slice\(-2\)\] \|\| month\}: Remark`\}/);
  assert.match(component, /rowSpan=\{2\} scope="col"/);
});

test("Accounts desktop rows are single-line and capped at 40px", () => {
  assert.match(styles, /--account-row-height:\s*2\.25rem/);
  assert.match(styles, /\.person\s*\{[\s\S]*white-space:\s*nowrap/);
  assert.match(styles, /\.amount\s*\{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(styles, /\.sheetCard \.table tbody tr\s*\{[\s\S]*height:\s*var\(--account-row-height\)/);
  assert.doesNotMatch(styles, /nth-child\(even\)|background:\s*var\(--color-neutral-50\)/);
  assert.match(component, /title=\{\[name, secondaryOf\(row\)\]\.filter\(Boolean\)\.join\(" · "\)\}/);
  assert.match(component, /function shortPaidDate\(value\)/);
});

test("staff/student counts stay in the left summary and are not duplicated in the right count", () => {
  assert.match(component, /<span>Staff<\/span><strong>\{numberFormatter\.format\(salarySheet\?\.rows\?\.length \|\| 0\)\}<\/strong>/);
  assert.match(component, /<span>Students<\/span><strong>\{numberFormatter\.format\(feeSheet\?\.rows\?\.length \|\| 0\)\}<\/strong>/);
  assert.match(component, /peopleCountLabel\(\{ matched: rows\.length, total: allRows\.length, singular, plural: label \}\)/);
  assert.match(component, /<span className=\{styles\.count\}>/);
  assert.match(styles, /\.headerControls\s*\{[\s\S]*display:\s*grid/);
  assert.match(styles, /grid-template-columns:[\s\S]*minmax\(9rem, 11rem\)[\s\S]*minmax\(7rem, auto\)[\s\S]*minmax\(5rem, auto\)/);
  assert.match(styles, /\.headerControls > :global\(div\) select\s*\{[\s\S]*width:\s*100%/);
  assert.match(styles, /@media \(max-width:\s*40rem\)\s*\{[\s\S]*\.headerControls\s*\{[\s\S]*display:\s*flex/);
});
