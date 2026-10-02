import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/pages/admin/AdminRoutes.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/pages/admin/AdminRoutes.module.css", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

test("Commute page uses responsive module styles and keyboard-operable route rows", () => {
  assert.match(component, /AdminRoutes\.module\.css/);
  assert.match(component, /className=\{styles\.page\}/);
  assert.doesNotMatch(component, /style=\{\{/);
  assert.match(component, /<button[^>]*className=\{`listitem \$\{styles\.routeItem\}`\}[^>]*onClick=\{\(\) => setSelected\(r\)\}/);
  assert.match(component, /<BusFront size=\{18\} aria-hidden="true" \/>/);
  assert.match(styles, /@media \(max-width:\s*48rem\)/);
  assert.match(styles, /color:\s*var\(--color-text-muted\)/);
  assert.doesNotMatch(globalStyles, /\.route-assignment\b/);
});
