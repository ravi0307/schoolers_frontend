// Live-browser E2E for the Academics sidebar group: collapsed by default,
// expands on header click, six entries in order, active route highlighted,
// navigation/refresh/direct-URL behavior. Run against a local vite dev
// server plus a seeded schoolers stack:
//   E2E_BASE=http://localhost:5174 E2E_ADMIN_PASS=... node tests/e2e-academics-sidebar.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE ?? "http://localhost:5174";
const SHOTS = process.env.E2E_SHOTS ?? path.join(os.tmpdir(), "schoolers-e2e-shots");

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
};
const CREDS = {
  admin: [process.env.E2E_ADMIN_USER ?? "blue.horizon", need("E2E_ADMIN_PASS")],
};

const LABELS = [
  ["Academic Calendar", "/admin/academic-calendar"],
  ["Exam Settings", "/admin/exam-settings"],
  ["Examinations", "/admin/examinations"],
  ["Marks Entry", "/admin/marks-entry"],
  ["Exam Results", "/admin/exam-results"],
  ["Promotion", "/admin/promotion"],
];

const waitActive = (page, href) =>
  page
    .waitForFunction(
      (h) => document.querySelector(`#portal-sidebar nav a[href="${h}"]`)?.className?.includes("active"),
      href,
      { timeout: 5000 }
    )
    .then(() => true)
    .catch(() => false);

test("academics sidebar group: collapsed default, click-to-expand, active route", async (t) => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1500 } });
  t.after(() => browser.close());
  page.on("pageerror", (e) => t.diagnostic(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("e.g. admin1").fill(CREDS.admin[0]);
  await page.getByPlaceholder("••••••••").fill(CREDS.admin[1]);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 12000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);

  const toggle = page.locator('#portal-sidebar nav button[aria-controls="nav-group-academics"]');
  const examsLink = page.locator('#portal-sidebar nav a[href="/admin/examinations"]');

  // Collapsed by default, even on an Academics child route.
  await page.goto(`${BASE}/admin/examinations`);
  await page.waitForSelector("#portal-sidebar nav", { timeout: 10000 });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false", "collapsed on load");
  assert.equal(await examsLink.count(), 0, "children hidden while collapsed");
  await page.screenshot({
    path: path.join(SHOTS, "academics-collapsed.png"),
    clip: { x: 0, y: 780, width: 292, height: 120 },
  });

  // Header click expands; six entries in order; active child highlighted.
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true", "expanded after click");
  const navText = await page.locator("#portal-sidebar nav").innerText();
  let cursor = -1;
  for (const [label] of LABELS) {
    const idx = navText.indexOf(label);
    assert.ok(idx > cursor, `${label} in order (got ${idx} after ${cursor})`);
    cursor = idx;
  }
  assert.equal(await waitActive(page, "/admin/examinations"), true, "Examinations active");

  // Child navigation moves the highlight; toggle collapses and re-expands.
  await page.locator('#portal-sidebar nav a[href="/admin/academic-calendar"]').click();
  await page.waitForURL("**/admin/academic-calendar", { timeout: 8000 });
  assert.equal(await waitActive(page, "/admin/academic-calendar"), true, "Academic Calendar active");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false", "click collapses");
  await toggle.click();

  for (const [, path] of LABELS.slice(1)) {
    await page.locator(`#portal-sidebar nav a[href="${path}"]`).click();
    await page.waitForURL(`**${path}`, { timeout: 8000 });
    assert.equal(page.url().endsWith(path), true, `navigated to ${path}`);
    assert.equal(await waitActive(page, path), true, `active on ${path}`);
  }

  // Refresh and direct URLs start collapsed; expand shows the right active.
  // Land on Examinations first so the refresh assertion targets a known route.
  await page.goto(`${BASE}/admin/examinations`);
  await page.waitForSelector("#portal-sidebar nav", { timeout: 10000 });
  await page.reload();
  await page.waitForSelector("#portal-sidebar nav", { timeout: 10000 });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false", "collapsed after refresh");
  await toggle.click();
  assert.equal(await waitActive(page, "/admin/examinations"), true, "active after refresh+expand");

  await page.goto(`${BASE}/admin/exam-results`);
  await page.waitForSelector("#portal-sidebar nav", { timeout: 10000 });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false", "collapsed on direct URL");
  await toggle.click();
  assert.equal(await waitActive(page, "/admin/exam-results"), true, "active on direct URL+expand");
  await page.screenshot({
    path: path.join(SHOTS, "academics-expanded.png"),
    clip: { x: 0, y: 798, width: 292, height: 360 },
  });
});
