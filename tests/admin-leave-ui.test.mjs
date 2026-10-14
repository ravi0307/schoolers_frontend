import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/pages/admin/AdminLeave.jsx", "utf8");
const styles = fs.readFileSync("src/pages/admin/AdminLeave.module.css", "utf8");

test("leave actions use responsive styles and accessible names", () => {
  assert.match(page, /import styles from "\.\/AdminLeave\.module\.css"/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(page, /aria-label=\{`Approve leave request from/);
  assert.match(page, /aria-label=\{`Reject leave request from/);
  assert.match(styles, /var\(--space-2\)/);
  assert.match(styles, /@media \(max-width: 42rem\)/);
});

test("approve and reject open a remark dialog with confirm and cancel", () => {
  assert.match(page, /from "\.\.\/\.\.\/components\/ui\/Modal"/);
  assert.match(page, /openDecision\(l, "Approved"\)/);
  assert.match(page, /openDecision\(l, "Rejected"\)/);
  assert.match(page, /titleId="leave-decision-title"/);
  assert.match(page, /<label htmlFor="leave-decision-remark">Remark \(optional\)<\/label>/);
  assert.match(page, /<textarea/);
  assert.match(page, />Cancel<\/button>/);
  assert.match(page, /\{\s*remark:\s*remark\.trim\(\)\s*\}/);
  assert.match(page, /leaveApi\.approveLeave\(decision\.request\.leave_id, body\)/);
  assert.match(page, /leaveApi\.rejectLeave\(decision\.request\.leave_id, body\)/);
});

test("leave history is a structured table showing decision remarks", () => {
  assert.match(page, /className="card table-card"/);
  assert.match(page, /className="table-scroll"/);
  assert.match(page, /className="data-table"/);
  assert.match(page, /<th>Request<\/th>/);
  assert.match(page, /<th>Period<\/th>/);
  assert.match(page, /<th>Status<\/th>/);
  assert.match(page, /<th>Remark<\/th>/);
  assert.match(page, /l\.review_remark/);
  assert.match(styles, /\.historySub\s*\{/);
  assert.match(styles, /\.historyRemark\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.historyEmpty\s*\{/);
});
