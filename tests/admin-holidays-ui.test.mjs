import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminHolidays.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminHolidays.module.css", "utf8");
const globalStyles = fs.readFileSync("src/styles/global.css", "utf8");

test("holiday page owns its responsive tokenized styles in a CSS module", () => {
  assert.match(page, /import styles from "\.\/AdminHolidays\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.doesNotMatch(page, /className="holiday-(?:form-row|table|actions-head|days-badge|span-note|editing|edit-input|edit-dates)/);
  assert.match(styles, /color: var\(--color-text\)/);
  assert.match(styles, /@media \(max-width: 42rem\)/);
  assert.doesNotMatch(styles, /#[0-9a-fA-F]{3,8}\b|!important|\b\d+px\b/);
  assert.doesNotMatch(globalStyles, /\.holiday-(?:form-row|table|actions-head|days-badge|span-note|editing|edit-input|edit-dates)/);
});

test("holiday form opens from a header action and closes on cancel or save", () => {
  assert.match(page, /<PageHeader\b/);
  assert.match(page, /action=\{!showForm && \(/);
  assert.match(page, /\+ Add Holiday/);
  assert.match(page, /setShowForm\(true\)/);
  assert.match(page, /setShowForm\(false\)/);
  assert.match(page, />\s*Cancel\s*<\/button>/);
  // The form sits directly below the header, ahead of the list.
  assert.match(page, /\/>\s*\{showForm && \(\s*<form/);
});

test("opening the add form starts blank instead of inheriting a row edit", () => {
  // The draft doubles as the in-place row-edit draft, so opening or
  // closing the add form must reset it.
  assert.match(page, /function openForm\(\) \{[\s\S]*?setEditingId\(null\)[\s\S]*?setDraft\(EMPTY_DRAFT\)[\s\S]*?setShowForm\(true\)/);
  assert.match(page, /function closeForm\(\) \{[\s\S]*?setDraft\(EMPTY_DRAFT\)[\s\S]*?setShowForm\(false\)/);
});

test("holiday rows align with centered cells and non-wrapping actions", () => {
  assert.match(styles, /\.table td\s*\{[^}]*vertical-align:\s*middle/s);
  assert.match(styles, /\.table :global\(\.table-actions \.btn\)\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.table :global\(\.table-actions \.btn\)\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(styles, /\.table :global\(\.table-actions\)\s*\{[^}]*flex-wrap:\s*nowrap/s);
});
test("holiday list columns are labelled and consistently sized", () => {
  assert.match(page, /<th>Occasion<\/th>/);
  assert.match(page, /<th>Date<\/th>/);
  assert.match(page, /<th className=\{styles\.actionsHead\}>Actions<\/th>/);
  assert.match(styles, /\.actionsHead\s*\{[^}]*width:\s*1%/);
  assert.match(styles, /\.actionsHead\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.table th:first-child,\s*\.table td:first-child\s*\{[^}]*min-width:\s*11\.25rem/s);
});
