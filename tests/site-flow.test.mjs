import assert from "node:assert/strict";
import test from "node:test";
import { schoolSiteSlug, publicSitePath } from "../src/utils/siteFlow.js";

test("builds a url-safe slug from a school name", () => {
  assert.equal(schoolSiteSlug("Homeroom schoolers School"), "homeroom-schoolers-school");
  assert.equal(schoolSiteSlug("Sunrise Public School"), "sunrise-public-school");
  assert.equal(schoolSiteSlug("St. Mary's High School"), "st-mary-s-high-school");
});

test("collapses separators and trims edge hyphens", () => {
  assert.equal(schoolSiteSlug("  Multiple   Spaces  "), "multiple-spaces");
  assert.equal(schoolSiteSlug("--Leading and trailing--"), "leading-and-trailing");
  assert.equal(schoolSiteSlug("Math & Science / Arts"), "math-science-arts");
});

test("handles empty and missing names", () => {
  assert.equal(schoolSiteSlug(""), "");
  assert.equal(schoolSiteSlug(null), "");
  assert.equal(schoolSiteSlug(undefined), "");
});

test("builds the public website path for a school", () => {
  assert.equal(publicSitePath("Homeroom schoolers School"), "/website/homeroom-schoolers-school");
  assert.equal(publicSitePath(""), "/website/");
});
