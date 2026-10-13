import assert from "node:assert/strict";
import { expect, test } from "@playwright/test";
import {
  TARGET_WIDTHS,
  assertNoWrites,
  authenticate,
} from "./dropdown-fixtures.mjs";

const VIEWPORT_HEIGHT = {
  390: 844,
  768: 1024,
  1440: 900,
};

function browserErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function openPage(browser, baseURL, role, width) {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT[width] },
  });
  const api = await authenticate(context, role);
  const page = await context.newPage();
  const errors = browserErrors(page);
  return { context, api, errors, page, baseURL };
}

async function gotoRoute(page, baseURL, route) {
  await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
  await expect(page.locator("#main-content")).toBeVisible();
}

function assertBrowserHealthy(errors, route, width) {
  assert.deepEqual(errors, [], `${route} at ${width}px emitted browser errors`);
}

function assertLightSurface(color, label) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  assert.ok(match, `${label} should have a computed RGB background`);
  const [red, green, blue] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  assert.ok(luminance >= 0.8, `${label} should be a light surface, got ${color}`);
}

async function menuFor(page) {
  const menu = page.getByRole("listbox").last();
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.getAttribute("data-placement")).toMatch(/^(above|below)$/);
  return menu;
}

async function assertMenuGeometryAndContrast(trigger, menu) {
  const [triggerBox, menuBox, triggerStyle, menuStyle] = await Promise.all([
    trigger.boundingBox(),
    menu.boundingBox(),
    trigger.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    }),
    menu.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    }),
  ]);

  assert.ok(triggerBox, "combobox has no bounding box");
  assert.ok(menuBox, "open listbox has no bounding box");
  assert.ok(Math.abs(menuBox.width - triggerBox.width) <= 1.5, "menu width must match trigger width");
  assert.ok(Math.abs(menuBox.x - triggerBox.x) <= 1.5, "menu left edge must match trigger left edge");

  const placement = await menu.getAttribute("data-placement");
  const gap = placement === "above"
    ? triggerBox.y - (menuBox.y + menuBox.height)
    : menuBox.y - (triggerBox.y + triggerBox.height);
  assert.ok(Math.abs(gap - 4) <= 1.5, `menu gap should be 4px, got ${gap}`);

  assertLightSurface(triggerStyle.backgroundColor, "combobox");
  assert.equal(triggerStyle.color, "rgb(20, 44, 59)");
  assert.equal(menuStyle.backgroundColor, "rgb(255, 255, 255)");
  assert.equal(menuStyle.color, "rgb(20, 44, 59)");
}

async function openAndInspect(trigger) {
  await trigger.click();
  const menu = await menuFor(trigger.page());
  await assertMenuGeometryAndContrast(trigger, menu);

  const options = menu.getByRole("option");
  await expect(options).not.toHaveCount(0);
  const selected = menu.getByRole("option", { selected: true });
  await expect(selected).toHaveCount(1);
  const selectedStyle = await selected.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, color: style.color };
  });
  assert.notEqual(selectedStyle.backgroundColor, "rgba(0, 0, 0, 0)");
  assert.equal(selectedStyle.color, "rgb(20, 44, 59)");

  await selected.hover();
  const hoveredBackground = await selected.evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.notEqual(hoveredBackground, "rgb(255, 255, 255)", "hovered/selected option needs a visible light surface");
  return { menu, options, selected };
}

async function chooseFirstDifferentOption(trigger) {
  const { menu, options, selected } = await openAndInspect(trigger);
  const selectedText = (await selected.textContent()).trim();
  let choice = null;
  for (let index = 0; index < await options.count(); index += 1) {
    const candidate = options.nth(index);
    if (await candidate.getAttribute("aria-disabled") === "true") continue;
    if ((await candidate.textContent()).trim() !== selectedText) {
      choice = candidate;
      break;
    }
  }
  assert.ok(choice, "dropdown needs at least two enabled options");
  const label = (await choice.textContent()).trim();
  await choice.hover();
  const optionStyle = await choice.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, color: style.color };
  });
  assert.equal(optionStyle.color, "rgb(20, 44, 59)");
  assert.notEqual(optionStyle.backgroundColor, "rgb(255, 255, 255)");
  await choice.click();
  await expect(menu).toBeHidden();
  await expect(trigger).toContainText(label);
  return label;
}

async function exerciseKeyboardAndDismiss(trigger) {
  await trigger.focus();
  await trigger.press("Enter");
  const menu = await menuFor(trigger.page());
  const before = await trigger.getAttribute("aria-activedescendant");
  await trigger.press("ArrowDown");
  const after = await trigger.getAttribute("aria-activedescendant");
  assert.notEqual(after, before, "ArrowDown should move the active option");
  await expect(menu.locator(`#${after}`)).toBeVisible();
  await trigger.press("Enter");
  await expect(menu).toBeHidden();

  await trigger.press("Enter");
  await expect(menu).toBeVisible();
  await trigger.press("Escape");
  await expect(menu).toBeHidden();

  await trigger.press("Enter");
  await expect(menu).toBeVisible();
  await trigger.page().mouse.click(2, 2);
  await expect(menu).toBeHidden();
}

