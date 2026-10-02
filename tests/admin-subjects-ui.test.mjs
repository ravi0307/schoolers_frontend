import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminSubjects.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminSubjects.module.css", "utf8");

test("subjects page uses responsive tokenized CSS without inline styles or hard-coded colors", () => {
  assert.match(page, /import styles from "\.\/AdminSubjects\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.doesNotMatch(page, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(styles, /var\(--(?:color|space|font)-/);
  assert.match(styles, /@media \(max-width: 42rem\)/);
});
