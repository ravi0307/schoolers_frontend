// Feature-access wiring: Master Admin controls per-school features; the
// School Admin UI shows/blocks only what is enabled for their school.
// Root-cause regression coverage for: shared registry (single source of
// truth), school-admin config fetch, feature-filtered sidebar, feature
// route guards, and persistence-safe master toggles.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FEATURES,
  NAV_FEATURES,
  isFeatureEnabled,
  filterNavByFeatures,
} from "../src/features/registry.js";

const read = (file) => fs.readFileSync(file, "utf8");
const BACKEND_FLAGS = path.resolve(
  "../schoolers 3/services/schools_service/schemas.py"
);

const EXPECTED_KEYS = [
  "route_enabled",
  "website_enabled",
  "library_enabled",
  "fees_enabled",
  "salary_enabled",
  "examinations_enabled",
];

test("registry exposes exactly the backend-supported feature keys", () => {
  assert.deepEqual(
    FEATURES.map((f) => f.key),
    EXPECTED_KEYS
  );
  for (const f of FEATURES) {
    assert.ok(f.label && f.label.length > 0, `${f.key} needs a label`);
  }
  // No invented keys anywhere in the nav map.
  for (const [route, requirement] of Object.entries(NAV_FEATURES)) {
    const keys = Array.isArray(requirement) ? requirement : [requirement];
    for (const key of keys) {
      assert.ok(
        EXPECTED_KEYS.includes(key),
        `${route} maps to unknown feature ${key}`
      );
    }
  }
});

test("frontend keys match the backend FeatureFlags schema (cross-repo contract)", (t) => {
  if (!fs.existsSync(BACKEND_FLAGS)) {
    t.skip("backend repo not present next to the frontend");
    return;
  }
  const src = read(BACKEND_FLAGS);
  const block = src.split("class FeatureFlags")[1].split("class SchoolFeatures")[0];
  const backendKeys = [...block.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]);
  assert.deepEqual(backendKeys.sort(), [...EXPECTED_KEYS].sort());
});

test("admin nav gating covers the feature-backed destinations", () => {
  const required = [
    "/admin/routes",
    "/admin/trips",
    "/admin/build-your-site",
    "/admin/accounts",
    "/admin/academic-calendar",
    "/admin/exam-settings",
    "/admin/examinations",
    "/admin/marks-entry",
    "/admin/exam-results",
    "/admin/promotion",
  ];
  for (const route of required) {
    assert.ok(NAV_FEATURES[route], `${route} must declare a feature`);
  }
});

test("feature evaluation: enabled AND authorized rule, fail-closed on unknown config", () => {
  const on = { route_enabled: true, fees_enabled: false };
  assert.equal(isFeatureEnabled(on, "route_enabled"), true);
  assert.equal(isFeatureEnabled(on, "fees_enabled"), false);
  assert.equal(isFeatureEnabled(on, ["fees_enabled", "route_enabled"]), true, "any-of");
  assert.equal(isFeatureEnabled(on, undefined), true, "ungated always allowed");
  assert.equal(isFeatureEnabled(null, "route_enabled"), false, "unknown config fails closed");
  assert.equal(isFeatureEnabled(undefined, ["fees_enabled", "salary_enabled"]), false);
});

test("sidebar filtering hides disabled features and drops empty groups", () => {
  const nav = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/routes", label: "Commute" },
    { to: "/admin/accounts", label: "Accounts" },
    {
      label: "Academics",
      items: [
        { to: "/admin/examinations", label: "Examinations" },
        { to: "/admin/promotion", label: "Promotion" },
      ],
    },
    { to: "/admin/build-your-site", label: "Build Your Site" },
  ];
  const features = { examinations_enabled: true, route_enabled: false };

  const visible = filterNavByFeatures(nav, features);
  // Dashboard has no feature; Commute (off) and Build Your Site (off) drop;
  // Accounts drops because both of its keys are off; Academics stays.
  assert.deepEqual(visible.map((i) => i.label), ["Dashboard", "Academics"]);
  assert.equal(visible.some((i) => i.to === "/admin/routes"), false, "disabled hidden");
  assert.equal(visible.some((i) => i.to === "/admin/accounts"), false, "both flags off");
  assert.equal(visible.some((i) => i.to === "/admin/build-your-site"), false);

  const academics = visible.find((i) => i.label === "Academics");
  assert.equal(academics.items.length, 2);

  // Group with every child disabled disappears entirely (no empty groups).
  const none = filterNavByFeatures(nav, {});
  assert.equal(none.some((i) => i.label === "Academics"), false, "empty group dropped");

  // Accounts shows when EITHER of its keys is on.
  const withFees = filterNavByFeatures(nav, { fees_enabled: true });
  assert.ok(withFees.some((i) => i.to === "/admin/accounts"));

  // Unknown config: gated entries stay hidden (fail closed), flat always-on nav stays.
  const unknown = filterNavByFeatures(nav, null);
  assert.deepEqual(
    unknown.map((i) => i.label ?? i.to),
    ["Dashboard"]
  );
});

