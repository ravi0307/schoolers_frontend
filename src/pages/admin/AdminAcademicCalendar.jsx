import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import DatePicker from "../../components/ui/DatePicker";
import Select from "../../components/ui/Select";
import { apiErrorMessage } from "../../api/client";

/**
 * Academic calendar: years, periods (terms), and dated non-closure events
 * (exam windows, revision weeks, result dates). Holidays stay on their own
 * page; closures and periods are different facts.
 */

const EMPTY_YEAR = { name: "", start_date: "", end_date: "" };
const EMPTY_PERIOD = { year_id: "", name: "", start_date: "", end_date: "" };
const EMPTY_EVENT = { year_id: "", event_type: "exam_period", title: "", start_date: "", end_date: "" };
const EVENT_TYPES = [
  ["exam_period", "Examination period"],
  ["revision", "Revision / preparation"],
  ["result_date", "Result publication"],
  ["other", "Other event"],
];

export default function AdminAcademicCalendar() {
  const years = useApi(() => academicsApi.listAcademicYears(), []);
  const [yearDraft, setYearDraft] = useState(EMPTY_YEAR);
  const [periodDraft, setPeriodDraft] = useState(EMPTY_PERIOD);
  const [eventDraft, setEventDraft] = useState(EMPTY_EVENT);
  const [openYear, setOpenYear] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const toast = useToast();

  const periods = useApi(
    () => (openYear ? academicsApi.listAcademicPeriods(openYear) : Promise.resolve([])),
    [openYear]
  );
  const events = useApi(
    () => academicsApi.listAcademicEvents(openYear || undefined),
    [openYear]
  );

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast(message);
      years.refetch();
      periods.refetch();
      events.refetch();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const yearList = years.data || [];
  const openYearRow = yearList.find((y) => y.year_id === Number(openYear));

  return (
    <AdminShell>
      <PageHeader
        title="Academic Calendar"
        subtitle="Years, terms, and dated school events"
      />
      {years.loading && <Spinner />}
      <ErrorBanner message={years.error} />
      {!years.loading && !years.error && (
        <>
          <div className="card">
            <div className="section-label">New academic year</div>
            <form
              className="grid2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!yearDraft.name.trim() || !yearDraft.start_date || !yearDraft.end_date) {
                  toast("Name the year and choose both dates");
                  return;
                }
                run(
                  () => academicsApi.createAcademicYear({
                    name: yearDraft.name.trim(),
                    start_date: yearDraft.start_date,
                    end_date: yearDraft.end_date,
                  }).then(() => setYearDraft(EMPTY_YEAR)),
                  "Academic year created"
                );
              }}
            >
              <div className="field">
                <label>Name (e.g. 2026-27)</label>
                <input value={yearDraft.name} onChange={(e) => setYearDraft({ ...yearDraft, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Start date</label>
                <DatePicker type="date" value={yearDraft.start_date} onChange={(e) => setYearDraft({ ...yearDraft, start_date: e.target.value })} aria-label="Year start date" />
              </div>
              <div className="field">
                <label>End date</label>
                <DatePicker type="date" value={yearDraft.end_date} onChange={(e) => setYearDraft({ ...yearDraft, end_date: e.target.value })} aria-label="Year end date" />
              </div>
              <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add year</button></div>
            </form>
          </div>

          <div className="card">
            <div className="section-label">Years</div>
            {!yearList.length ? <Empty>No academic years yet.</Empty> : yearList.map((y) => (
              <div key={y.year_id} className="listitem">
                <div className="meta">
                  <b>{y.name}</b>
                  <span>{y.start_date} → {y.end_date}{!y.is_active ? " · inactive" : ""}</span>
                </div>
                <button className="btn sm" onClick={() => setOpenYear(openYear === y.year_id ? null : y.year_id)}>
                  {openYear === y.year_id ? "Close" : "Terms & events"}
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => run(
                    () => academicsApi.updateAcademicYear(y.year_id, { is_active: !y.is_active }),
                    y.is_active ? "Year deactivated" : "Year activated"
                  )}
                >
                  {y.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>

          {openYearRow && (
            <div className="card">
              <div className="section-label">Terms in {openYearRow.name}</div>
              {periods.loading && <Spinner />}
              <ErrorBanner message={periods.error} />
              {!periods.loading && !(periods.data || []).length && <Empty>No terms yet.</Empty>}
              {(periods.data || []).map((p) => (
                <div key={p.period_id} className="listitem">
                  <div className="meta">
                    <b>{p.name}</b>
                    <span>{p.start_date} → {p.end_date}{!p.is_active ? " · inactive" : ""}</span>
                  </div>
                  <button
                    className="btn sm"
                    disabled={busy}
                    onClick={() => run(
                      () => academicsApi.updateAcademicPeriod(p.period_id, { is_active: !p.is_active }),
                      p.is_active ? "Term deactivated" : "Term activated"
                    )}
                  >
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
              <form
                className="grid2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!periodDraft.name.trim() || !periodDraft.start_date || !periodDraft.end_date) {
                    toast("Name the term and choose both dates");
                    return;
                  }
                  run(
                    () => academicsApi.createAcademicPeriod({
                      year_id: openYear,
                      name: periodDraft.name.trim(),
                      start_date: periodDraft.start_date,
                      end_date: periodDraft.end_date,
                    }).then(() => setPeriodDraft(EMPTY_PERIOD)),
                    "Term created (overlaps and out-of-year dates are refused)"
                  );
                }}
              >
                <div className="field">
                  <label>Term name</label>
                  <input value={periodDraft.name} onChange={(e) => setPeriodDraft({ ...periodDraft, name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Start date</label>
                  <DatePicker type="date" value={periodDraft.start_date} onChange={(e) => setPeriodDraft({ ...periodDraft, start_date: e.target.value })} aria-label="Term start date" />
                </div>
                <div className="field">
                  <label>End date</label>
                  <DatePicker type="date" value={periodDraft.end_date} onChange={(e) => setPeriodDraft({ ...periodDraft, end_date: e.target.value })} aria-label="Term end date" />
                </div>
                <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add term</button></div>
              </form>
            </div>
          )}

          <div className="card">
            <div className="section-label">Dated events{openYearRow ? ` in ${openYearRow.name}` : " (all years)"}</div>
            {events.loading && <Spinner />}
            <ErrorBanner message={events.error} />
            {!events.loading && !(events.data || []).length && <Empty>No events yet.</Empty>}
            {(events.data || []).map((ev) => (
              <div key={ev.event_id} className="listitem">
                <div className="meta">
                  <b>{ev.title}</b>
                  <span>{EVENT_TYPES.find(([v]) => v === ev.event_type)?.[1] || ev.event_type} · {ev.start_date} → {ev.end_date}</span>
                </div>
                <button className="btn sm" disabled={busy} onClick={() => setConfirming(ev)}>Remove</button>
              </div>
            ))}
            <form
              className="grid2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!eventDraft.title.trim() || !eventDraft.start_date) {
                  toast("Title the event and choose its start date");
                  return;
                }
                run(
                  () => academicsApi.createAcademicEvent({
                    year_id: openYear || undefined,
                    event_type: eventDraft.event_type,
                    title: eventDraft.title.trim(),
                    start_date: eventDraft.start_date,
                    end_date: eventDraft.end_date || eventDraft.start_date,
                  }).then(() => setEventDraft(EMPTY_EVENT)),
                  "Event added"
                );
              }}
            >
              <div className="field">
                <label>Title</label>
                <input value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Type</label>
                <Select value={eventDraft.event_type} onChange={(e) => setEventDraft({ ...eventDraft, event_type: e.target.value })} aria-label="Event type">
                  {EVENT_TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </Select>
              </div>
              <div className="field">
                <label>Start date</label>
                <DatePicker type="date" value={eventDraft.start_date} onChange={(e) => setEventDraft({ ...eventDraft, start_date: e.target.value })} aria-label="Event start date" />
              </div>
              <div className="field">
                <label>End date</label>
                <DatePicker type="date" value={eventDraft.end_date} onChange={(e) => setEventDraft({ ...eventDraft, end_date: e.target.value })} aria-label="Event end date" />
              </div>
              <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add event</button></div>
            </form>
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!confirming}
        title="Remove event"
        message={confirming ? `Remove "${confirming.title}"?` : ""}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const ev = confirming;
          setConfirming(null);
          run(() => academicsApi.deleteAcademicEvent(ev.event_id), "Event removed");
        }}
      />
    </AdminShell>
  );
}
