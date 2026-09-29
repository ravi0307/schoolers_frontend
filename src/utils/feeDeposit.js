/**
 * Presentation helpers for the fee deposit dialog.
 *
 * A deposit is one amount handed over for a period, and the period is what
 * gets recorded. The arithmetic -- which months, and how the total divides --
 * belongs to the server, and this file only renders what the server said. The
 * split is deliberately NOT reimplemented here: two implementations of a
 * rounding rule disagree eventually, and the disagreement shows up as a fee
 * register that does not add up.
 *
 * So the helpers here are all about saying the same facts clearly: which
 * months, which of them are being replaced, and what the admin just did.
 */

import { monthLabel } from "./staffReport.js";

/** Group an amount the way a ledger does, keeping decimals. */
export function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "—";
  const [whole, frac] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/** The plan buttons, in the order they read best: shortest period first. */
export function planChoices(plans) {
  return (plans || []).map((p) => ({
    plan: p.plan,
    months: p.months,
    label: p.label,
  }));
}

/** "3 months" / "1 month" / "12 months", from the server's own count. */
export function planMonthsLabel(months) {
  const n = Number(months);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n} ${n === 1 ? "month" : "months"}`;
}

/** The months a deposit covers, as a phrase: "Sep 2026 – Nov 2026". */
export function depositRangeLabel(plan) {
  const months = plan?.months || [];
  if (!months.length) return "";
  if (months.length === 1) return monthLabel(months[0].month);
  return `${monthLabel(months[0].month)} – ${monthLabel(months[months.length - 1].month)}`;
}

/**
 * The per-month breakdown, one row per month the deposit touches.
 *
 * Every covered month is listed even when the split is even, because the
 * point of the preview is that a yearly deposit writes twelve months and the
 * admin should be able to see that before it happens.
 */
export function depositRows(plan) {
  return (plan?.months || []).map((m) => ({
    month: m.month,
    label: monthLabel(m.month),
    amount: m.amount,
    replaced: !!m.replaced,
  }));
}

/** Months that already carry an entry and would be overwritten. */
export function replacedRows(plan) {
  return depositRows(plan).filter((r) => r.replaced);
}

/**
 * Whether a deposit is safe to confirm, and why not.
 *
 * An amount is required: a deposit of nothing would write zero-fee months
 * across a term, which is a statement about the register that nobody meant to
 * make. The plan and the start month must be chosen too.
 */
export function depositProblem({ plan, startMonth, amount }) {
  if (!plan) return "Choose how often the fees are paid.";
  if (!startMonth) return "Choose the month the payment starts from.";
  const trimmed = String(amount ?? "").trim();
  if (!trimmed) return "Enter the amount received.";
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return "The amount must be a number.";
  if (value < 0) return "The amount cannot be negative.";
  if (value === 0) {
    return "A deposit of zero would record every covered month as paid nothing. Record the months individually instead.";
  }
  return null;
}

/**
 * The line under the preview once a deposit is recorded.
 *
 * Says what happened, not just that something did. A yearly deposit writes
 * twelve months of a fee register, and an admin who only sees "recorded" has
 * to go looking for the other eleven.
 */
export function depositResultText(plan) {
  if (!plan) return "";
  const created = Number(plan.created) || 0;
  const replaced = Number(plan.replaced) || 0;
  const total = formatAmount(plan.total);
  const range = depositRangeLabel(plan);

  const parts = [];
  if (created) {
    parts.push(`${created} ${created === 1 ? "month" : "months"} recorded`);
  }
  if (replaced) {
    parts.push(`${replaced} existing ${replaced === 1 ? "entry" : "entries"} replaced`);
  }
  if (!parts.length) return `${total} already recorded for ${range}. Nothing changed.`;

  return `${total} recorded across ${range} · ${parts.join(", ")}`;
}

/**
 * The warning shown above the confirm button when a deposit will overwrite.
 *
 * Deliberately specific about which months: "this will replace 2 existing
 * entries" leaves the admin guessing, and guessing here means overwriting a
 * parent's record.
 */
export function replacementWarning(plan) {
  const rows = replacedRows(plan);
  if (!rows.length) return null;
  const months = rows.map((r) => r.label).join(", ");
  return rows.length === 1
    ? `This replaces the existing entry for ${months}.`
    : `This replaces the existing entries for ${months}.`;
}
