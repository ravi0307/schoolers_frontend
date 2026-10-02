import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/pages/admin/AdminAccounts.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/pages/admin/AdminAccounts.module.css", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

test("accounts page scopes its responsive ledger styles and uses light-surface tokens", () => {
  assert.match(component, /AdminAccounts\.module\.css/);
  assert.match(component, /className=\{styles\.accounts\}/);
  assert.doesNotMatch(component, /style=\{\{/);
  assert.doesNotMatch(component, /style\.[a-zA-Z]+\s*=/);
  assert.match(styles, /\.accounts\s*\{/);
  assert.match(styles, /color:\s*var\(--color-text-on-dark\)/);
  assert.match(styles, /--ink-soft:\s*var\(--color-text-muted-on-dark\)/);
  assert.match(styles, /--color-text-muted/);
  assert.match(styles, /acct-vertical[\s\S]*overflow:\s*auto/);
  assert.match(styles, /@media \(max-width:\s*48rem\)/);
  assert.doesNotMatch(globalStyles, /\.acct-(?:table|sticky|person|empty|amount|controls|search|sort|vertical)\b/);
});
