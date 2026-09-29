import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  depositProblem,
  depositRangeLabel,
  depositResultText,
  depositRows,
  formatAmount,
  planChoices,
  planMonthsLabel,
  replacedRows,
  replacementWarning,
} from "../src/utils/feeDeposit.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (rel) => readFileSync(join(root, rel), "utf8");
const assertContains = (file, patterns) => {
  const text = source(file);
  for (const pattern of patterns) {
    assert.match(text, pattern, `${file} is missing ${pattern}`);
  }
};

// A fee deposit is the one place in the accounts grid where an amount becomes
// several months at once. What is recorded has to add up to what was handed
// over, the months covered have to be the ones the admin expected, and any
// month already carrying an entry has to be named before it is overwritten.
//
// The split itself is the server's, deliberately: two implementations of a
// rounding rule eventually disagree, and a fee register that does not add up is
// worse than one that is a day late. So these tests pin what the client says
// about the server's answer, and that the client does not reimplement it.

const PLANS = [
  { plan: "monthly", months: 1, label: "Monthly" },
  { plan: "quarterly", months: 3, label: "Quarterly" },
  { plan: "half_yearly", months: 6, label: "Half yearly" },
  { plan: "yearly", months: 12, label: "Yearly" },
];

const QUARTER = {
  student_id: 100,
  start_month: "2026-09",
  plan: "quarterly",
  total: 12000,
  months: [
    { month: "2026-09", amount: 4000, replaced: false },
    { month: "2026-10", amount: 4000, replaced: false },
    { month: "2026-11", amount: 4000, replaced: true },
  ],
  created: 2,
  replaced: 1,
};

test("the four periods are offered with the server's own labels and counts", () => {
  // The dialog shows what the server said, so a plan offered here is a plan the
  // service can split with. The month count is displayed too, because "Quarterly"
  // and "3 months" are the same claim and only one of them is checkable.
  const choices = planChoices(PLANS);
  assert.deepEqual(choices.map((c) => c.plan), ["monthly", "quarterly", "half_yearly", "yearly"]);
  assert.deepEqual(choices.map((c) => c.months), [1, 3, 6, 12]);
  assert.equal(planMonthsLabel(1), "1 month");
  assert.equal(planMonthsLabel(3), "3 months");
  assert.equal(planMonthsLabel(12), "12 months");
  assert.equal(planMonthsLabel(0), "");
  // No plan is described by its raw key, which is what a missing label would
  // otherwise put on screen.
  for (const choice of choices) {
    assert.notEqual(choice.label, choice.plan);
    assert.ok(choice.label.trim().length > 0);
  }
});

test("every covered month is listed, even when the split is even", () => {
  // The preview exists to show the months a deposit writes. Showing only the
  // odd ones out would hide the other ten of a yearly payment, which is the
  // one thing the admin needs to see before confirming.
  const rows = depositRows(QUARTER);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.month), ["2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(rows.map((r) => r.label), ["Sep 2026", "Oct 2026", "Nov 2026"]);
  assert.deepEqual(rows.map((r) => r.replaced), [false, false, true]);
});

test("a deposit that crosses a year reads as one range", () => {
  assert.equal(depositRangeLabel(QUARTER), "Sep 2026 – Nov 2026");
  assert.equal(
    depositRangeLabel({
      months: [
        { month: "2026-11", amount: 100, replaced: false },
        { month: "2026-12", amount: 100, replaced: false },
        { month: "2027-01", amount: 100, replaced: false },
      ],
    }),
    "Nov 2026 – Jan 2027",
  );
  // A one-month deposit is one month, not a range with the same month twice.
  assert.equal(
    depositRangeLabel({ months: [{ month: "2026-09", amount: 100, replaced: false }] }),
    "Sep 2026",
  );
  assert.equal(depositRangeLabel(null), "");
});

test("the months about to be overwritten are named, not just counted", () => {
  // Replacing a month's payment destroys a record, and the admin has to be able
  // to see which one before pressing the button. A count alone would leave them
  // guessing, and guessing here means overwriting a parent's payment.
  const warning = replacementWarning(QUARTER);
  assert.ok(warning);
  assert.match(warning, /Nov 2026/, "the warning must name the month");
  assert.doesNotMatch(warning, /Sep 2026/, "months that are merely new are not a warning");
  assert.deepEqual(replacedRows(QUARTER).map((r) => r.month), ["2026-11"]);
  // Nothing to warn about is no warning, not an empty box.
  assert.equal(replacementWarning({ ...QUARTER, months: QUARTER.months.map((m) => ({ ...m, replaced: false })) }), null);
  assert.equal(replacementWarning(null), null);
});

