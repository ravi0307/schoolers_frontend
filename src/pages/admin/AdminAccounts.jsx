import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as accountsApi from "../../api/accounts";
import { useToast } from "../../context/ToastContext";
import { ErrorBanner } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import FormField from "../../components/ui/FormField";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import MonthSelector from "../../components/ui/MonthSelector";
import FeeDepositDialog from "../../components/accounts/FeeDepositDialog";
import { currentMonthAnchor } from "../../utils/accountsFlow";
import { depositResultText } from "../../utils/feeDeposit";
import {
  STAFF_SORTS,
  filterAndSortRows,
  peopleCountLabel,
} from "../../utils/accountsTable";
import { apiErrorMessage } from "../../api/client";
import { formatDay } from "../../utils/studentReport";
import { Pencil, Plus, Search, X } from "lucide-react";
import styles from "./AdminAccounts.module.css";

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
  return `${MONTH_LABELS[mon] || mon} ${year}`;
}

function shortPaidDate(value) {
  return formatDay(value).replace(/\s+\d{4}$/, "");
}

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 20 });

function money(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? numberFormatter.format(amount) : String(value);
}

function RecordCell({ value, onSave, onClear, busy, rowName, month, paidOn, headers }) {
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
      <td className={styles.amountCell} data-label={`${MONTH_LABELS[month.slice(-2)] || month}:`} headers={headers}>
        {value === null || value === undefined ? (
          <button
            type="button"
            className={styles.recordButton}
            onClick={begin}
            aria-label={`Record payment for ${rowName}, ${monthLabel(month)}`}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Record</span>
          </button>
        ) : (
          <>
            <span className={styles.amount}>
              <span className={styles.cellActions}>
                <button type="button" onClick={begin} aria-label={`Edit ${monthLabel(month)} payment for ${rowName}`}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onClear()}
                  aria-label={`Clear the ${monthLabel(month)} payment for ${rowName}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </span>
              <span
                className={styles.amountValue}
                title={paidOn ? `Paid on ${formatDay(paidOn)}` : undefined}
              >
                {money(value)}
              </span>
              {paidOn && (
                <span className={styles.paid} title={`Paid on ${formatDay(paidOn)}`}>
                  {shortPaidDate(paidOn)}
                </span>
              )}
            </span>
          </>
        )}
      </td>
    );
  }

  return (
    <td className={`${styles.amountCell} ${styles.cellEditing}`} data-label={`${MONTH_LABELS[month.slice(-2)] || month}:`} headers={headers}>
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        className={styles.amountInput}
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

function RemarkCell({ month, rowName, value, note, onSave, busy, headers }) {
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
      <td className={styles.remarkCell} data-label={`${MONTH_LABELS[month.slice(-2)] || month}: Remark`} headers={headers}>
        <span className={styles.remarkBlank} title={`No ${monthLabel(month)} entry for ${rowName}, so there is nothing to remark on`}>
          —
        </span>
      </td>
    );
  }

  if (!editing) {
    return (
      <td className={styles.remarkCell} data-label={`${MONTH_LABELS[month.slice(-2)] || month}: Remark`} headers={headers}>
        <button
          type="button"
          className={styles.remarkButton}
          onClick={begin}
          aria-label={note
            ? `Edit ${monthLabel(month)} remark for ${rowName}: ${note}`
            : `Add a remark about ${rowName}'s ${monthLabel(month)} payment`}
          title={note || `Add a remark about ${rowName}'s ${monthLabel(month)} payment`}
        >
          {note ? <span>{note}</span> : <><Pencil size={14} aria-hidden="true" /> Add a remark</>}
        </button>
      </td>
    );
  }

  return (
    <td className={`${styles.remarkCell} ${styles.cellEditing}`} data-label={`${MONTH_LABELS[month.slice(-2)] || month}: Remark`} headers={headers}>
      <input
        autoFocus
        type="text"
        className={`${styles.amountInput} ${styles.remarkInput}`}
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
  id,
  title,
  summary,
  period,
  idOf,
  nameOf,
  secondaryOf,
  onSave,
  onSaveNote,
  onClear,
  busy,
  emptyText,
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
  const tableId = id;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");

  const rows = filterAndSortRows({ rows: allRows, months, query, sort, nameOf, secondaryOf });
  const scrollRef = useRef(null);

  // A filter change can leave the list scrolled past its new end.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = 0;
  }, [query, sort, months.length]);

  return (
    <div className={styles.sheetContent}>
      <div className={styles.cardHeader}>
        <div className={styles.headingGroup}>
          <h2 className={styles.cardTitle}>{title}</h2>
          <div className={styles.sheetSummary} role="group" aria-label={`${title} summary`}>{summary}</div>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.searchControl}>
            <Search size={18} aria-hidden="true" />
            <FormField id={`${tableId}-search`} label={`Search ${label} by name`}>
              <input
                id={`${tableId}-search`}
                className={styles.searchInput}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label} by name`}
              />
            </FormField>
          </div>
          <FormField id={`${tableId}-sort`} label={`Sort ${label}`}>
            <select
              id={`${tableId}-sort`}
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {Object.entries(STAFF_SORTS).map(([value, { label: text }]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </FormField>
          <div className={styles.period}>{period}</div>
          <span className={styles.count}>
            {peopleCountLabel({ matched: rows.length, total: allRows.length, singular, plural: label })}
          </span>
        </div>
      </div>

      {!allRows.length ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : !rows.length ? (
        <EmptyState>No {singular} match “{query.trim()}”.</EmptyState>
      ) : (
        <DataTable label={`${label} payment records`} className={styles.tableRegion}>
          <div className={styles.tableScroll} ref={scrollRef}>
            <table className={`data-table ${styles.table} ${rowAction ? styles.feeTable : styles.salaryTable}`}>
              <caption className={styles.visuallyHidden}>{label} payment records by month</caption>
              <colgroup>
                <col className={styles.nameColumn} />
                {months.map((month) => (
                  <Fragment key={month}>
                    <col className={styles.amountColumn} />
                    {withRemarks && <col className={styles.remarkColumn} />}
                  </Fragment>
                ))}
                {rowAction && <col className={styles.actionColumn} />}
              </colgroup>
              <thead>
                <tr>
                  <th id={`${tableId}-name-column`} rowSpan={2} scope="col">{nameHeader}</th>
                  {months.map((month) => (
                    <th key={month} id={`${tableId}-${month}-group`} scope="colgroup" colSpan={withRemarks ? 2 : 1} className={styles.monthGroup}>
                      {monthLabel(month)}
                    </th>
                  ))}
                  {rowAction && <th id={`${tableId}-deposit-column`} rowSpan={2} scope="col" className={styles.actionHeader}>{rowActionLabel}</th>}
                </tr>
                {withRemarks && (
                  <tr>
                    {months.map((month) => (
                      <Fragment key={month}>
                        <th id={`${tableId}-${month}-amount-column`} scope="col" headers={`${tableId}-${month}-group`} className={styles.numericHeader}>Amount</th>
                        <th id={`${tableId}-${month}-remark-column`} scope="col" headers={`${tableId}-${month}-group`}>Remark</th>
                      </Fragment>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowId = idOf(row);
                  const name = nameOf(row);
                  return (
                    <tr key={rowId}>
                      <th scope="row" className={styles.personCell} data-label={nameHeader}>
                        <div
                          className={styles.person}
                          title={[name, secondaryOf(row)].filter(Boolean).join(" · ")}
                        >
                          <span className={styles.personName}>{name}</span>
                          {secondaryOf(row) && <>
                            <span aria-hidden="true" className={styles.personSeparator}> · </span>
                            <span className={styles.personMeta}>{secondaryOf(row)}</span>
                          </>}
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
                            onSave={(amount) => onSave(rowId, m, amount, row.notes?.[m] ?? null)}
                            onClear={() => onClear(rowId, m)}
                            headers={`${tableId}-${m}-group ${tableId}-${m}-amount-column`}
                          />
                          {withRemarks && (
                            <RemarkCell
                              month={m}
                              rowName={name}
                              value={row.amounts?.[m]}
                              note={row.notes?.[m]}
                              busy={busy}
                              onSave={(next) => onSaveNote(rowId, m, row.amounts?.[m], next)}
                              headers={`${tableId}-${m}-group ${tableId}-${m}-remark-column`}
                            />
                          )}
                        </Fragment>
                      ))}
                      {/* The row's own action sits at the far right, after the
                          figures. It acts on the whole row rather than on any
                          one month, so it reads as what it is: a separate
                          action, not another column of the grid. */}
                      {rowAction && (
                        <td className={styles.actionCell} data-label={rowActionLabel} headers={`${tableId}-deposit-column`}>
                          <Button
                            variant="outline"
                            className={styles.depositButton}
                            onClick={(event) => rowAction({ row, id: rowId, name, trigger: event.currentTarget })}
                            disabled={busy}
                            title={rowActionTitle.replace("{name}", name)}
                            aria-label={`Record a term deposit for ${name}`}
                          >
                            {rowActionLabel}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataTable>
      )}
    </div>
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
  const depositTriggerRef = useRef(null);
  const restoreDepositFocusRef = useRef(false);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const closeDeposit = useCallback(() => setDepositFor(null), []);

  useEffect(() => {
    if (!depositFor && restoreDepositFocusRef.current) {
      restoreDepositFocusRef.current = false;
      if (depositTriggerRef.current?.isConnected) depositTriggerRef.current.focus();
    }
  }, [depositFor]);

  // A deposit writes months beyond the two the grid shows, so the dialog is
  // given the grid's own anchor as its starting point: the admin pages to the
  // month they mean to start from, and the period runs forward from there.
  function beginDeposit({ id, name, row, trigger }) {
    depositTriggerRef.current = trigger;
    restoreDepositFocusRef.current = true;
    setDepositFor({
      studentId: id,
      name,
      secondary: [row?.class_name, row?.admission_no].filter(Boolean).join(" · "),
    });
  }

  function depositSaved(plan) {
    closeDeposit();
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
      <main className={styles.accounts}>
      <PageHeader
        title="Accounts"
        subtitle="Record staff salaries and student fees. Click an empty cell to add a payment, use the pencil to correct one, or use Deposit for a whole term."
        className={styles.pageHeader}
      />
      <details className={styles.help}>
        <summary>How this works</summary>
        <p>
          Each table has its own period selector, so you can compare different
          months side by side. Salary and fee tables show two months at a time.
          Add or correct a remark beside a payment. A fee deposit records one
          amount across a selected term; the preview lists the months it will
          affect and flags any existing entries before you confirm.
        </p>
      </details>

      {salaries.error && <ErrorBanner message={salaries.error} />}

      {salaries.loading && !salarySheet && <Skeleton lines={4} label="Loading salaries" />}

      {salarySheet && (
        <Card as="section" className={styles.sheetCard}>
              <SheetTable
                sheet={salarySheet}
                id="salary"
                title="Staff salaries"
                summary={
                  <>
                    <span className={styles.statChip}>
                      <span>Staff</span><strong>{numberFormatter.format(salarySheet?.rows?.length || 0)}</strong>
                    </span>
                    <span className={`${styles.statChip} ${styles.statSuccess}`}>
                      <span>Paid</span><strong>{money(salarySheet?.total_paid) || "0"}</strong>
                    </span>
                    <span className={`${styles.statChip} ${styles.statWarning}`}>
                      <span>Unpaid months</span><strong>{numberFormatter.format(salarySheet?.total_outstanding_months || 0)}</strong>
                    </span>
                  </>
                }
                period={
                <MonthSelector
                  anchor={salaryAnchor}
                  onChange={setSalaryAnchor}
                  busy={busy}
                  label="salary period"
                  months={SALARY_MONTHS}
                />
                }
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
              />
        </Card>
      )}

      {fees.error && <ErrorBanner message={fees.error} />}

      {fees.loading && !feeSheet && <Skeleton lines={4} label="Loading fees" />}

      {feeSheet && (
        <>
        <Card as="section" className={styles.sheetCard}>
              <SheetTable
                sheet={feeSheet}
                id="fees"
                title="Student fees"
                summary={
                  <>
                    <span className={styles.statChip}>
                      <span>Students</span><strong>{numberFormatter.format(feeSheet?.rows?.length || 0)}</strong>
                    </span>
                    <span className={`${styles.statChip} ${styles.statSuccess}`}>
                      <span>Collected</span><strong>{money(feeSheet?.total_collected) || "0"}</strong>
                    </span>
                    <span className={`${styles.statChip} ${styles.statWarning}`}>
                      <span>With unpaid months</span><strong>{numberFormatter.format(feeSheet?.outstanding_count || 0)}</strong>
                    </span>
                  </>
                }
                period={
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
                }
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
              />
        </Card>

            {depositFor && plans.data && (
              <FeeDepositDialog
                student={depositFor}
                plans={plans.data.plans}
                anchor={feeAnchor}
                busy={busy}
                onClose={closeDeposit}
                onSaved={depositSaved}
              />
            )}
            {depositFor && plans.error && (
              <ErrorBanner message={`Could not load the deposit periods: ${plans.error}`} />
            )}
        </>
      )}
      </main>
    </AdminShell>
  );
}
