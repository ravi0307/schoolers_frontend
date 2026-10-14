/* oxlint-disable react/only-export-components */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import DatePicker from "../src/components/ui/DatePicker";

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function monthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(value, delta) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthValue(date);
}

const TODAY = isoDate(new Date());
const INITIAL_DATE = shiftDate(TODAY, 1);
const DATE_MIN = shiftDate(TODAY, -5);
const DATE_MAX = shiftDate(TODAY, 5);
const INITIAL_MONTH = TODAY.slice(0, 7);
// Keep the month fixture broad enough that year paging can be exercised in
// every direction. The date fixture below supplies the narrow min/max case.
const MONTH_MIN = shiftMonth(INITIAL_MONTH, -24);
const MONTH_MAX = shiftMonth(INITIAL_MONTH, 24);

function DatePickerHarness() {
  const [date, setDate] = useState(INITIAL_DATE);
  const [month, setMonth] = useState(INITIAL_MONTH);
  const [submitted, setSubmitted] = useState("");

  function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitted(JSON.stringify({
      date: values.get("harness_date"),
      month: values.get("harness_month"),
    }));
  }

  return (
    <main data-testid="date-picker-harness">
      <h1 data-testid="harness-title">Date picker browser harness</h1>
      <form id="date-picker-form" onSubmit={submit}>
        <div id="bounded-date-field">
          <label htmlFor="harness-date">Bounded date</label>
          <DatePicker
            id="harness-date"
            name="harness_date"
            value={date}
            min={DATE_MIN}
            max={DATE_MAX}
            required
            aria-label="Harness bounded date"
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div id="month-field">
          <label htmlFor="harness-month">Bounded month</label>
          <DatePicker
            id="harness-month"
            type="month"
            name="harness_month"
            value={month}
            min={MONTH_MIN}
            max={MONTH_MAX}
            aria-label="Harness bounded month"
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>

        <button type="submit">Submit native form</button>
      </form>

      <div id="above-placement-field" style={{ marginTop: "720px" }}>
        <label htmlFor="harness-above-date">Date near viewport bottom</label>
        <DatePicker
          id="harness-above-date"
          name="harness_above_date"
          defaultValue={INITIAL_DATE}
          aria-label="Harness upward placement date"
        />
      </div>

      <output data-testid="submitted-values" aria-live="polite">{submitted}</output>
    </main>
  );
}

// The browser spec imports this test-only mount helper; it is intentionally
// exported alongside the harness component rather than used by application code.
// oxlint-disable-next-line react/only-export-components
export function mountDatePickerHarness(target) {
  const root = createRoot(target);
  root.render(<DatePickerHarness />);
  return () => root.unmount();
}
