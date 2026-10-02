import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import {
  formatHolidayLength,
  formatHolidaySpan,
  groupHolidayRows,
  rangeLength,
} from "../../utils/holidayRange";
import styles from "./AdminHolidays.module.css";

/**
 * Manage the school's holiday calendar.
 *
 * A holiday is one occasion across one day or a span of consecutive days. The
 * API stores a span as one row per day, so "Diwali, 8-11 Nov" arrives as four
 * rows; they are grouped back together here into the single entry the admin
 * typed. Every day of a span reddens its own column of the timetable.
 *
 * Editing happens in place rather than in a dialog because the change is a few
 * fields wide, and seeing the row being edited keeps it obvious which holiday is
 * being changed. Update and Remove act on the whole span: removing one day of a
 * break and leaving the rest behind would read as a bug.
 */

const EMPTY_DRAFT = { occasion: "", holiday_date: "", end_date: "" };

function validate({ occasion, holiday_date, end_date }) {
  if (!occasion.trim()) return "Enter the occasion name";
  if (!holiday_date) return "Choose the first date";
  // An end date earlier than the start is refused here rather than sent on,
  // so the admin is told at the field they are looking at.
  if (end_date && end_date < holiday_date) {
    return "The last date cannot be before the first";
  }
  return null;
}

