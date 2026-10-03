import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

const outputDir = path.join(os.tmpdir(), "schoolers-portal-ui-visuals");
const screenshotWidths = new Set([390, 768, 1440]);
const viewportWidths = [360, 390, 768, 1024, 1440];
const screens = [
  { role: "parent", path: "/parent/home" },
  { role: "parent", path: "/parent/pickdrop" },
  { role: "parent", path: "/parent/attendance" },
  { role: "parent", path: "/parent/timetable" },
  { role: "parent", path: "/parent/marks" },
  { role: "parent", path: "/parent/report" },
  { role: "parent", path: "/parent/leave" },
  { role: "parent", path: "/parent/barter" },
  { role: "parent", path: "/parent/gallery" },
  { role: "parent", path: "/parent/profile" },
  { role: "staff", path: "/staff/broadcast" },
  { role: "staff", path: "/staff/gallery" },
  { role: "staff", path: "/staff/report" },
  { role: "staff", path: "/staff/profile" },
  { role: "teacher", path: "/teacher/dashboard" },
  { role: "teacher", path: "/teacher/attendance" },
  { role: "teacher", path: "/teacher/marks" },
  { role: "teacher", path: "/teacher/timetable" },
  { role: "teacher", path: "/teacher/broadcast" },
  { role: "teacher", path: "/teacher/gallery" },
  { role: "teacher", path: "/teacher/profile" },
];

function fixtureFor(role) {
  return {
    userId: role === "parent" ? 3 : 2,
    role,
    schoolId: 1,
    linkedPersonId: role === "parent" ? 3 : 2,
    username: `${role}-visual-test`,
    name: role === "parent" ? "Ravi Parent" : `Sam ${role}`,
    displayName: role === "parent" ? "Ravi Parent" : `Sam ${role}`,
    schoolName: "Blue Horizon Academy",
  };
}

async function installApiFixtures(context, role) {
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    let body = [];

    if (pathname.endsWith("/auth/me")) {
      body = {
        user_id: role === "parent" ? 3 : 2,
        role,
        username: `${role}-visual-test`,
        display_name: role === "parent" ? "Ravi Parent" : `Sam ${role}`,
        school_name: "Blue Horizon Academy",
        school_logo_url: null,
        linked_person_id: role === "parent" ? 3 : 2,
      };
    } else if (pathname.endsWith("/parents/3/children")) {
      body = [{
        student_id: 10,
        name: "Aarav Sharma",
        admission_no: "BHA-010",
        class_id: 1,
        present_today: true,
      }];
    } else if (pathname.endsWith("/teachers/2/load")) {
      body = [{ class_id: 1, subject_id: 1, teacher_id: 2, is_class_teacher: true }];
    } else if (pathname.endsWith("/reports/staff/me")) {
      body = {
        attendance: { marked_days: 0, present: 0, absent: 0 },
        salary: { window_size: 0, window: [], records: [] },
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function authenticate(context, role) {
  const user = fixtureFor(role);
  await context.addInitScript((sessionUser) => {
    localStorage.setItem("schoolers_access_token", "visual-test-access-token");
    localStorage.setItem("schoolers_user", JSON.stringify(sessionUser));
  }, user);
  await installApiFixtures(context, role);
}

function safeName(value) {
  return value.replaceAll("/", "-").replaceAll(" ", "-");
}

async function contrastViolations(page) {
  return page.evaluate(() => {
    const parseColor = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const blend = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const luminance = ({ r, g, b }) => {
      const linear = [r, g, b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const ratio = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const bodyColor = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const violations = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!textNode.textContent.trim()) continue;
      const element = textNode.parentElement;
      if (!element || !element.getClientRects().length) continue;
      let opacity = 1;
      const ancestors = [];
      for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        opacity *= Number.parseFloat(style.opacity || "1");
        ancestors.push(node);
      }
      if (opacity === 0) continue;
      let background = bodyColor;
      for (const node of ancestors.reverse()) {
        const color = parseColor(getComputedStyle(node).backgroundColor);
        if (color && color.a > 0) background = blend(color, background);
      }
      const foreground = parseColor(getComputedStyle(element).color);
      if (!foreground) continue;
      const visibleForeground = blend({ ...foreground, a: foreground.a * opacity }, background);
      const actual = ratio(visibleForeground, background);
      const style = getComputedStyle(element);
      const large = Number.parseFloat(style.fontSize) >= 24 ||
        (Number.parseFloat(style.fontSize) >= 18.67 && Number.parseInt(style.fontWeight, 10) >= 700);
      const threshold = large ? 3 : 4.5;
      if (actual < threshold) {
        const selector = element.tagName.toLowerCase() +
          (element.id ? `#${element.id}` : "") +
          (element.classList.length ? `.${Array.from(element.classList).join(".")}` : "");
        violations.push(`${selector}: ${actual.toFixed(2)}:1 (< ${threshold}:1), text="${textNode.textContent.trim().slice(0, 60)}"`);
      }
    }
    return violations;
  });
}

test.beforeAll(() => {
  fs.mkdirSync(outputDir, { recursive: true });
});

for (const screen of screens) {
  test(`${screen.role} ${screen.path} fits every target viewport with readable text`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await authenticate(context, screen.role);
    const page = await context.newPage();

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : width === 1440 ? 900 : 844 });
      await page.goto(`${baseURL}${screen.path}`, { waitUntil: "networkidle" });
      await expect(page.locator("#main-content")).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.document <= dimensions.viewport,
        `${screen.path} at ${width}px has document.scrollWidth ${dimensions.document}`
      );

      const violations = await contrastViolations(page);
      assert.deepEqual(violations, [], `${screen.path} at ${width}px has low-contrast text:\n${violations.join("\n")}`);

      if (screenshotWidths.has(width)) {
        await page.screenshot({
          path: path.join(outputDir, `${screen.role}-${safeName(screen.path)}-${width}.png`),
          fullPage: true,
        });
      }
    }

    await context.close();
  });
}

