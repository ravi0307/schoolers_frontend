import client from "./client";

/**
 * Contact Support (issue tickets).
 *
 * An admin raises a ticket for their own school; the master admin works the
 * whole queue. The endpoints mirror the support_service routes behind the
 * gateway.
 */

/** The caller's queue: an admin's own school, master's every school. */
export function listTickets(params = {}) {
  return client.get("/support/tickets", { params }).then((r) => r.data);
}

/** One ticket with its full message trail. */
export function getTicket(ticketId) {
  return client.get(`/support/tickets/${ticketId}`).then((r) => r.data);
}

/** Raise a ticket. The description becomes the first message. */
export function createTicket(data) {
  return client.post("/support/tickets", data).then((r) => r.data);
}

/** Add a reply from either side of the conversation. */
export function addTicketMessage(ticketId, data) {
  return client.post(`/support/tickets/${ticketId}/messages`, data).then((r) => r.data);
}

/** Master-only: move a ticket between statuses. */
export function setTicketStatus(ticketId, status) {
  return client.patch(`/support/tickets/${ticketId}/status`, { status }).then((r) => r.data);
}
