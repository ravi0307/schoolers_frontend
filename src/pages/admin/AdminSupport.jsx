import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as supportApi from "../../api/support";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import DocumentUpload from "../../components/ui/DocumentUpload";
import SupportTicketPanel from "../../components/support/SupportTicketPanel";
import { apiErrorMessage } from "../../api/client";
import { statusTone, validateTicketDraft, formatTicketTime } from "../../utils/support";

const EMPTY_DRAFT = { subject: "", body: "" };

/**
 * Contact Support, admin side.
 *
 * An admin raises a ticket about the portal and follows its thread with the
 * master admin. Tickets are pinned to this school server-side, so the list is
 * simply "our tickets" rather than something the admin can widen.
 */

function RaiseTicketForm({ schoolId, onCreated }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const problem = validateTicketDraft(draft);

  async function submit(event) {
    event.preventDefault();
    if (busy || problem) return;
    setBusy(true);
    try {
      const ticket = await supportApi.createTicket({
        subject: draft.subject.trim(),
        body: draft.body.trim(),
        attachments,
      });
      toast("Ticket raised. We will get back to you here.");
      setDraft(EMPTY_DRAFT);
      setAttachments([]);
      onCreated(ticket.ticket_id);
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card white" onSubmit={submit}>
      <div className="section-label">Raise a ticket</div>
      <div className="scr-sub" style={{ marginTop: 0 }}>
        Tell the master admin what is not working. You will see their reply and the
        ticket status here.
      </div>
      <div className="field">
        <label htmlFor="support-subject">Subject</label>
        <input
          id="support-subject"
          value={draft.subject}
          onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
          placeholder="e.g. Fee receipt is not downloading"
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="support-body">What happened?</label>
        <textarea
          id="support-body"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          rows={4}
          placeholder="Steps to reproduce, the class/student involved, and any error you saw."
        />
      </div>
      <DocumentUpload
        label="Attach screenshots or documents"
        value={attachments}
        onChange={setAttachments}
        schoolId={schoolId}
      />
      <div className="support-reply-actions">
        {problem && (draft.subject || draft.body) ? (
          <span className="support-validation-note">{problem}</span>
        ) : null}
        <button className="btn primary" type="submit" disabled={busy || Boolean(problem)}>
          {busy ? "Submitting..." : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}

export default function AdminSupport() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => supportApi.listTickets(), []);
  const [selectedId, setSelectedId] = useState(null);
  const pager = usePagination(data);

  function handleCreated(ticketId) {
    setSelectedId(ticketId);
    refetch();
  }

  return (
    <AdminShell>
      <div className="scr-title">Contact Support</div>
      <div className="scr-sub">
        Raise an issue about the portal and track it to resolution.
      </div>

      <RaiseTicketForm schoolId={user.schoolId} onCreated={handleCreated} />

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <div className="card">
          <div className="section-label">Your tickets</div>
          {data && data.length ? (
            pager.pageItems.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className={`listitem support-listitem ${selectedId === ticket.ticket_id ? "selected" : ""}`}
                onClick={() => setSelectedId(ticket.ticket_id)}
                style={{ cursor: "pointer" }}
              >
                <div className="meta">
                  <b>{ticket.subject}</b>
                  <span>
                    #{ticket.ticket_id} · {formatTicketTime(ticket.created_at)} ·{" "}
                    {ticket.message_count} {ticket.message_count === 1 ? "message" : "messages"}
                  </span>
                </div>
                <Pill tone={statusTone(ticket.status)}>{ticket.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No tickets yet. Raise one above if something is not working.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}

      {selectedId && (
        <SupportTicketPanel ticketId={selectedId} schoolId={user.schoolId} onChanged={refetch} />
      )}
    </AdminShell>
  );
}
