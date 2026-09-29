import { useEffect, useRef, useState } from "react";
import * as accountsApi from "../../api/accounts";
import { apiErrorMessage } from "../../api/client";
import { ErrorBanner, Spinner } from "../ui/Primitives";
import {
  depositProblem,
  depositRangeLabel,
  depositResultText,
  depositRows,
  formatAmount,
  planChoices,
  planMonthsLabel,
  replacementWarning,
} from "../../utils/feeDeposit";
import { toMonthInputValue } from "../../utils/accountsFlow";
import MonthYearPicker from "../ui/MonthYearPicker";

/**
 * Recording one fee payment for a period.
 *
 * A parent hands the office one amount for a term, so the dialog asks for the
 * amount and the period, and the service does the rest. The months it will
 * write are previewed live, and any month that already carries an entry is
 * named before the admin can replace it -- a deposit is allowed to land on a
 * month that is already paid (that is a correction), but never by surprise.
 */
export default function FeeDepositDialog({ student, plans, anchor, busy, onClose, onSaved }) {
  const [plan, setPlan] = useState("");
  const [startMonth, setStartMonth] = useState(() => toMonthInputValue(anchor));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  const choices = planChoices(plans);
  const problem = depositProblem({ plan, startMonth, amount });
  const warning = replacementWarning(preview);

  // Re-preview whenever the deposit changes shape. The arithmetic is the
  // server's, so the dialog never shows a split it worked out itself and the
  // confirm button is only enabled against a preview the server produced.
  useEffect(() => {
    if (problem) {
      setPreview(null);
      return undefined;
    }
    let live = true;
    setPreviewing(true);
    accountsApi
      .previewFeeDeposit({
        student_id: student.studentId,
        start_month: startMonth,
        plan,
        amount: Number(String(amount).trim()),
        note: note.trim() || null,
      })
      .then((data) => {
        if (live) setPreview(data);
      })
      .catch((err) => {
        if (live) {
          setPreview(null);
          setError(apiErrorMessage(err));
        }
      })
      .finally(() => {
        if (live) setPreviewing(false);
      });
    return () => {
      live = false;
    };
  }, [plan, startMonth, amount, note, problem, student.studentId]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (problem || saving || busy) return;
    setSaving(true);
    setError("");
    try {
      const result = await accountsApi.depositFee({
        student_id: student.studentId,
        start_month: startMonth,
        plan,
        amount: Number(String(amount).trim()),
        note: note.trim() || null,
      });
      onSaved(result);
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box fd-box"
        onClick={(e) => e.stopPropagation()}
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Record a fee deposit for ${student.name}`}
      >
        <div className="sr-head">
          <div className="sr-head-text">
            <div className="sr-name">Record fee deposit</div>
            <div className="sr-sub">
              {[student.name, student.secondary].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="fd-body">
          {error && <ErrorBanner message={error} />}

          <div className="fd-field">
            <span className="fd-label" id="fd-plan-label">Paid</span>
            <div className="fd-plans" role="group" aria-labelledby="fd-plan-label">
              {choices.map((choice) => (
                <button
                  key={choice.plan}
                  type="button"
                  className={`fd-plan ${plan === choice.plan ? "fd-plan-on" : ""}`}
                  onClick={() => setPlan(choice.plan)}
                  disabled={busy || saving}
                  aria-pressed={plan === choice.plan}
                >
                  <span className="fd-plan-label">{choice.label}</span>
                  <span className="fd-plan-months">{planMonthsLabel(choice.months)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fd-row">
            <fieldset className="fd-field">
              <legend className="fd-label">Starting from</legend>
              {/* The same month and year dropdowns the grids use. A deposit
                  writes months ahead by design -- a yearly plan from this month
                  reaches twelve past it -- so this picker is given no boundary
                  and lets the admin start it wherever the term began. */}
              <MonthYearPicker
                value={startMonth}
                onChange={setStartMonth}
                disabled={busy || saving}
                monthLabel="Starting month"
                yearLabel="Starting year"
              />
            </fieldset>
            <label className="fd-field">
              <span className="fd-label" htmlFor="fd-amount">Amount received</span>
              <input
                id="fd-amount"
                className="field"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                disabled={busy || saving}
                autoFocus
              />
            </label>
          </div>

          <label className="fd-field">
            <span className="fd-label" htmlFor="fd-note">Remark (optional)</span>
            <input
              id="fd-note"
              className="field"
              type="text"
              maxLength={200}
              placeholder="cheque 1042, paid in cash"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy || saving}
            />
          </label>

          {previewing && <Spinner label="Working out the months..." />}

          {preview && (
            <div className="fd-preview">
              <div className="fd-preview-head">
                <span className="fd-preview-title">
                  {depositRangeLabel(preview)} · {formatAmount(preview.total)} received
                </span>
                <span className="fd-preview-sub">
                  {planChoices(plans).find((c) => c.plan === preview.plan)?.label} ·
                  {" "}{depositRows(preview).length} {depositRows(preview).length === 1 ? "month" : "months"}
                </span>
              </div>
              <table className="data-table fd-table">
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col" className="fd-num">Amount</th>
                    <th scope="col" className="fd-state">State</th>
                  </tr>
                </thead>
                <tbody>
                  {depositRows(preview).map((row) => (
                    <tr key={row.month} className={row.replaced ? "fd-row-replaced" : ""}>
                      <th scope="row">{row.label}</th>
                      <td className="fd-num">{formatAmount(row.amount)}</td>
                      <td className="fd-state">
                        {row.replaced
                          ? <span className="fd-tag fd-tag-replaced">replaces an entry</span>
                          : <span className="fd-tag fd-tag-new">new</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {warning && <p className="fd-warning">{warning}</p>}
          {problem && !warning && <p className="fd-hint">{problem}</p>}
          {preview && !warning && !problem && (
            <p className="fd-hint">{depositResultText(preview)}</p>
          )}

          <div className="fd-actions">
            <button className="btn ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn gold"
              type="button"
              onClick={submit}
              disabled={!preview || !!problem || saving || busy}
            >
              {saving ? "Recording..." : "Record deposit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
