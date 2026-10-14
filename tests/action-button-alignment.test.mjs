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

test("primary Add actions live in the page header action slot", () => {
  const headerPages = {
    "src/pages/staff/StaffGallery.jsx": "Add to Gallery",
    "src/pages/teacher/TeacherGallery.jsx": "Add to Gallery",
    "src/pages/admin/AdminGallery.jsx": "Add to Gallery",
    "src/pages/admin/AdminBroadcast.jsx": "New Broadcast",
    "src/pages/teacher/TeacherBroadcast.jsx": "New Broadcast",
    "src/pages/admin/AdminStudents.jsx": "Add Student",
    "src/pages/admin/AdminTeachers.jsx": "Add Teacher",
    "src/pages/admin/AdminClasses.jsx": "Add Class",
    "src/pages/admin/AdminSubjects.jsx": "Add Subject",
    "src/pages/admin/AdminStaff.jsx": "Add Staff",
    "src/pages/master/MasterSchools.jsx": "Add School",
  };
  for (const [file, label] of Object.entries(headerPages)) {
    const src = read(file);
    assert.match(src, /<PageHeader\b/, `${file} should use the shared page header`);
    assert.match(src, /action=\{/, `${file} should place its primary action in the header`);
    assert.ok(src.includes(label), `${file} should keep its ${label} action`);
  }
});

test("moved header actions keep content-flow spacing out", () => {
  // The old content-flow toggles carried layout margins that would offset
  // buttons placed inside the header action slot.
  for (const file of [
    "src/pages/admin/AdminStudents.jsx",
    "src/pages/admin/AdminTeachers.jsx",
    "src/pages/admin/AdminClasses.jsx",
    "src/pages/admin/AdminSubjects.jsx",
    "src/pages/admin/AdminStaff.jsx",
    "src/pages/master/MasterSchools.jsx",
  ]) {
    assert.doesNotMatch(read(file), /btn gold \$\{styles\.formCard\}/, `${file} should not use content-flow spacing in the header`);
  }
  assert.doesNotMatch(read("src/pages/admin/AdminTeachers.jsx"), /<button[^>]*marginTop[^>]*\+ Add Teacher/);
  assert.doesNotMatch(read("src/pages/master/MasterSchools.jsx"), /<button[^>]*marginTop[^>]*\+ Add School/);
});

test("gallery upload toggle is controlled from the page header", () => {
  const view = read("src/components/gallery/GalleryView.jsx");
  assert.match(view, /formOpenProp \?\? internalFormOpen/);
  assert.match(view, /formOpenProp === undefined/);
  for (const file of [
    "src/pages/staff/StaffGallery.jsx",
    "src/pages/teacher/TeacherGallery.jsx",
    "src/pages/admin/AdminGallery.jsx",
  ]) {
    assert.match(read(file), /formOpen=\{formOpen\}/, `${file} should drive the gallery form state`);
    assert.match(read(file), /onFormOpenChange=\{setFormOpen\}/, `${file} should receive gallery form changes`);
  }
  // The parent gallery stays read-only with no header action.
  const parent = read("src/pages/parent/ParentGallery.jsx");
  assert.doesNotMatch(parent, /action=\{/);
  assert.doesNotMatch(parent, /canUpload/);
});

test("shared page header aligns actions right and stacks on narrow screens", () => {
  const css = read("src/components/ui/PageHeader.module.css");
  assert.match(css, /\.header\s*\{[^}]*justify-content:\s*space-between/s);
  assert.match(css, /\.header\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /@media\s*\(max-width:\s*40rem\)[\s\S]*?\.header\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.action\s*\{[^}]*min-width:\s*0/s);
});