export default function AdminHolidays() {
  const { data: holidays, loading, error, refetch } = useApi(
    () => academicsApi.listHolidays(),
    []
  );
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const toast = useToast();

  const rows = groupHolidayRows(holidays);
  const addError = validate(draft);
  const addLength = rangeLength(draft.holiday_date, draft.end_date);

  async function run(action, successMessage) {
    setBusy(true);
    try {
      await action();
      toast(successMessage);
      refetch();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addHoliday(event) {
    event.preventDefault();
    if (busy || addError) return;
    const payload = {
      occasion: draft.occasion.trim(),
      holiday_date: draft.holiday_date,
      // Omitted entirely for a single day, so the server takes its ordinary
      // one-day path rather than being handed a same-day "range".
      ...(draft.end_date ? { end_date: draft.end_date } : {}),
    };
    const ok = await run(
      () => academicsApi.createHoliday(payload),
      `${payload.occasion} added`
    );
    if (ok) setDraft(EMPTY_DRAFT);
  }

  async function saveEdit(event) {
    event.preventDefault();
    const current = rows.find((row) => row.anchor_id === editingId);
    if (!current || busy) return;

    const occasion = draft.occasion.trim();
    const problem = validate(draft);
    if (problem) {
      toast(problem);
      return;
    }
    // Only send what actually changed. A PATCH is a partial update, and the
    // server treats an absent date as "keep it", which is what a rename-only
    // edit needs.
    const payload = {};
    if (occasion !== current.occasion) payload.occasion = occasion;
    if (draft.holiday_date !== current.start) payload.holiday_date = draft.holiday_date;
    // A one-day holiday sends no end date at all, so editing a single day does
    // not restate it as a one-element span.
    if (draft.end_date && draft.end_date !== current.end) payload.end_date = draft.end_date;

    if (!Object.keys(payload).length) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      return;
    }

    const ok = await run(
      () => academicsApi.updateHoliday(current.anchor_id, payload),
      `${occasion} updated`
    );
    if (ok) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    }
  }

  function startEdit(row) {
    setEditingId(row.anchor_id);
    setDraft({
      occasion: row.occasion,
      holiday_date: row.start,
      // A single-day entry shows a blank end date rather than the same date
      // twice, which is what "this is just one day" looks like.
      end_date: row.days > 1 ? row.end : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function removeHoliday() {
    const row = confirming;
    if (!row || busy) return;
    const ok = await run(
      () => academicsApi.deleteHoliday(row.anchor_id),
      `${row.occasion} removed`
    );
    if (ok) {
      setConfirming(null);
      // If the removed row was being edited, drop the in-progress edit too.
      if (editingId === row.anchor_id) cancelEdit();
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Holidays</div>
      <div className="scr-sub">
        List the occasions your school is closed. A holiday covers one date or a
        span of consecutive dates, and every day it covers appears in red on the
        timetable.
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <form className="card white" onSubmit={addHoliday}>
            <div className="section-label">Add a holiday</div>
            <div className={styles.formRow}>
              <div className="field">
                <label htmlFor="holiday-occasion">Occasion</label>
                <input
                  id="holiday-occasion"
                  value={draft.occasion}
                  onChange={(e) => setDraft((d) => ({ ...d, occasion: e.target.value }))}
                  placeholder="Diwali"
                  maxLength={120}
                />
              </div>
              <div className="field">
                <label htmlFor="holiday-date">First date</label>
                <input
                  id="holiday-date"
                  type="date"
                  value={draft.holiday_date}
                  onChange={(e) => setDraft((d) => ({ ...d, holiday_date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="holiday-end-date">Last date (optional)</label>
                <input
                  id="holiday-end-date"
                  type="date"
                  value={draft.end_date}
                  min={draft.holiday_date || undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
                />
              </div>
              <button
                className="btn primary"
                type="submit"
                disabled={busy || Boolean(addError)}
              >
                {busy ? "Saving..." : "Add holiday"}
              </button>
            </div>
            {/* Tells the admin the span is wider than the two fields suggest,
                which matters most for a term break picked by accident. */}
            {draft.holiday_date && draft.end_date && addLength > 1 && !addError && (
              <div className={styles.spanNote}>
                Covers {formatHolidayLength(addLength)} - {formatHolidaySpan(draft.holiday_date, draft.end_date)}.
              </div>
            )}
          </form>

          <div className="card table-card">
            {rows.length ? (
              <div className="table-scroll">
                <table className={`data-table ${styles.table}`}>
                  <thead>
                    <tr>
                      <th>Occasion</th>
                      <th>Date</th>
                      <th className={styles.actionsHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) =>
                      editingId === row.anchor_id ? (
                        <tr key={row.anchor_id} className={styles.editing}>
                          <td>
                            <input
                              className={styles.editInput}
                              aria-label="Occasion"
                              value={draft.occasion}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, occasion: e.target.value }))
                              }
                              maxLength={120}
                              autoFocus
                            />
                          </td>
                          <td>
                            <div className={styles.editDates}>
                              <input
                                className={styles.editInput}
                                aria-label="First date"
                                type="date"
                                value={draft.holiday_date}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, holiday_date: e.target.value }))
                                }
                              />
                              <input
                                className={styles.editInput}
                                aria-label="Last date"
                                type="date"
                                value={draft.end_date}
                                min={draft.holiday_date || undefined}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, end_date: e.target.value }))
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn primary sm"
                                onClick={saveEdit}
                                disabled={busy}
                              >
                                {busy ? "Saving..." : "Save"}
                              </button>
                              <button
                                className="btn ghost sm"
                                onClick={cancelEdit}
                                disabled={busy}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.anchor_id}>
                          <td>{row.occasion}</td>
                          <td>
                            {formatHolidaySpan(row.start, row.end)}
                            {row.days > 1 && (
                              <span className={styles.daysBadge}>
                                {formatHolidayLength(row.days)}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn ghost sm"
                                onClick={() => startEdit(row)}
                                disabled={busy}
                              >
                                Update
                              </button>
                              <button
                                className="btn danger sm"
                                onClick={() => setConfirming(row)}
                                disabled={busy}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No holidays yet. Add one above and it will show in red on the
                timetable for that week.
              </Empty>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Remove holiday"
        message={
          confirming
            ? confirming.days > 1
              ? `Remove all ${formatHolidayLength(confirming.days)} of ${confirming.occasion} (${formatHolidaySpan(confirming.start, confirming.end)})? The timetable will no longer mark those dates as a holiday.`
              : `Remove ${confirming.occasion} on ${formatHolidaySpan(confirming.start, confirming.end)}? The timetable will no longer mark it as a holiday.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={removeHoliday}
        onCancel={() => setConfirming(null)}
      />
    </AdminShell>
  );
}
