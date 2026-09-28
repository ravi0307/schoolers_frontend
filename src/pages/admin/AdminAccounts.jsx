import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as accountsApi from "../../api/accounts";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import MonthSelector from "../../components/ui/MonthSelector";
import { currentMonthAnchor } from "../../utils/accountsFlow";
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
 * Six-month month grid for money.
 *
 * Each grid carries its own month selector, so an admin can hold the salary
 * window at one period and the fee window at another without losing their
 * place. The window is sent as an anchor (its last month) and the columns
 * still come from the API, so the header and the totals are always computed
 * over the same range. An unpaid cell is rendered as a dash, not a zero: "nothing recorded"
 * and "recorded as zero" are different facts, and an admin chasing unpaid
 * money needs to see which is which.
 */

const MONTH_LABELS = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

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
    const ok = await onSave(num);
    if (ok) setEditing(false);
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

function SheetTable({
  sheet,
  idOf,
  nameOf,
  secondaryOf,
  onSave,
  onClear,
  busy,
  emptyText,
  noMatchText,
  nameHeader,
  label,
  singular,
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
                    <th key={m} className="acct-month">{monthLabel(m)}</th>
                  ))}
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
                        <RecordCell
                          key={m}
                          month={m}
                          rowName={name}
                          value={row.amounts?.[m]}
                          paidOn={row.paid_on?.[m]}
                          busy={busy}
                          onSave={(amount) => onSave(id, m, amount)}
                          onClear={() => onClear(id, m)}
                        />
                      ))}
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
  const salaries = useApi(() => accountsApi.salarySheet(6, salaryAnchor), [salaryAnchor]);
  const fees = useApi(() => accountsApi.feeSheet(6, feeAnchor), [feeAnchor]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save(kind, id, month, amount) {
    setBusy(true);
    try {
      if (kind === "salary") {
        await accountsApi.recordSalary({ staff_id: id, month, amount });
      } else {
        await accountsApi.recordFee({ student_id: id, month, amount });
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
        Staff salaries and student fees over six months. Each table has its own
        period selector, so you can compare different months side by side.
        Click an empty cell to record a payment, or use ✎ to correct one.
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
                onSave={(id, m, amount) => save("salary", id, m, amount)}
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
                onSave={(id, m, amount) => save("fee", id, m, amount)}
                onClear={(id, m) => clear("fee", id, m)}
                emptyText="No active students yet. Add students under Set up to track fees."
                noMatchText="No students match that search."
              />
            </section>
        </>
      )}
    </AdminShell>
  );
}