async function closePage({ context }) {
  await context.close();
}

test("admin broadcast dropdowns open as real portal menus at every target width", async ({ browser, baseURL }) => {
  for (const width of TARGET_WIDTHS) {
    const session = await openPage(browser, baseURL, "admin", width);
    try {
      await gotoRoute(session.page, baseURL, "/admin/broadcast");
      const filter = session.page.getByRole("combobox", { name: "Filter by audience" });
      await expect(filter).toBeVisible();
      await chooseFirstDifferentOption(filter);
      await exerciseKeyboardAndDismiss(filter);

      await session.page.getByRole("button", { name: /New Broadcast/ }).click();
      const audience = session.page.getByRole("combobox", { name: "Audience", exact: true });
      await expect(audience).toBeVisible();
      await chooseFirstDifferentOption(audience);
      await expect(session.page.getByRole("combobox", { name: "Class" })).toBeVisible();
      await openAndInspect(session.page.getByRole("combobox", { name: "Class" }));
      await session.page.keyboard.press("Escape");
      assertNoWrites(session.api, assert);
      assertBrowserHealthy(session.errors, "/admin/broadcast", width);
    } finally {
      await closePage(session);
    }
  }
});

test("accounts sort, period, and fee-dialog dropdowns open without committing data", async ({ browser, baseURL }) => {
  for (const width of TARGET_WIDTHS) {
    const session = await openPage(browser, baseURL, "admin", width);
    try {
      await gotoRoute(session.page, baseURL, "/admin/accounts");
      await expect(session.page.getByRole("heading", { name: "Staff salaries" })).toBeVisible();

      const sort = session.page.locator("#salary-sort");
      await expect(sort).toBeVisible();
      await chooseFirstDifferentOption(sort);

      const salaryMonth = session.page.getByRole("combobox", { name: "salary period month" });
      await expect(salaryMonth).toBeVisible();
      await chooseFirstDifferentOption(salaryMonth);

      const deposit = session.page.getByRole("button", { name: "Record a term deposit for Aarav Sharma" });
      await deposit.scrollIntoViewIfNeeded();
      await deposit.click();
      const dialog = session.page.getByRole("dialog", { name: "Record a fee deposit for Aarav Sharma" });
      await expect(dialog).toBeVisible();
      const startMonth = dialog.getByRole("combobox", { name: "Starting month" });
      await expect(startMonth).toBeVisible();
      await chooseFirstDifferentOption(startMonth);
      await exerciseKeyboardAndDismiss(startMonth);
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();

      assertNoWrites(session.api, assert);
      assertBrowserHealthy(session.errors, "/admin/accounts", width);
    } finally {
      await closePage(session);
    }
  }
});

test("admin class, staff, and student forms expose usable dropdown menus", async ({ browser, baseURL }) => {
  const forms = [
    {
      route: "/admin/classes",
      open: /Add Class/,
      fields: [{ name: "Class teacher" }],
    },
    {
      route: "/admin/staff",
      open: /Add Staff/,
      fields: [{ name: "Role / Title", choose: "Pilot" }, { name: "Marital status" }, { name: "Gender" }],
    },
    {
      route: "/admin/students",
      open: /Add Student/,
      fields: [{ name: "Class" }, { name: "Gender" }],
    },
  ];

  for (const form of forms) {
    for (const width of TARGET_WIDTHS) {
      const session = await openPage(browser, baseURL, "admin", width);
      try {
        await gotoRoute(session.page, baseURL, form.route);
        await session.page.getByRole("button", { name: form.open }).click();
        for (const field of form.fields) {
          const trigger = session.page.getByRole("combobox", { name: field.name });
          await expect(trigger).toBeVisible();
          if (field.choose) {
            await trigger.click();
            const menu = await menuFor(session.page);
            await menu.getByRole("option", { name: field.choose, exact: true }).click();
            await expect(trigger).toContainText(field.choose);
          } else {
            await chooseFirstDifferentOption(trigger);
          }
        }
        assertNoWrites(session.api, assert);
        assertBrowserHealthy(session.errors, form.route, width);
      } finally {
        await closePage(session);
      }
    }
  }
});

