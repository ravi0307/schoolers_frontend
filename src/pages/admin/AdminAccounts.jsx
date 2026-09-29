import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as accountsApi from "../../api/accounts";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import MonthSelector from "../../components/ui/MonthSelector";
import FeeDepositDialog from "../../components/accounts/FeeDepositDialog";
import { currentMonthAnchor } from "../../utils/accountsFlow";
import { depositResultText } from "../../utils/feeDeposit";
import {
  STAFF_SORTS,
  VISIBLE_ROWS,
  filterAndSortRows,
  peopleCountLabel,
  scrollHintText,
} from "../../utils/accountsTable";
import { apiErrorMessage } from "../../api/client";
import { formatDay } from "../../utils/studentReport";

/*
 * Month grid for money.
 *
 * Each grid carries its own month selector, so an admin can hold the salary
 * window at one period and the fee window at another without losing their
 * place. The window is sent as an anchor (its last month) and the columns
 * still come from the API, so the header and the totals are always computed
 * over the same range. An unpaid cell is rendered as a dash, not a zero: "nothing recorded"
 * and "recorded as zero" are different facts, and an admin chasing unpaid
 * money needs to see which is which.
 *
 * Salaries show the last two months only, each paired with a remark, because
 * "45,000 in September" is not actionable on its own -- the question is always
 * "why", and the answer is a sentence the admin types next to the figure. Two
 * months is what makes that sentence useful: last month's remark is still in
 * view to correct, and this month's is open to write. The remark is editable
 * for a month already paid, so a correction never has to wait for the next
 * payroll run.
 *
 * Fees carry the same two months and the same remarks, and add a deposit: a
 * family hands over one amount for a term rather than a figure per month, so
 * the deposit dialog asks for the amount and the period and previews the
 * months the service will write. The preview names any month that already
 * carries an entry, because a deposit landing on a paid month is a correction
 * and not a surprise.
 */

const MONTH_LABELS = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

/** Both grids sit in a two-month window: a payment and the remark on it. */
const SALARY_MONTHS = 2;
const FEE_MONTHS = 2;

function monthLabel(month) {
  const [year, mon] = month.split("-");
  return `${MONTH_LABELS[mon] || mon} ${year.slice(2)}`;
}

/** Group a 6-digit+ number the way a ledger does, without losing decimals. */
function money(value) {
  if (value === null || value === undefined) return "";
  const [whole, frac] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

function RecordCell({ value, onSave, onClear, busy, rowName, month, paidOn }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const saving = useRef(false);

  function begin() {
    setAmount(value === null || value === undefined ? "" : String(value));
    setEditing(true);
  }

  async function commit() {
    const trimmed = amount.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      return;
    }
    // Enter and the blur that follows it both fire for one edit. Without this
    // guard the second call races the first, and for a month with no row yet
    // both try to INSERT: one wins, the other loses to the unique constraint,
    // and the admin is shown a 409 for a payment that was recorded fine. A ref,
    // not state, because the two calls land in the same render.
    if (saving.current) return;
    saving.current = true;
    try {
      const ok = await onSave(num);
      if (ok) setEditing(false);
    } finally {
      saving.current = false;
    }
  }

  if (!editing) {
    return (
      <td className="acct-cell">
        {value === null || value === undefined ? (
          <button
            type="button"
            className="acct-empty"
            onClick={begin}
            title={`No ${monthLabel(month)} entry for ${rowName}`}
          >
            —
          </button>
        ) : (
          <>
            <span className="acct-amount">
              <span className="acct-cell-actions">
                <button type="button" onClick={begin} title="Edit">✎</button>
                <button
                  type="button"
                  onClick={() => onClear()}
                  title={`Clear the ${monthLabel(month)} entry for ${rowName}`}
                >
                  ×
                </button>
              </span>
              <span className="acct-value">{money(value)}</span>
            </span>
            {paidOn && (
              <span className="acct-paid" title={`Paid on ${formatDay(paidOn)}`}>
                {formatDay(paidOn)}
              </span>
            )}
          </>
        )}
      </td>
    );
  }

  return (
    <td className="acct-cell acct-cell-editing">
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        className="acct-input"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => {
          if (amount.trim()) commit();
          else setEditing(false);
        }}
        disabled={busy}
        aria-label={`${monthLabel(month)} amount for ${rowName}`}
      />
    </td>
  );
}

