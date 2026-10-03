import { useEffect, useState } from "react";
import { Pill } from "../ui/Primitives";
import DocumentUpload from "../ui/DocumentUpload";
import { resolveMediaUrl } from "../../api/client";
import { SUPPORT_STATUSES, formatTicketTime, statusTone, isResolved } from "../../utils/support";

/**
 * One ticket and its conversation, shared by the admin and master screens.
 *
 * The only thing that differs by role is the status control: the master can
 * move a ticket, an admin can only read where it stands. Everything else — the
 * trail, the reply box, the attachments — is identical, so it lives here once.
 */
export default function SupportTicketThread({
  ticket,
  schoolId,
  canManageStatus = false,
  onReply,
  onStatusChange,
}) {
  const [reply, setReply] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);

  // A new ticket in the panel resets any half-typed reply from the last one.
  useEffect(() => {
    setReply("");
    setAttachments([]);
  }, [ticket?.ticket_id]);

  if (!ticket) return null;

  async function sendReply(event) {
    event.preventDefault();
    const body = reply.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const ok = await onReply({ body, attachments });
      if (ok) {
        setReply("");
        setAttachments([]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(event) {
    const status = event.target.value;
    if (busy || !onStatusChange) return;
    setBusy(true);
    try {
      await onStatusChange(status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card white support-thread">
      <div className="support-thread-head">
        <div>
          <div className="support-thread-subject">{ticket.subject}</div>
          <div className="support-thread-meta">
            #{ticket.ticket_id}
            {ticket.school_name ? ` · ${ticket.school_name}` : ""}
            {ticket.created_by_name ? ` · ${ticket.created_by_name}` : ""}
            {ticket.created_at ? ` · ${formatTicketTime(ticket.created_at)}` : ""}
          </div>
        </div>
        <div className="support-thread-actions">
          <Pill tone={statusTone(ticket.status)}>{ticket.status}</Pill>
          {canManageStatus && (
            <select
              className="support-status-select"
              aria-label="Ticket status"
              value={ticket.status}
              onChange={changeStatus}
              disabled={busy}
            >
              {SUPPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="support-messages">
        {(ticket.messages || []).map((message) => (
          <div
            key={message.message_id}
            className={`support-message ${message.author_role === "master" ? "from-master" : "from-admin"}`}
          >
            <div className="support-message-meta">
              <b>{message.author_role === "master" ? "Support (Master Admin)" : message.author_name}</b>
              <span>{formatTicketTime(message.created_at)}</span>
            </div>
            <div className="support-message-body">{message.body}</div>
            {message.attachments?.length ? (
              <div className="support-message-attachments">
                {message.attachments.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={resolveMediaUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {url.split("/").pop() || "Attachment"}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form className="support-reply" onSubmit={sendReply}>
        <div className="field">
          <label htmlFor={`support-reply-${ticket.ticket_id}`}>Reply</label>
          <textarea
            id={`support-reply-${ticket.ticket_id}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Add an update..."
          />
        </div>
        <DocumentUpload
          label="Attach files"
          value={attachments}
          onChange={setAttachments}
          schoolId={schoolId || ticket.school_id}
        />
        <div className="support-reply-actions">
          {isResolved(ticket.status) && (
            <span className="support-resolved-note">
              This ticket is {ticket.status.toLowerCase()}.
            </span>
          )}
          <button className="btn primary" type="submit" disabled={busy || !reply.trim()}>
            {busy ? "Sending..." : "Send reply"}
          </button>
        </div>
      </form>
    </div>
  );
}
