import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/pages/admin/AdminRoutes.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/pages/admin/AdminRoutes.module.css", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

test("Commute page uses responsive module styles and keyboard-operable route rows", () => {
  assert.match(component, /AdminRoutes\.module\.css/);
  assert.match(component, /className=\{styles\.page\}/);
  assert.match(component, /<PageHeader\b/);
  assert.match(component, /styles\.vehicleActions/);
  assert.match(component, /styles\.studentItem/);
  assert.doesNotMatch(component, /style=\{\{/);
  assert.match(component, /<table>/);  // Stops table still exists
  assert.match(component, /<thead>/);  // Route list now has table header
  assert.match(component, /<tbody>/);  // Route list now has table body
  assert.match(component, /className="data-table"/);  // Uses global table styles
  assert.match(component, /className="table-scroll"/); // Scroll wrapper
  assert.match(component, /className="table-card"/);  // Card wrapper
  assert.match(styles, /@media \(max-width:\s*48rem\)/);
  assert.match(styles, /\.vehicleActions\s*\{/);
  assert.match(styles, /\.studentItem\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /color:\s*var\(--color-text-muted\)/);
  assert.match(styles, /\.tableActions\s*\{/);  // New table actions style
  assert.doesNotMatch(globalStyles, /\.route-assignment\b/);
});
