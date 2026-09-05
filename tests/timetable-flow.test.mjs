import assert from "node:assert/strict";
import test from "node:test";
import {
  TIMETABLE_DAYS,
  toTimeInput,
  displayTime,
  isValidTimeRange,
  buildCreatePeriodPayload,
  buildUpdateEntryPayload,
  getEntryTime,
} from "../src/utils/timetableFlow.js";

test("supports all timetable days in the expected order", () => {
  assert.deepEqual(TIMETABLE_DAYS, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
});

test("converts stored display times to time input values", () => {
  assert.equal(toTimeInput("9:01 AM"), "09:01");
  assert.equal(toTimeInput("1:30 PM"), "13:30");
  assert.equal(toTimeInput("12:00 AM"), "00:00");
});

test("formats time input values for timetable display", () => {
  assert.equal(displayTime("09:01"), "9:01 AM");
  assert.equal(displayTime("13:30"), "1:30 PM");
});

test("rejects missing, reversed, or equal time ranges", () => {
  assert.equal(isValidTimeRange("", "10:00"), false);
  assert.equal(isValidTimeRange("10:00", "09:00"), false);
  assert.equal(isValidTimeRange("10:00", "10:00"), false);
  assert.equal(isValidTimeRange("09:00", "09:45"), true);
});

test("builds an all-day period payload with subject and teacher", () => {
  assert.deepEqual(
    buildCreatePeriodPayload({
      start: "09:00",
      end: "09:45",
      subjectId: "3",
      teacherId: "7",
      day: "",
    }),
    {
      period_time: "9:00 AM - 9:45 AM",
      subject_id: 3,
      teacher_id: 7,
      day_of_week: null,
    }
  );
});

test("builds a single-day period payload", () => {
  assert.equal(
    buildCreatePeriodPayload({
      start: "13:00",
      end: "13:45",
      subjectId: "",
      teacherId: "",
      day: "Wed",
    }).day_of_week,
    "Wed"
  );
});

test("builds the timetable entry update payload", () => {
  assert.deepEqual(
    buildUpdateEntryPayload({
      start: "09:00",
      end: "09:45",
      subjectId: "3",
      teacherId: "7",
    }),
    {
      subject_id: 3,
      teacher_id: 7,
      period_start_time: "09:00",
      period_end_time: "09:45",
    }
  );
});

test("prefers entry times and falls back to legacy period times", () => {
  const periods = new Map([["2", { period_time: "10:00 AM - 10:45 AM" }]]);
  assert.equal(
    getEntryTime({ period_id: 2, period_start_time: "09:00", period_end_time: "09:45" }, periods),
    "9:00 AM - 9:45 AM"
  );
  assert.equal(getEntryTime({ period_id: 2 }, periods), "10:00 AM - 10:45 AM");
});
