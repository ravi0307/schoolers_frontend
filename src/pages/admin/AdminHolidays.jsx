import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import { formatHolidayDate } from "../../utils/timetableFlow";

/**
 * Manage the school's holiday calendar.
 *
 * Each row is one named holiday on one calendar date, so "Diwali on 8 Nov" is a
 * fact about a specific day rather than a recurring weekly flag. That is why a
 * holiday added here reddens exactly one column of the timetable, and only in
 * the week that contains its date.
 *
 * Rows are created, edited and removed individually. Editing happens in place
 * rather than in a dialog because the change is two fields wide, and seeing the
 * row being edited keeps it obvious which holiday is being changed.
 */

const EMPTY_DRAFT = { occasion: "", holiday_date: "" };

function validate({ occasion, holiday_date }) {
  if (!occasion.trim()) return "Enter the occasion name";
  if (!holiday_date) return "Choose a date";
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

  const rows = holidays || [];
  const addError = validate(draft);

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
    };
    const ok = await run(
      () => academicsApi.createHoliday(payload),
      `${payload.occasion} added`
    );
    if (ok) setDraft(EMPTY_DRAFT);
  }

  async function saveEdit(event) {
    event.preventDefault();
    const current = rows.find((h) => h.holiday_id === editingId);
    if (!current || busy) return;

    const occasion = draft.occasion.trim();
    const problem = validate(draft);
    if (problem) {
      toast(problem);
      return;
    }
    // Only send what actually changed: a PATCH is a partial update, and sending
    // an unchanged date back would collide with this row's own date on the
    // server's duplicate check.
    const payload = {};
    if (occasion !== current.occasion) payload.occasion = occasion;
    if (draft.holiday_date !== current.holiday_date) {
      payload.holiday_date = draft.holiday_date;
    }
    if (!Object.keys(payload).length) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      return;
    }

    const ok = await run(
      () => academicsApi.updateHoliday(current.holiday_id, payload),
      `${occasion} updated`
    );
    if (ok) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    }
  }

  function startEdit(holiday) {
    setEditingId(holiday.holiday_id);
    setDraft({ occasion: holiday.occasion, holiday_date: holiday.holiday_date });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function removeHoliday() {
    const holiday = confirming;
    if (!holiday || busy) return;
    const ok = await run(
      () => academicsApi.deleteHoliday(holiday.holiday_id),
      `${holiday.occasion} removed`
    );
    if (ok) {
      setConfirming(null);
      // If the removed row was being edited, drop the in-progress edit too.
      if (editingId === holiday.holiday_id) cancelEdit();
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Holidays</div>
      <div className="scr-sub">
        List the occasions your school is closed. Each holiday is one specific
        date, and appears in red on the timetable for that week only.
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <form className="card white" onSubmit={addHoliday}>
            <div className="section-label">Add a holiday</div>
            <div className="holiday-form-row">
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
                <label htmlFor="holiday-date">Date</label>
                <input
                  id="holiday-date"
                  type="date"
                  value={draft.holiday_date}
                  onChange={(e) => setDraft((d) => ({ ...d, holiday_date: e.target.value }))}
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
          </form>

          <div className="card table-card">
            {rows.length ? (
              <div className="table-scroll">
                <table className="data-table holiday-table">
                  <thead>
                    <tr>
                      <th>Occasion</th>
                      <th>Date</th>
                      <th className="holiday-actions-head">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((holiday) =>
                      editingId === holiday.holiday_id ? (
                        <tr key={holiday.holiday_id} className="holiday-editing">
                          <td>
                            <input
                              className="holiday-edit-input"
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
                            <input
                              className="holiday-edit-input"
                              aria-label="Date"
                              type="date"
                              value={draft.holiday_date}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, holiday_date: e.target.value }))
                              }
                            />
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
                        <tr key={holiday.holiday_id}>
                          <td>{holiday.occasion}</td>
                          <td>{formatHolidayDate(holiday.holiday_date)}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn ghost sm"
                                onClick={() => startEdit(holiday)}
                                disabled={busy}
                              >
                                Update
                              </button>
                              <button
                                className="btn danger sm"
                                onClick={() => setConfirming(holiday)}
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
            ? `Remove ${confirming.occasion} on ${formatHolidayDate(confirming.holiday_date)}? The timetable for that week will no longer mark it as a holiday.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={removeHoliday}
        onCancel={() => setConfirming(null)}
      />
    </AdminShell>
  );
}
