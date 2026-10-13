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
  assert.match(component, /<table[\s>]/);  // Stops table still exists
  assert.match(component, /<thead[\s>]/);  // Route list now has table header
  assert.match(component, /<tbody[\s>]/);  // Route list now has table body
  assert.match(component, /data-table/);  // Uses global table styles
  assert.match(component, /table-scroll/); // Scroll wrapper
  assert.match(component, /table-card/);  // Card wrapper
  assert.match(styles, /@media \(max-width:\s*48rem\)/);
  assert.match(styles, /\.vehicleActions\s*\{/);
  assert.match(styles, /\.studentItem\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /color:\s*var\(--color-text-muted\)/);
  assert.match(styles, /\.tableActions\s*\{/);  // New table actions style
  assert.doesNotMatch(globalStyles, /\.route-assignment\b/);
});

test("Add Student form offers a labelled stop-point dropdown with validation", () => {
  const transport = readFileSync(new URL("../src/api/transport.js", import.meta.url), "utf8");
  assert.match(component, /<label>Stop point<\/label>/);
  assert.match(component, /selectedStopId/);
  assert.match(component, /setSelectedStopId/);
  assert.match(component, /stopOptionLabel/);
  assert.match(component, /pickup_stop_id/);
  assert.match(component, /drop_stop_id/);
  assert.match(component, /Select a stop point for the student/);
  assert.match(component, /Add a stop point to this route first/);
  assert.match(component, /resetStudentForm/);
  assert.match(component, /No stop points yet/);
  assert.match(transport, /addStudentToRoute = \(routeId, studentId, data\)/);
  assert.match(transport, /client\.post\(`\/routes\/\$\{routeId\}\/students\/\$\{studentId\}`, data\)/);
  assert.match(styles, /\.routeRow\s*\{[^}]*cursor:\s*pointer/s);
  assert.match(styles, /\.formHint\s*\{/);
});
