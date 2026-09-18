export function schoolSiteSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function publicSitePath(name) {
  return `/website/${schoolSiteSlug(name)}`;
}