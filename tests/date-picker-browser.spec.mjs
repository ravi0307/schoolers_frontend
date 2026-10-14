import assert from "node:assert/strict";
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { assertNoWrites, authenticate } from "./dropdown-fixtures.mjs";

const TARGET_VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

function browserErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthPart(value) {
  return String(value).slice(0, 7);
}

function yearPart(value) {
  return Number(String(value).slice(0, 4));
}

async function openAppPage(browser, baseURL, role, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const api = await authenticate(context, role);
  const page = await context.newPage();
  const errors = browserErrors(page);
  return { api, context, errors, page, viewport };
}

async function gotoAppPage(session, baseURL, route) {
  await session.page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
  await expect(session.page.locator("#main-content")).toBeVisible();
}

async function assertBrowserHealthy(session, route) {
  assert.deepEqual(session.errors, [], `${route} emitted browser errors`);
}

function pickerRoot(input) {
  return input.locator("xpath=ancestor::*[@data-date-picker-root][1]");
}

async function assertPickerInputContract(input, expectedType) {
  const root = pickerRoot(input);
  assert.ok(await root.count(), "date input must have a data-date-picker-root wrapper");
  assert.ok(
    (await root.getAttribute("data-date-picker-root")) !== null,
    "date picker root marker is missing"
  );
  assert.ok(
    (await input.getAttribute("data-date-input")) !== null,
    "date input marker is missing"
  );
  await expect(input).toHaveAttribute("type", expectedType);
  const trigger = root.getByRole("button", { name: "Open calendar", exact: true });
  await expect(trigger).toHaveCount(1);
  return { root, trigger };
}

async function openCalendar(input, expectedLabel) {
  const { root, trigger } = await assertPickerInputContract(
    input,
    expectedLabel === "Choose month" ? "month" : "date"
  );
  await trigger.click();
  const calendar = input.page().locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendar).toBeVisible();
  await expect(calendar).toHaveAttribute("aria-label", expectedLabel);
  const parentTag = await calendar.evaluate((element) => element.parentElement?.tagName);
  assert.equal(parentTag, "BODY", "calendar must be portaled directly under body");
  await expect(calendar).toHaveAttribute("data-placement", /^(above|below)$/);
  return { calendar, root, trigger };
}

async function assertFullDateLabel(dayButton) {
  const [date, label] = await Promise.all([
    dayButton.getAttribute("data-date"),
    dayButton.getAttribute("aria-label"),
  ]);
  const expected = await dayButton.evaluate((element) => new Intl.DateTimeFormat(
    undefined,
    { dateStyle: "full" }
  ).format(new Date(`${element.dataset.date}T12:00:00`)));
  assert.ok(date, "day button needs an ISO data-date");
  assert.equal(label, expected, `${date} needs the browser-locale full-date label`);
}

async function assertDateCalendar(calendar) {
  const previous = calendar.getByRole("button", { name: "Previous month", exact: true });
  const next = calendar.getByRole("button", { name: "Next month", exact: true });
  await expect(previous).toBeVisible();
  await expect(next).toBeVisible();

  const year = calendar.getByRole("spinbutton", { name: "Calendar year", exact: true });
  await expect(year).toBeVisible();
  await expect(year).toHaveAttribute("type", "number");

  const month = calendar.getByRole("combobox", { name: "Calendar month", exact: true });
  await expect(month).toBeVisible();
  await month.click();
  const monthMenu = calendar.page().getByRole("listbox").last();
  await expect(monthMenu).toBeVisible();
  await expect(monthMenu.getByRole("option")).toHaveCount(12);
  await calendar.page().keyboard.press("Escape");
  await expect(monthMenu).toBeHidden();

  const days = calendar.locator('button[data-date]');
  await expect(days).not.toHaveCount(0);
  const selected = calendar.locator('button[data-date][data-selected]');
  await expect(selected).toHaveCount(1);
  const selectedCell = selected.locator("xpath=ancestor::*[@role='gridcell'][1]");
  await expect(selectedCell).toHaveAttribute("aria-selected", "true");
  await expect(calendar.locator('button[data-date][data-today]')).toHaveCount(1);
  await expect(calendar.locator('button[data-date][data-outside-month]')).not.toHaveCount(0);
  await expect(calendar.getByRole("gridcell")).not.toHaveCount(0);
  await assertFullDateLabel(days.first());

  return { days, month, next, previous, selected, year };
}

async function focusedButton(calendar, selector) {
  const focused = calendar.locator(`${selector}:focus`);
  await expect(focused).toHaveCount(1);
  return focused;
}

