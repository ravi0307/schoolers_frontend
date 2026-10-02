import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminReports.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminReports.module.css", "utf8");

test("reporting page list panels use light-surface tokens and stable empty arrays", () => {
  assert.match(page, /import styles from "\.\/AdminReports\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(page, /const EMPTY_LIST = \[\]/);
  assert.match(page, /students\.data \|\| EMPTY_LIST/);
  assert.match(page, /staff\.data \|\| EMPTY_LIST/);
  assert.match(styles, /var\(--space-8\)/);
});
