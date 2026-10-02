import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminDashboard.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminDashboard.module.css", "utf8");

test("dashboard quick cards use a light surface and tokenized responsive styles", () => {
  assert.match(page, /import styles from "\.\/AdminDashboard\.module\.css"/);
  assert.match(page, /className=\{`card \$\{styles\.quickCard\}`\}/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.doesNotMatch(page, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(styles, /color: var\(--color-text\)/);
  assert.match(styles, /var\(--surface-text-muted, var\(--color-text-muted\)\)/);
  assert.match(styles, /@media \(max-width: 42rem\)/);
});