async function assertDateKeyboardAndDismiss(input) {
  const { calendar, trigger } = await openCalendar(input, "Choose date");
  const focusedInitially = await focusedButton(calendar, "button[data-date]");
  const initialValue = await focusedInitially.getAttribute("data-date");

  await input.page().keyboard.press("ArrowRight");
  const afterArrow = await focusedButton(calendar, "button[data-date]");
  const afterArrowValue = await afterArrow.getAttribute("data-date");
  assert.notEqual(afterArrowValue, initialValue, "ArrowRight should move the roving day");

  await input.page().keyboard.press("Home");
  const homeValue = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  assert.ok(homeValue, "Home should leave focus on a day button");

  await input.page().keyboard.press("End");
  const endValue = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  assert.ok(endValue, "End should leave focus on a day button");
  assert.notEqual(endValue, homeValue, "Home and End should reach different days");

  const beforePageUp = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  await input.page().keyboard.press("PageUp");
  const afterPageUp = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  assert.notEqual(monthPart(afterPageUp), monthPart(beforePageUp), "PageUp should change month");

  await input.page().keyboard.press("PageDown");
  const afterPageDown = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  assert.equal(monthPart(afterPageDown), monthPart(beforePageUp), "PageDown should return one month");

  await input.page().keyboard.press("Shift+PageDown");
  const afterYearDown = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  assert.equal(yearPart(afterYearDown), yearPart(afterPageDown) + 1, "Shift+PageDown should change year");
  await input.page().keyboard.press("Shift+PageUp");

  await input.page().keyboard.press("ArrowLeft");
  const enterValue = await (await focusedButton(calendar, "button[data-date]")).getAttribute("data-date");
  await input.page().keyboard.press("Enter");
  await expect(input).toHaveValue(enterValue);
  await expect(calendar).toBeHidden();

  await trigger.click();
  const calendarForSpace = input.page().locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendarForSpace).toBeVisible();
  await input.page().keyboard.press("ArrowRight");
  const spaceValue = await (await focusedButton(calendarForSpace, "button[data-date]")).getAttribute("data-date");
  await input.page().keyboard.press("Space");
  await expect(input).toHaveValue(spaceValue);

  await trigger.click();
  const calendarForEscape = input.page().locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendarForEscape).toBeVisible();
  await input.page().keyboard.press("Escape");
  await expect(calendarForEscape).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  const calendarForOutsideClick = input.page().locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendarForOutsideClick).toBeVisible();
  await input.page().getByTestId("harness-title").click();
  await expect(calendarForOutsideClick).toBeHidden();
}

async function mountHarness(page, baseURL) {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const target = document.createElement("div");
    target.id = "date-picker-harness-root";
    document.body.appendChild(target);
    const { mountDatePickerHarness } = await import("/tests/date-picker-harness.jsx");
    window.__datePickerHarnessUnmount = mountDatePickerHarness(target);
  });
  await expect(page.getByTestId("date-picker-harness")).toBeVisible();
}

async function assertDisabledOrAriaDisabled(locator, message) {
  const disabled = await locator.isDisabled();
  const ariaDisabled = await locator.getAttribute("aria-disabled");
  assert.ok(disabled || ariaDisabled === "true", message);
}

async function todayInBrowser(page) {
  return page.evaluate(() => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });
}

async function assertDateBoundsAndActions(page, input, calendar) {
  const min = await input.getAttribute("min");
  const max = await input.getAttribute("max");
  assert.ok(min && max, "bounded date input should retain native min and max props");

  const beforeMin = calendar.locator(`button[data-date="${shiftDate(min, -1)}"]`);
  const afterMax = calendar.locator(`button[data-date="${shiftDate(max, 1)}"]`);
  await expect(beforeMin).toHaveCount(1);
  await expect(afterMax).toHaveCount(1);
  await assertDisabledOrAriaDisabled(beforeMin, "date before min must be disabled");
  await assertDisabledOrAriaDisabled(afterMax, "date after max must be disabled");

  const clear = calendar.getByRole("button", { name: "Clear", exact: true });
  const today = calendar.getByRole("button", { name: "Today", exact: true });
  await expect(clear).toBeVisible();
  await expect(today).toBeVisible();

  await clear.click();
  await expect(input).toHaveValue("");
  await expect(calendar).toBeHidden();
  const form = page.locator("#date-picker-form");
  assert.equal(
    await form.evaluate((element) => element.checkValidity()),
    false,
    "clearing a required date must preserve native form invalidity"
  );

  const { calendar: todayCalendar, trigger } = await openCalendar(input, "Choose date");
  await todayCalendar.getByRole("button", { name: "Today", exact: true }).click();
  await expect(input).toHaveValue(await todayInBrowser(page));
  await expect(todayCalendar).toBeHidden();
  await expect(trigger).toBeFocused();
}

