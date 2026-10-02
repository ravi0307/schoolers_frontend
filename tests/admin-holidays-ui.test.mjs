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
