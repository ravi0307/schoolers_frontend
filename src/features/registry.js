// Single source of truth for per-school feature keys on the frontend.
// Keys must match the backend FeatureFlags schema
// (services/schools_service/schemas.py) — no second registry, no invented keys.
export const FEATURES = [
  { key: "route_enabled", label: "Route" },
  { key: "website_enabled", label: "School Website" },
  { key: "library_enabled", label: "Library Management" },
  { key: "fees_enabled", label: "Fee Management" },
  { key: "salary_enabled", label: "Salary Management" },
  { key: "examinations_enabled", label: "Examinations" },
];

// Which admin nav destinations each feature controls. A value is one feature
// key or an array of keys: the destination is visible when ANY of them is
// enabled for the school. Paths not listed here are always available
// (availability is still role-checked by ProtectedRoute and enforced by the
// backend on each request).
export const NAV_FEATURES = {
  "/admin/routes": "route_enabled",
  "/admin/trips": "route_enabled",
  "/admin/build-your-site": "website_enabled",
  "/admin/accounts": ["fees_enabled", "salary_enabled"],
  "/admin/academic-calendar": "examinations_enabled",
  "/admin/exam-settings": "examinations_enabled",
  "/admin/examinations": "examinations_enabled",
  "/admin/marks-entry": "examinations_enabled",
  "/admin/exam-results": "examinations_enabled",
  "/admin/promotion": "examinations_enabled",
};

export function isFeatureEnabled(features, requirement) {
  if (!requirement) return true;
  const keys = Array.isArray(requirement) ? requirement : [requirement];
  if (!features) return false; // config not loaded yet: fail closed
  return keys.some((key) => features[key] === true);
}

export function filterNavByFeatures(navItems, features) {
  const visible = [];
  for (const item of navItems) {
    if (item.items) {
      const children = item.items.filter((child) =>
        isFeatureEnabled(features, NAV_FEATURES[child.to])
      );
      // Drop groups that would render empty.
      if (children.length) visible.push({ ...item, items: children });
    } else if (isFeatureEnabled(features, NAV_FEATURES[item.to])) {
      visible.push(item);
    }
  }
  return visible;
}