function RemarkCell({ month, rowName, value, note, onSave, busy }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const saving = useRef(false);

  function begin() {
    setText(note || "");
    setEditing(true);
  }

  async function commit() {
    // A remark is a sentence, not a number: an empty one is a real answer
    // ("nothing to add"), so unlike the amount cell it is saved even when
    // blank. It only becomes an edit if the text actually changed.
    const trimmed = text.trim();
    if (trimmed === (note || "").trim()) {
      setEditing(false);
      return;
    }
    // Same double-fire as the amount cell: Enter, then the blur. A ref, so the
    // second call sees the first as in flight rather than racing it.
    if (saving.current) return;
    saving.current = true;
    try {
      const ok = await onSave(trimmed || null);
      if (ok) setEditing(false);
    } finally {
      saving.current = false;
    }
  }

  // A remark belongs to a payment. An unpaid month has nothing to explain, so
  // the cell is inert rather than inviting a note against a figure that is not
  // there.
  if (value === null || value === undefined) {
    return (
      <td className="acct-note-cell">
        <span className="acct-note-blank" title={`No ${monthLabel(month)} entry for ${rowName}, so there is nothing to remark on`}>
          —
        </span>
      </td>
    );
  }

  if (!editing) {
    return (
      <td className="acct-note-cell">
        <button
          type="button"
          className="acct-note"
          onClick={begin}
          title={note
            ? `Edit the ${monthLabel(month)} remark for ${rowName}`
            : `Add a remark about ${rowName}'s ${monthLabel(month)} payment`}
        >
          {note || "Add a remark"}
        </button>
      </td>
    );
  }

  return (
    <td className="acct-note-cell acct-cell-editing">
      <input
        autoFocus
        type="text"
        className="acct-input acct-input-note"
        value={text}
        maxLength={200}
        placeholder="Remark"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        disabled={busy}
        aria-label={`${monthLabel(month)} remark for ${rowName}`}
      />
    </td>
  );
}

