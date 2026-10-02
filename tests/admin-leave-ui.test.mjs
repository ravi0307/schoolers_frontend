import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminLeave.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminLeave.module.css", "utf8");

test("leave actions use responsive styles and accessible names", () => {
  assert.match(page, /import styles from "\.\/AdminLeave\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(page, /aria-label=\{`Approve leave request from/);
  assert.match(page, /aria-label=\{`Reject leave request from/);
  assert.match(styles, /var\(--space-2\)/);
  assert.match(styles, /@media \(max-width: 42rem\)/);
});