test("school admin config fetch exists and reads the dedicated endpoint", () => {
  const api = read("src/api/schools.js");
  assert.match(api, /export const getFeatures = \(id\) => client\.get\(`\/schools\/\$\{id\}\/features`\)/);
  const ctx = read("src/context/FeatureContext.jsx");
  assert.match(ctx, /getFeatures\(schoolId\)/);
  assert.match(
    ctx,
    /\["admin", "subadmin"\]\.includes\(user\?\.role\) \? user\.schoolId : null/,
    "only the school-admin tier fetches feature config"
  );
  // Fail closed on error: never surface gated features from an unknown config.
  assert.match(ctx, /setFeatures\(null\)/);
});

test("master feature page uses the shared registry and never claims un-persisted success", () => {
  const page = read("src/pages/master/MasterSchoolDetail.jsx");
  assert.match(page, /import \{ FEATURES \} from "\.\.\/\.\.\/features\/registry"/);
  assert.doesNotMatch(page, /const FEATURES = \[/, "registry must be the single source");
  // In-flight guard + persistence-first feedback.
  assert.match(page, /savingFeature/);
  assert.match(page, /if \(savingFeature\) return/);
  assert.match(page, /await schoolsApi\.updateFeatures\(schoolId, \{ \[key\]: !current \}\)/);
  // Error path toasts the API failure instead of pretending success.
  assert.match(page, /catch \(err\) \{\s*\/\/ Never claim success when persistence failed[\s\S]*?toast\(apiErrorMessage\(err\)\)/);
});

test("sidebar and routes are feature-driven for school admins", () => {
  const shell = read("src/components/layout/AdminShell.jsx");
  assert.match(shell, /filterNavByFeatures\(NAV, features\)/);
  assert.match(shell, /useFeatures\(\)/);

  const guard = read("src/components/layout/FeatureRoute.jsx");
  assert.match(
    guard,
    /!\["admin", "subadmin"\]\.includes\(user\?\.role\)/,
    "roles outside the school-admin tier pass through (backend enforces)"
  );
  assert.match(guard, /to="\/admin\/dashboard"/);
  assert.match(guard, /accessDeniedFeature: true/);

  const app = read("src/App.jsx");
  const gated = [
    ["routes", "route_enabled", "AdminRoutes"],
    ["trips", "route_enabled", "AdminTripHistory"],
    ["build-your-site", "website_enabled", "AdminWebsiteBuilder"],
    ["academic-calendar", "examinations_enabled", "AdminAcademicCalendar"],
    ["exam-settings", "examinations_enabled", "AdminExamSettings"],
    ["examinations", "examinations_enabled", "AdminExaminations"],
    ["marks-entry", "examinations_enabled", "AdminMarksEntry"],
    ["promotion", "examinations_enabled", "AdminPromotion"],
    ["exam-results", "examinations_enabled", "AdminExamResults"],
  ];
  for (const [route, feature, page] of gated) {
    assert.match(
      app,
      new RegExp(
        `path="${route}" element=\\{<FeatureRoute feature="${feature}"><${page} \\/><\\/FeatureRoute>\\}`
      ),
      `${route} must be gated on ${feature}`
    );
  }
  assert.match(
    app,
    /path="accounts" element=\{<FeatureRoute feature=\{\["fees_enabled", "salary_enabled"\]\}><AdminAccounts \/><\/FeatureRoute>\}/
  );
  // Provider wraps the app so sidebar + guards share one config source.
  assert.match(app, /<FeatureProvider>/);
});

test("dashboard explains a feature-blocked navigation attempt", () => {
  const src = read("src/pages/admin/AdminDashboard.jsx");
  assert.match(src, /accessDeniedFeature/);
  assert.match(src, /not enabled for this school/);
});