async function assertMonthCalendar(page, input, { checkKeyboard = true } = {}) {
  const { calendar, trigger } = await openCalendar(input, "Choose month");
  await expect(calendar.getByRole("button", { name: "Previous year", exact: true })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Next year", exact: true })).toBeVisible();
  await expect(calendar.getByRole("spinbutton", { name: "Calendar year", exact: true })).toBeVisible();

  const months = calendar.locator('button[data-month]');
  await expect(months).toHaveCount(12);
  const selected = calendar.locator('button[data-month][data-selected]');
  await expect(selected).toHaveCount(1);
  const selectedCell = selected.locator("xpath=ancestor::*[@role='gridcell'][1]");
  await expect(selectedCell).toHaveAttribute("aria-selected", "true");
  await expect(calendar.getByRole("gridcell")).not.toHaveCount(0);

  const max = await input.getAttribute("max");
  assert.ok(max, "month input should retain its native max prop");
  if (!checkKeyboard) return { calendar, trigger };
  const initiallyFocused = await focusedButton(calendar, "button[data-month]");
  const initialValue = await initiallyFocused.getAttribute("data-month");
  await page.keyboard.press("ArrowRight");
  const afterArrow = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  assert.notEqual(afterArrow, initialValue, "ArrowRight should move the roving month");
  await page.keyboard.press("Home");
  const homeValue = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  await page.keyboard.press("End");
  const endValue = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  assert.notEqual(homeValue, endValue, "Home and End should reach different months");

  const beforePageUp = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  await page.keyboard.press("PageUp");
  const afterPageUp = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  assert.notEqual(afterPageUp, beforePageUp, "PageUp should change the month picker year");
  await page.keyboard.press("PageDown");
  const afterPageDown = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  assert.equal(afterPageDown, beforePageUp, "PageDown should return the month picker year");
  await page.keyboard.press("Shift+PageDown");
  const afterYearDown = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  assert.equal(yearPart(afterYearDown), yearPart(afterPageDown) + 1, "Shift+PageDown should change month-picker year");

  await page.keyboard.press("ArrowLeft");
  const enterValue = await (await focusedButton(calendar, "button[data-month]")).getAttribute("data-month");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue(enterValue);
  await expect(calendar).toBeHidden();

  await trigger.click();
  const calendarForSpace = page.locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendarForSpace).toBeVisible();
  await page.keyboard.press("ArrowRight");
  const spaceValue = await (await focusedButton(calendarForSpace, "button[data-month]")).getAttribute("data-month");
  await page.keyboard.press("Space");
  await expect(input).toHaveValue(spaceValue);

  await trigger.click();
  const calendarForEscape = page.locator('[data-date-calendar][role="dialog"]').last();
  await expect(calendarForEscape).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(calendarForEscape).toBeHidden();
  await expect(trigger).toBeFocused();
}

test.beforeAll(() => {
  fs.mkdirSync("test-results/date-picker", { recursive: true });
});

test("date picker preserves native date props, portal semantics, bounds, clear, and today", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = browserErrors(page);
  try {
    await mountHarness(page, baseURL);
    const input = page.locator("#harness-date");
    await expect(input).toHaveAttribute("name", "harness_date");
    await expect(input).toHaveAttribute("required", "");
    await expect(input).toHaveAttribute("min", /\d{4}-\d{2}-\d{2}/);
    await expect(input).toHaveAttribute("max", /\d{4}-\d{2}-\d{2}/);

    const { calendar } = await openCalendar(input, "Choose date");
    await assertDateCalendar(calendar);
    await page.screenshot({
      path: "test-results/date-picker/harness-date-calendar.png",
      fullPage: false,
    });
    await assertDateBoundsAndActions(page, input, calendar);
    assert.deepEqual(errors, [], "date picker harness emitted browser errors");
  } finally {
    await context.close();
  }
});

test("date picker supports roving date keyboard controls, selection, Escape focus, and outside dismissal", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = browserErrors(page);
  try {
    await mountHarness(page, baseURL);
    const input = page.locator("#above-placement-field input[data-date-input]");
    await input.scrollIntoViewIfNeeded();
    await assertDateKeyboardAndDismiss(input);
    assert.deepEqual(errors, [], "date keyboard harness emitted browser errors");
  } finally {
    await context.close();
  }
});

test("month mode renders year navigation and month buttons with keyboard selection", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = browserErrors(page);
  try {
    await mountHarness(page, baseURL);
    const input = page.locator("#harness-month");
    await expect(input).toHaveAttribute("type", "month");
    await expect(input).toHaveAttribute("name", "harness_month");
    await assertMonthCalendar(page, input);
    await page.screenshot({
      path: "test-results/date-picker/harness-month-calendar.png",
      fullPage: false,
    });
    assert.deepEqual(errors, [], "month picker harness emitted browser errors");
  } finally {
    await context.close();
  }
});

