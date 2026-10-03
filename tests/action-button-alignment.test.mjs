import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared action rows place their buttons at the right edge", () => {
  const globalCss = read("src/styles/global.css");
  for (const selector of [
    ".cta-row",
    ".table-actions",
    ".gallery-form-actions",
    ".image-upload-actions",
    ".add-period-toolbar",
    ".add-period-actions",
    ".confirm-actions",
    ".sr-actions",
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      globalCss,
      new RegExp(`${escaped}\\s*\\{[^}]*justify-content:\\s*flex-end`, "s"),
      `${selector} should right-align its action buttons`
    );
  }
  assert.match(globalCss, /\.web-content > \.btn:not\(\.block\)[\s\S]*?margin-inline-start:\s*auto/);
});

test("shared and responsive page action groups default to right alignment", () => {
  assert.match(read("src/components/ui/FormActions.jsx"), /align = "end"/);
  assert.match(read("src/components/ui/FormActions.module.css"), /\.end\s*\{[^}]*justify-content:\s*flex-end/s);
  assert.match(read("src/pages/admin/AdminStudents.module.css"), /\.studentActions\s*\{[^}]*justify-content:\s*flex-end/s);
  assert.match(read("src/pages/admin/AdminStaff.module.css"), /\.staffActions\s*\{[^}]*justify-content:\s*flex-end/s);
  assert.match(read("src/pages/admin/AdminRoutes.module.css"), /\.back\s*\{[^}]*justify-self:\s*end/s);
});