function SheetTable({
  sheet,
  idOf,
  nameOf,
  secondaryOf,
  onSave,
  onSaveNote,
  onClear,
  busy,
  emptyText,
  noMatchText,
  nameHeader,
  label,
  singular,
  withRemarks = false,
  rowAction = null,
  rowActionLabel = "",
  rowActionTitle = "",
}) {
  const months = sheet?.months || [];
  const allRows = sheet?.rows || [];
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");

  const rows = filterAndSortRows({ rows: allRows, months, query, sort, nameOf, secondaryOf });
  const scrollNote = scrollHintText(rows.length);

  // Pin the scroll box to six rows. Measuring the real row height keeps the
  // sticky header sitting above the first row instead of on top of it, which
  // a hard-coded pixel height would get wrong at any other font size.
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const head = box.querySelector("thead tr");
    const row = box.querySelector("tbody tr");
    if (!head || !row) return;
    const headHeight = head.getBoundingClientRect().height;
    const rowHeight = row.getBoundingClientRect().height;
    if (!rowHeight) return;
    box.style.maxHeight = `${Math.round(headHeight + rowHeight * VISIBLE_ROWS)}px`;
  }, [rows.length, months.length, sort, query]);

  // A filter change can leave the list scrolled past its new end, which reads
  // as an empty grid. Send it back to the top.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = 0;
  }, [query, sort, months.length]);

  if (!allRows.length) {
    return <Empty>{emptyText}</Empty>;
  }

  return (
    <>
      <div className="acct-controls">
        <input
          className="field acct-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label} by name`}
          aria-label={`Search ${label} by name`}
        />
        <select
          className="acct-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={`Sort ${label}`}
        >
          {Object.entries(STAFF_SORTS).map(([value, { label: text }]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
        <span className="acct-count">
          {peopleCountLabel({ matched: rows.length, total: allRows.length, singular, plural: label })}
        </span>
        {scrollNote && <span className="acct-scroll-hint">{scrollNote}</span>}
      </div>

      {!rows.length ? (
        <Empty>{noMatchText}</Empty>
      ) : (
        <div className="table-card">
          <div className="table-scroll acct-vertical" ref={scrollRef}>
            <table className="data-table acct-table">
              <thead>
                <tr>
                  <th className="acct-sticky">{nameHeader}</th>
                  {months.map((m) => (
                    <Fragment key={m}>
                      <th className={withRemarks ? "acct-month acct-month-lead" : "acct-month"}>
                        {monthLabel(m)}
                        {withRemarks && <span className="acct-col-sub">amount</span>}
                      </th>
                      {withRemarks && <th className="acct-note-head">remark</th>}
                    </Fragment>
                  ))}
                  {/* A header for the action column, so the button below it is
                      labelled rather than floating at the end of the row. */}
                  {rowAction && <th className="acct-action-head">{rowActionLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = idOf(row);
                  const name = nameOf(row);
                  return (
                    <tr key={id}>
                      <th scope="row" className="acct-sticky">
                        <div className="acct-person">
                          <span className="acct-person-name">{name}</span>
                          {secondaryOf(row) && (
                            <span className="acct-person-meta">{secondaryOf(row)}</span>
                          )}
                        </div>
                      </th>
                      {months.map((m) => (
                        <Fragment key={m}>
                          <RecordCell
                            month={m}
                            rowName={name}
                            value={row.amounts?.[m]}
                            paidOn={row.paid_on?.[m]}
                            busy={busy}
                            onSave={(amount) => onSave(id, m, amount, row.notes?.[m] ?? null)}
                            onClear={() => onClear(id, m)}
                          />
                          {withRemarks && (
                            <RemarkCell
                              month={m}
                              rowName={name}
                              value={row.amounts?.[m]}
                              note={row.notes?.[m]}
                              busy={busy}
                              onSave={(next) => onSaveNote(id, m, row.amounts?.[m], next)}
                            />
                          )}
                        </Fragment>
                      ))}
                      {/* The row's own action sits at the far right, after the
                          figures. It acts on the whole row rather than on any
                          one month, so it reads as what it is: a separate
                          action, not another column of the grid. */}
                      {rowAction && (
                        <td className="acct-action-cell">
                          <button
                            type="button"
                            className="acct-row-action"
                            onClick={() => rowAction({ row, id, name })}
                            disabled={busy}
                            title={rowActionTitle.replace("{name}", name)}
                          >
                            {rowActionLabel}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminAccounts() {
  // Each grid pages independently: an admin comparing September salaries
  // against March fees needs the two windows to move separately.
  const [salaryAnchor, setSalaryAnchor] = useState(() => currentMonthAnchor());
  const [feeAnchor, setFeeAnchor] = useState(() => currentMonthAnchor());
  const salaries = useApi(() => accountsApi.salarySheet(SALARY_MONTHS, salaryAnchor), [salaryAnchor]);
  const fees = useApi(() => accountsApi.feeSheet(FEE_MONTHS, feeAnchor), [feeAnchor]);
  // The deposit periods come from the server, so a plan the dialog offers is
  // by construction one the service can split with. They are also stable, so
  // they are fetched once: the labels are not worth a refetch per grid page.
  const plans = useApi(() => accountsApi.feePlans(), []);
  const [depositFor, setDepositFor] = useState(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // A deposit writes months beyond the two the grid shows, so the dialog is
  // given the grid's own anchor as its starting point: the admin pages to the
  // month they mean to start from, and the period runs forward from there.
  function beginDeposit({ id, name, row }) {
    setDepositFor({
      studentId: id,
      name,
      secondary: [row?.class_name, row?.admission_no].filter(Boolean).join(" · "),
    });
  }

  function depositSaved(plan) {
    setDepositFor(null);
    fees.refetch();
    toast(depositResultText(plan));
  }

  // The amount is stored on the same row as the remark, so an amount edit
  // re-sends the remark already on the server. Without it the server would
  // take "no remark in this payload" as "no remark", and correcting a figure
  // would quietly delete the sentence explaining it. The remark comes from the
  // row in view, so it cannot drift while the admin types.
  async function save(kind, id, month, amount, note = null) {
    setBusy(true);
    try {
      if (kind === "salary") {
        await accountsApi.recordSalary({ staff_id: id, month, amount, note });
      } else {
        await accountsApi.recordFee({ student_id: id, month, amount, note });
      }
      if (kind === "salary") salaries.refetch();
      else fees.refetch();
      toast(`${monthLabel(month)} recorded`);
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  // A remark is stored on the payment, so saving one re-sends the amount that
  // is already on the server rather than reading the cell back. The value
  // comes from the row the admin is looking at, so the figure cannot drift
  // while they type, and the paid date is left out -- editing a remark is not
  // a second payment, and must not restamp the day it was made.
  async function saveNote(kind, id, month, amount, note) {
    setBusy(true);
    try {
      if (kind === "salary") {
        await accountsApi.recordSalary({ staff_id: id, month, amount, note });
        salaries.refetch();
      } else {
        await accountsApi.recordFee({ student_id: id, month, amount, note });
        fees.refetch();
      }
      toast(note ? `${monthLabel(month)} remark saved` : `${monthLabel(month)} remark cleared`);
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function clear(kind, id, month) {
    setBusy(true);
    try {
      if (kind === "salary") {
        await accountsApi.clearSalary(id, month);
      } else {
        await accountsApi.clearFee(id, month);
      }
      if (kind === "salary") salaries.refetch();
      else fees.refetch();
      toast(`${monthLabel(month)} entry cleared`);
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Each grid reports its own loading and error state. With independent
  // selectors, one shared spinner would blank both tables every time an admin
  // paged one of them.
  const salarySheet = salaries.data;
  const feeSheet = fees.data;

  return (
    <AdminShell>
      <div className="scr-title">Accounts</div>
      <div className="scr-sub">
        Staff salaries and student fees for the last two months, each with a
        remark you can add or correct. Each table has its own period selector,
        so you can compare different months side by side. Click an empty cell
        to record a payment, or use ✎ to correct one. Where a family pays for
        a term rather than month by month, use Deposit to record the whole
        period in one go.
      </div>

      {salaries.error && <ErrorBanner message={salaries.error} />}

      {salaries.loading && !salarySheet && <Spinner label="Loading salaries" />}

      {salarySheet && (
        <>
            <section className="card white">
              <div className="scr-title-row">
                <div className="section-label" style={{ marginTop: 0 }}>Staff salaries</div>
                <MonthSelector
                  anchor={salaryAnchor}
                  onChange={setSalaryAnchor}
                  busy={busy}
                  label="salary period"
                  months={SALARY_MONTHS}
                />
              </div>
              <div className="scr-sub" style={{ marginBottom: 12 }}>
                <span>
                  {salarySheet?.rows?.length || 0} staff ·{" "}
                  {money(salarySheet?.total_paid)} paid ·{" "}
                  {salarySheet?.total_outstanding_months || 0} unpaid months
                </span>
              </div>
              <SheetTable
                sheet={salarySheet}
                nameHeader="Staff"
                label="staff"
                singular="staff"
                idOf={(r) => r.staff_id}
                nameOf={(r) => r.staff_name}
                secondaryOf={(r) => r.designation}
                busy={busy}
                withRemarks
                onSave={(id, m, amount, note) => save("salary", id, m, amount, note)}
                onSaveNote={(id, m, amount, note) => saveNote("salary", id, m, amount, note)}
                onClear={(id, m) => clear("salary", id, m)}
                emptyText="No active staff yet. Add staff under Set up to track salaries."
                noMatchText="No staff match that search."
              />
            </section>

        </>
      )}

      {fees.error && <ErrorBanner message={fees.error} />}

      {fees.loading && !feeSheet && <Spinner label="Loading fees" />}

      {feeSheet && (
        <>
          <section className="card white">
              <div className="scr-title-row">
                <div className="section-label" style={{ marginTop: 0 }}>Student fees</div>
                <MonthSelector
                  anchor={feeAnchor}
                  onChange={setFeeAnchor}
                  busy={busy}
                  label="fee period"
                  months={FEE_MONTHS}
                  // A deposit records the months after the one it starts in, so
                  // the fee grid holds figures beyond this month and has to be
                  // readable out there.
                  allowFuture
                />
              </div>
              <div className="scr-sub" style={{ marginBottom: 12 }}>
                <span>
                  {feeSheet?.rows?.length || 0} students ·{" "}
                  {money(feeSheet?.total_collected)} collected ·{" "}
                  {feeSheet?.outstanding_count || 0} with unpaid months
                </span>
              </div>
              <SheetTable
                sheet={feeSheet}
                nameHeader="Student"
                label="students"
                singular="student"
                idOf={(r) => r.student_id}
                nameOf={(r) => r.student_name}
                secondaryOf={(r) => [r.class_name, r.admission_no].filter(Boolean).join(" · ")}
                busy={busy}
                withRemarks
                onSave={(id, m, amount, note) => save("fee", id, m, amount, note)}
                onSaveNote={(id, m, amount, note) => saveNote("fee", id, m, amount, note)}
                onClear={(id, m) => clear("fee", id, m)}
                rowAction={beginDeposit}
                rowActionLabel="Deposit"
                rowActionTitle="Record a deposit for {name}"
                emptyText="No active students yet. Add students under Set up to track fees."
                noMatchText="No students match that search."
              />
            </section>

            {depositFor && plans.data && (
              <FeeDepositDialog
                student={depositFor}
                plans={plans.data.plans}
                anchor={feeAnchor}
                busy={busy}
                onClose={() => setDepositFor(null)}
                onSaved={depositSaved}
              />
            )}
            {depositFor && plans.error && (
              <ErrorBanner message={`Could not load the deposit periods: ${plans.error}`} />
            )}
        </>
      )}
    </AdminShell>
  );
}