test("date picker keeps native editing, form submission, and required validation", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = browserErrors(page);
  try {
    await mountHarness(page, baseURL);
    const dateInput = page.locator("#harness-date");
    const monthInput = page.locator("#harness-month");
    const dateValue = shiftDate(await dateInput.getAttribute("min"), 1);
    const monthValue = await monthInput.inputValue();

    await dateInput.fill(dateValue);
    await monthInput.fill(monthValue);
    await expect(dateInput).toHaveValue(dateValue);
    await expect(monthInput).toHaveValue(monthValue);
    await page.getByRole("button", { name: "Submit native form", exact: true }).click();
    await expect(page.getByTestId("submitted-values")).toHaveText(
      JSON.stringify({ date: dateValue, month: monthValue })
    );

    await dateInput.fill("");
    assert.equal(
      await page.locator("#date-picker-form").evaluate((form) => form.checkValidity()),
      false,
      "empty required date should fail native validation after editing"
    );
    assert.deepEqual(errors, [], "native form harness emitted browser errors");
  } finally {
    await context.close();
  }
});

test("date calendar chooses below near the top and above near the viewport bottom", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 700 } });
  const page = await context.newPage();
  const errors = browserErrors(page);
  try {
    await mountHarness(page, baseURL);
    const topInput = page.locator("#harness-date");
    const topCalendar = (await openCalendar(topInput, "Choose date")).calendar;
    await expect(topCalendar).toHaveAttribute("data-placement", "below");
    await page.keyboard.press("Escape");

    const bottomInput = page.locator("#above-placement-field input[data-date-input]");
    await bottomInput.scrollIntoViewIfNeeded();
    const bottomCalendar = (await openCalendar(bottomInput, "Choose date")).calendar;
    await expect(bottomCalendar).toHaveAttribute("data-placement", "above");
    await page.screenshot({
      path: "test-results/date-picker/harness-calendar-above-mobile-height.png",
      fullPage: false,
    });
    assert.deepEqual(errors, [], "placement harness emitted browser errors");
  } finally {
    await context.close();
  }
});

async function installStaffReportFixture(page) {
  await page.route("**/api/v1/reports/staff/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        attendance: { marked_days: 1, present: 1, absent: 0, on_leave: 0, half_day: 0 },
        salary: { window_size: 0, window: [], records: [] },
      }),
    });
  });
}

test("admin holidays date picker is integrated on mobile and desktop representative pages", async ({ browser, baseURL }) => {
  for (const viewport of TARGET_VIEWPORTS) {
    const session = await openAppPage(browser, baseURL, "admin", viewport);
    try {
      await gotoAppPage(session, baseURL, "/admin/holidays");
      await session.page.getByRole("button", { name: "+ Add Holiday", exact: true }).click();
      const input = session.page.locator('form input[data-date-input][type="date"]').first();
      await expect(input).toBeVisible();
      await input.fill(await todayInBrowser(session.page));
      const { calendar } = await openCalendar(input, "Choose date");
      await assertDateCalendar(calendar);
      await session.page.screenshot({
        path: `test-results/date-picker/admin-holidays-${viewport.name}.png`,
        fullPage: false,
      });
      await session.page.keyboard.press("Escape");
      assertNoWrites(session.api, assert);
      await assertBrowserHealthy(session, "/admin/holidays");
    } finally {
      await session.context.close();
    }
  }
});

test("staff report month picker is integrated with deterministic report data on mobile and desktop", async ({ browser, baseURL }) => {
  for (const viewport of TARGET_VIEWPORTS) {
    const session = await openAppPage(browser, baseURL, "staff", viewport);
    try {
      await installStaffReportFixture(session.page);
      await gotoAppPage(session, baseURL, "/staff/report");
      await expect(session.page.getByRole("heading", { name: "My Report" })).toBeVisible();
      const input = session.page.locator('input[data-date-input][type="month"]');
      await expect(input).toBeVisible();
      await input.fill(monthPart(await todayInBrowser(session.page)));
      await expect(input).toHaveCount(1);
      await expect(input).toBeVisible();
      await assertMonthCalendar(session.page, input, { checkKeyboard: false });
      await session.page.screenshot({
        path: `test-results/date-picker/staff-report-month-${viewport.name}.png`,
        fullPage: false,
      });
      await session.page.keyboard.press("Escape");
      assertNoWrites(session.api, assert);
      await assertBrowserHealthy(session, "/staff/report");
    } finally {
      await session.context.close();
    }
  }
});