test("master school location dropdowns keep dependent controls disabled until data exists", async ({ browser, baseURL }) => {
  for (const width of TARGET_WIDTHS) {
    const session = await openPage(browser, baseURL, "master", width);
    try {
      await gotoRoute(session.page, baseURL, "/master/schools");
      await session.page.getByRole("button", { name: /Add School/ }).click();

      const country = session.page.getByRole("combobox", { name: "Country" });
      const state = session.page.getByRole("combobox", { name: "State" });
      const city = session.page.getByRole("combobox", { name: "City" });
      await expect(country).toBeVisible();
      await expect(state).toBeEnabled();
      await expect(city).toBeDisabled();

      await country.click();
      let menu = await menuFor(session.page);
      await menu.getByRole("option", { name: "United States", exact: true }).click();
      await expect(state).toBeEnabled();
      await expect(city).toBeDisabled();

      await state.click();
      menu = await menuFor(session.page);
      await menu.getByRole("option", { name: "California", exact: true }).click();
      await expect(city).toBeEnabled();

      await city.click();
      menu = await menuFor(session.page);
      await menu.getByRole("option", { name: "Los Angeles", exact: true }).click();
      await expect(city).toContainText("Los Angeles");

      await country.click();
      menu = await menuFor(session.page);
      await menu.getByRole("option", { name: "India", exact: true }).click();
      await expect(state).toBeEnabled();
      await expect(city).toBeDisabled();

      assertNoWrites(session.api, assert);
      assertBrowserHealthy(session.errors, "/master/schools", width);
    } finally {
      await closePage(session);
    }
  }
});

test("parent child picker opens, navigates by keyboard, and switches between two fixture children", async ({ browser, baseURL }) => {
  for (const width of TARGET_WIDTHS) {
    const session = await openPage(browser, baseURL, "parent", width);
    try {
      await gotoRoute(session.page, baseURL, "/parent/home");
      const picker = session.page.locator("#parent-child-select");
      await expect(picker).toBeVisible();
      const label = await chooseFirstDifferentOption(picker);
      assert.match(label, /Mira Sharma/);
      await expect(session.page.getByText("Here's what's happening with Mira", { exact: false })).toBeVisible();
      await exerciseKeyboardAndDismiss(picker);

      assertNoWrites(session.api, assert);
      assertBrowserHealthy(session.errors, "/parent/home", width);
    } finally {
      await closePage(session);
    }
  }
});

test("staff and teacher broadcast forms open their route and class menus", async ({ browser, baseURL }) => {
  const portals = [
    { role: "staff", route: "/staff/broadcast", audienceChoice: "Specific route", dependent: "broadcast-route", dependentChoice: "North Loop" },
    { role: "teacher", route: "/teacher/broadcast", audienceChoice: "Specific class", dependent: "Class", dependentChoice: "Grade 5 - A" },
  ];

  for (const portal of portals) {
    for (const width of TARGET_WIDTHS) {
      const session = await openPage(browser, baseURL, portal.role, width);
      try {
        await gotoRoute(session.page, baseURL, portal.route);
        await session.page.getByRole("button", { name: /New Broadcast/ }).click();
        const audience = portal.role === "staff"
          ? session.page.locator("#broadcast-audience")
          : session.page.getByRole("combobox", { name: "Audience", exact: true });
        await expect(audience).toBeVisible();
        await audience.click();
        let menu = await menuFor(session.page);
        await menu.getByRole("option", { name: portal.audienceChoice, exact: true }).click();

        const dependent = portal.role === "staff"
          ? session.page.locator(`#${portal.dependent}`)
          : session.page.getByRole("combobox", { name: portal.dependent });
        await expect(dependent).toBeVisible();
        await openAndInspect(dependent);
        menu = session.page.getByRole("listbox").last();
        await menu.getByRole("option", { name: portal.dependentChoice, exact: true }).click();
        await expect(dependent).toContainText(portal.dependentChoice);

        assertNoWrites(session.api, assert);
        assertBrowserHealthy(session.errors, portal.route, width);
      } finally {
        await closePage(session);
      }
    }
  }
});

test("website builder context menu is a light keyboard-accessible portal menu", async ({ browser, baseURL }) => {
  const session = await openPage(browser, baseURL, "admin", 1440);
  try {
    await gotoRoute(session.page, baseURL, "/admin/build-your-site");
    // The canvas is a labelled div, not an image; use its semantic label while
    // keeping the right-click as the real browser gesture under test.
    const layoutCanvas = session.page.locator('[aria-label="Website layout canvas"]');
    await expect(layoutCanvas).toBeVisible();
    await layoutCanvas.click({ button: "right", position: { x: 200, y: 100 } });

    const menu = session.page.getByRole("menu");
    await expect(menu).toBeVisible();
    const menuStyle = await menu.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    assert.equal(menuStyle.backgroundColor, "rgb(255, 255, 255)");
    assert.equal(menuStyle.color, "rgb(20, 44, 59)");

    const items = menu.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    await session.page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await session.page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    assertNoWrites(session.api, assert);
    assertBrowserHealthy(session.errors, "/admin/build-your-site", 1440);
  } finally {
    await closePage(session);
  }
});