test("the replacement warning reads as a sentence about what is about to be lost", () => {
  // The earlier phrasing read "This will replace the month already has an
  // entry", which is not English and asks the admin to parse it. Pin the
  // grammar, because a mangled warning is a warning nobody trusts.
  assert.equal(
    replacementWarning({ months: [{ month: "2026-09", amount: 1, replaced: true }] }),
    "This replaces the existing entry for Sep 2026.",
  );
  assert.equal(
    replacementWarning({
      months: [
        { month: "2026-09", amount: 1, replaced: true },
        { month: "2026-10", amount: 1, replaced: true },
      ],
    }),
    "This replaces the existing entries for Sep 2026, Oct 2026.",
  );
});

test("what happened after a deposit says how much, over what, and what it touched", () => {
  // A yearly deposit writes twelve months, and an admin shown only "recorded"
  // has to go looking for the other eleven.
  const text = depositResultText(QUARTER);
  assert.match(text, /12,000/);
  assert.match(text, /Sep 2026 – Nov 2026/);
  assert.match(text, /2 months recorded/);
  assert.match(text, /1 existing entry replaced/);
  assert.match(depositResultText({ ...QUARTER, created: 1, replaced: 0 }),
    /1 month recorded/);
  // A deposit that changed nothing says so rather than claiming a write.
  assert.match(
    depositResultText({ ...QUARTER, created: 0, replaced: 0 }),
    /already recorded.*Nothing changed/,
  );
  assert.equal(depositResultText(null), "");
});

test("amounts print with thousands separators, keeping any paise", () => {
  assert.equal(formatAmount(10000), "10,000");
  assert.equal(formatAmount(10000.55), "10,000.55");
  assert.equal(formatAmount(0.05), "0.05");
  assert.equal(formatAmount(0), "0");
  assert.equal(formatAmount(null), "—");
  assert.equal(formatAmount(""), "—");
});

test("a deposit cannot be confirmed until the period, the start and the amount are given", () => {
  assert.match(depositProblem({ startMonth: "2026-09", amount: 12000 }), /Choose how often/);
  assert.match(depositProblem({ plan: "quarterly", amount: 12000 }), /Choose the month/);
  assert.match(depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: "" }), /Enter the amount/);
  assert.match(depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: "  " }), /Enter the amount/);
  assert.match(depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: "abc" }), /must be a number/);
  assert.match(depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: -5 }), /cannot be negative/);
  assert.equal(depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: 12000 }), null);
  assert.equal(depositProblem({ plan: "monthly", startMonth: "2026-09", amount: " 5400 " }), null);
});

test("a zero deposit is refused, because it would record months as paid nothing", () => {
  // A blank cell and a recorded zero are different facts. Writing zero across a
  // term would make an unpaid family look paid, which is the one thing the
  // grid's dashes exist to prevent.
  assert.match(
    depositProblem({ plan: "quarterly", startMonth: "2026-09", amount: 0 }),
    /would record every covered month as paid nothing/,
  );
  assert.match(
    depositProblem({ plan: "yearly", startMonth: "2026-09", amount: "0.00" }),
    /Record the months individually/,
  );
});