test("the shared navigation drawer traps focus, closes on Escape and returns focus to the hamburger", async ({ browser, baseURL }) => {
  for (const role of ["parent", "staff", "teacher"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await authenticate(context, role);
    const page = await context.newPage();
    const route = role === "parent" ? "/parent/home" : role === "staff" ? "/staff/broadcast" : "/teacher/dashboard";
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });

    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Primary navigation" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await context.close();
  }
});

test("captures side-by-side shared-shell comparisons for the mobile header and portal sidebars", async ({ browser, baseURL }) => {
  const captures = { mobileHeader: [], mobileSidebar: [], desktopSidebar: [] };

  for (const role of ["teacher", "staff", "parent"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await authenticate(context, role);
    const page = await context.newPage();
    const route = role === "parent" ? "/parent/home" : role === "staff" ? "/staff/broadcast" : "/teacher/dashboard";
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    captures.mobileHeader.push({
      role,
      image: await page.locator("header").first().screenshot(),
    });
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    captures.mobileSidebar.push({
      role,
      image: await page.locator("#portal-sidebar").screenshot(),
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    captures.desktopSidebar.push({
      role,
      image: await page.locator("#portal-sidebar").screenshot(),
    });
    await context.close();
  }

  const comparisonPage = await browser.newPage();
  const comparisons = [
    ["mobile-header", captures.mobileHeader, 1200],
    ["mobile-sidebar", captures.mobileSidebar, 1200],
    ["desktop-sidebar", captures.desktopSidebar, 1200],
  ];

  for (const [name, images, width] of comparisons) {
    await comparisonPage.setViewportSize({ width, height: 900 });
    const figures = images.map(({ role, image }) =>
      `<figure><figcaption>${role}</figcaption><img alt="${role}" src="data:image/png;base64,${image.toString("base64")}"></figure>`
    ).join("");
    await comparisonPage.setContent(`
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 16px; font: 16px sans-serif; }
        main { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        figure { margin: 0; min-width: 0; }
        figcaption { margin-bottom: 8px; font-weight: 700; text-transform: capitalize; }
        img { display: block; width: 100%; height: 820px; object-fit: contain; object-position: top center; border: 1px solid currentColor; }
      </style>
      <main>${figures}</main>
    `);
    await comparisonPage.screenshot({
      path: path.join(outputDir, `comparison-${name}.png`),
      fullPage: true,
    });
  }

  await comparisonPage.close();
});
