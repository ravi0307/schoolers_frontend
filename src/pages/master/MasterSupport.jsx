import { useState } from "react";
import MasterShell from "../../components/layout/MasterShell";
import { useApi } from "../../hooks/useApi";
import * as supportApi from "../../api/support";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import SupportTicketPanel from "../../components/support/SupportTicketPanel";
import { SUPPORT_STATUSES, statusTone, formatTicketTime } from "../../utils/support";

/**
 * Contact Support, master side.
 *
 * The master admin sees every school's tickets, can narrow the queue by status,
 * reply in the thread, and set the status. Tickets are read-only to everyone
 * else, so there is no create form here.
 */
export default function MasterSupport() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, loading, error, refetch } = useApi(
    () => supportApi.listTickets(statusFilter ? { status: statusFilter } : {}),
    [statusFilter]
  );
  const [selectedId, setSelectedId] = useState(null);
  const pager = usePagination(data);

  return (
    <MasterShell>
      <div className="scr-title">Support Inbox</div>
      <div className="scr-sub">
        Issues raised by school admins. Reply in the thread and move each ticket to
        its next status.
      </div>

      <div className="card support-filter">
        <div className="field">
          <label htmlFor="support-status-filter">Filter by status</label>
          <select
            id="support-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSelectedId(null);
            }}
          >
            <option value="">All statuses</option>
            {SUPPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <div className="card">
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
                    {ticket.school_name} · #{ticket.ticket_id} ·{" "}
                    {formatTicketTime(ticket.created_at)}
                  </span>
                </div>
                <Pill tone={statusTone(ticket.status)}>{ticket.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No tickets match this filter.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}

      {selectedId && (
        <SupportTicketPanel
          ticketId={selectedId}
          canManageStatus
          onChanged={refetch}
        />
      )}
    </MasterShell>
  );
}