test("the dialog previews before it writes, and confirms against the server's own plan", () => {
  // The split is never worked out on the client, so what the admin reads in the
  // table is what the service said it would write, and the confirm button is
  // gated on that answer existing.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /\.previewFeeDeposit\(/);
  assert.match(dialog, /\.depositFee\(/);
  assert.match(dialog, /disabled=\{!preview \|\| !!problem \|\| saving \|\| busy\}/,
    "confirming must need a preview the server produced");
  // A preview is a read: it is fetched and rendered, never written through.
  assert.doesNotMatch(dialog, /depositFee\([\s\S]{0,200}previewFeeDeposit/, "the write must not be the preview");
  // And the client never does the division itself.
  assert.doesNotMatch(dialog, /\/ *\(.*months|amount *\/ *planMonths|Math\.floor\(.*amount/s,
    "the split belongs to the service, not to the dialog");
  assert.doesNotMatch(dialog, /\bplanMonths\(|\bsplitTotal\(/);
});

test("the dialog starts from the month the grid is showing", () => {
  // The admin pages the grid to the month they mean to start from, and the
  // period runs forward from there. Defaulting to "today" would quietly record
  // a payment against a term the grid was never showing.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /useState\(\(\) => toMonthInputValue\(anchor\)\)/);
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /anchor=\{feeAnchor\}/);
});

test("the deposit periods are read from the server, not hardcoded in the client", () => {
  // A plan list written into the dialog would be a second source of truth that
  // disagrees with the service the first time a period is added or removed.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /accountsApi\.feePlans\(\)/);
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.doesNotMatch(dialog, /"quarterly"|'quarterly'/, "the dialog must not name a period itself");
  assert.doesNotMatch(dialog, /"yearly"|'yearly'/);
});

test("a deposit is a per-student action on the row it belongs to", () => {
  // The dialog needs a student, and the row is where the admin already is. A
  // toolbar control would need a picker and would put a question ("which
  // child?") in front of one the grid has already answered.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /rowAction=\{beginDeposit\}/);
  assert.match(page, /function beginDeposit\(\{ id, name, row \}\)/);
  assert.match(page, /studentId: id/);
  assert.match(page, /onClick=\{\(\) => rowAction\(\{ row, id, name \}\)\}/);
  // And only the fee grid has it: a salary is not deposited for a term.
  const salaryGrid = page.slice(page.indexOf("nameHeader=\"Staff\""), page.indexOf("nameHeader=\"Student\""));
  assert.doesNotMatch(salaryGrid, /rowAction=/, "only the fee grid offers a deposit");
});

test("the deposit action sits at the far right, in a column of its own", () => {
  // It acts on the whole row, not on any one month, so it is not a month
  // column. Placed after the figures it reads as the separate action it is;
  // under the name it read as part of who the student is.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  const body = page.slice(page.indexOf("<tbody>"), page.indexOf("</tbody>"));
  const action = body.indexOf("acct-action-cell");
  const lastMonth = body.lastIndexOf("RemarkCell");
  assert.ok(action > -1, "the row needs its own action cell");
  assert.ok(action > lastMonth, "the action must come after the month cells, not before them");
  assert.doesNotMatch(body, /acct-person[\s\S]{0,200}acct-row-action/,
    "the button must not sit inside the person cell");
  // And it is labelled, so the button is not a floating control at the end of a
  // row with nothing to say what it does.
  assert.match(page, /\{rowAction && <th className="acct-action-head">\{rowActionLabel\}<\/th>\}/);
  assert.match(page, /rowActionLabel="Deposit"/);
  assert.match(page, /rowActionTitle="Record a deposit for \{name\}"/);
  // The full name belongs in the tooltip, not in the button: a column of
  // "Deposit for Aarav Sharma" would be unreadable at any width.
  assert.doesNotMatch(page, /rowActionLabel="Deposit for \{name\}"/);
  assertContains("src/styles/global.css", [
    /\.acct-action-cell\s*\{[^}]*text-align:\s*right/s,
    /\.acct-action-head\s*\{[^}]*text-align:\s*right/s,
  ]);
});

test("the fee grid can page forward, because a deposit writes months ahead", () => {
  // Recording a term in September fills the months after it, so those months
  // hold figures the admin has to be able to read back to check the deposit.
  // The salary grid has nothing out there and still stops at this month.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  // Matched inside the one element rather than across the file, so the prop has
  // to be on the fee selector and not merely somewhere after it.
  const selectors = [...page.matchAll(/<MonthSelector[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(selectors.length, 2, "one selector per grid");
  const fee = selectors.find((s) => s.includes("anchor={feeAnchor}"));
  const salary = selectors.find((s) => s.includes("anchor={salaryAnchor}"));
  assert.ok(fee && salary, "both grids have their own selector");
  assert.match(fee, /allowFuture/,
    "the fee grid must be allowed to show future months");
  assert.doesNotMatch(salary, /allowFuture/,
    "the salary grid still has nothing beyond this month to show");
});

test("forward paging stops only for a grid that holds no future months", () => {
  // The disabling rule moved from "the anchor is this month" to "the anchor is
  // this month AND the grid has no future months", so a grid that does is not
  // trapped at the present.
  const selector = source("src/components/ui/MonthSelector.jsx");
  assert.match(selector, /allowFuture = false/, "the default keeps the old behaviour");
  const forward = [...selector.matchAll(/disabled=\{([^}]*isCurrent[^}]*)\}/g)];
  assert.equal(forward.length, 2, "both forward controls are guarded");
  for (const [, expr] of forward) {
    assert.match(expr, /!allowFuture && isCurrent/,
      `forward paging must be conditional on the grid, got "${expr}"`);
  }
  // The backward controls are never gated on the future, and a grid paged
  // forward keeps a way back in one click.
  assert.match(selector, /disabled=\{busy\}/);
  assert.match(selector, /\{!isCurrent && \([\s\S]{0,120}goToCurrent/,
    "a grid showing future months needs a way back to this month");
});

test("a finished deposit closes the dialog and refreshes the fee grid", () => {
  // The deposit writes months the grid may or may not be showing, so the grid
  // has to be re-read rather than patched in place: the totals, the paid dates
  // and the outstanding count all come from the server.
  const page = source("src/pages/admin/AdminAccounts.jsx");
  assert.match(page, /function depositSaved\(plan\)/);
  assert.match(page, /setDepositFor\(null\)/);
  assert.match(page, /fees\.refetch\(\);/);
  assert.match(page, /toast\(depositResultText\(plan\)\)/);
});

test("the preview names the state of every month, so nothing is ambiguous", () => {
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /replaces an entry/);
  assert.match(dialog, /\{row\.replaced/);
  assert.match(dialog, />new</, "a month with no entry says so, rather than showing nothing");
});

test("the dialog is dismissible and reachable by keyboard", () => {
  // A modal the admin cannot leave traps them in it, and Escape is the reflex.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /e\.key === "Escape"\) onClose\(\)/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-pressed=\{plan === choice\.plan\}/, "the chosen period is announced");
  assert.match(dialog, /disabled=\{busy \|\| saving\}/);
});

test("the preview and the write send the same fields, under the names the service reads", () => {
  // A preview that succeeded and a write that posted a differently-named field
  // would be two different deposits: the admin confirms the months they were
  // shown and the service records something else. Both calls are built from one
  // shape, and it is pinned field by field.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  const payloads = [...dialog.matchAll(/(previewFeeDeposit|depositFee)\(\{([\s\S]*?)\}\)/g)];
  assert.equal(payloads.length, 2, "one preview and one write");
  for (const [, call, body] of payloads) {
    assert.match(body, /student_id: student\.studentId/, `${call} must say which student`);
    assert.match(body, /start_month: startMonth/, `${call} must say where the period starts`);
    assert.match(body, /plan,/, `${call} must say how long the period is`);
    assert.match(body, /amount: Number\(String\(amount\)\.trim\(\)\)/, `${call} sends the total as a number`);
    assert.match(body, /note: note\.trim\(\) \|\| null/, `${call} sends no remark as null`);
  }
  // The total is handed over, not a monthly rate: the dialog must not divide it
  // into a number of months before sending.
  assert.doesNotMatch(dialog, /amount: amount \/|amount: amount \/|parseFloat\(amount\)/);
});

test("changing the shape of the deposit re-previews, so the table is never stale", () => {
  // The preview is what the confirm button is gated on. If it were fetched once
  // on open, changing the start month would leave a table of months the service
  // had already been asked about and would not now write -- and the admin would
  // confirm twelve months they never saw.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(
    dialog,
    /\}, \[plan, startMonth, amount, note, problem, student\.studentId\]\);/,
    "the preview effect must depend on every field the deposit is built from",
  );
  // And a deposit it cannot describe is not previewed at all, rather than
  // previewed from whatever was there before.
  assert.match(dialog, /if \(problem\) \{\s*setPreview\(null\);\s*return undefined;/);
  // The response from a superseded request is dropped, not rendered.
  assert.match(dialog, /if \(live\) setPreview\(data\)/);
  assert.match(dialog, /return \(\) => \{\s*live = false;/);
});

test("a failed preview says why instead of leaving a stale table on screen", () => {
  // An error the admin cannot see is worse than no preview: they would confirm
  // against months the service had already rejected.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /\.catch\(\(err\) => \{[\s\S]{0,200}setPreview\(null\)/,
    "a failed preview must clear the table");
  assert.match(dialog, /setError\(apiErrorMessage\(err\)\)/);
  assert.match(dialog, /<ErrorBanner message=\{error\} \/>/);
});

test("a failed write keeps the dialog open with the text the admin typed", () => {
  // Closing on failure would lose the amount and the remark, and the whole
  // point of the dialog is that one entry records a term.
  const dialog = source("src/components/accounts/FeeDepositDialog.jsx");
  assert.match(dialog, /catch \(err\) \{\s*setError\(apiErrorMessage\(err\)\);\s*setSaving\(false\);/,
    "a failed write must not close the dialog");
  assert.doesNotMatch(dialog, /catch \(err\) \{[^}]*onClose\(\)/);
});
