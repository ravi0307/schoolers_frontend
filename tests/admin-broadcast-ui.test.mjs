import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminBroadcast.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminBroadcast.module.css", "utf8");

test("admin broadcast page uses tokenized light surfaces and a responsive message layout", () => {
  assert.match(page, /import styles from "\.\/AdminBroadcast\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.doesNotMatch(page, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(page, /className=\{`card \$\{styles\.broadcastList\}`\}/);
  assert.match(styles, /background: var\(--color-surface-raised\);\s*color: var\(--color-text\)/);
  assert.match(styles, /@media \(max-width: 48rem\)/);
});
