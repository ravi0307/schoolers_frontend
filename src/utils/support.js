/**
 * Pure helpers behind the Contact Support screens.
 *
 * Kept out of the page components so the honour rules — which statuses exist,
 * what "done" means, and what makes a ticket worth raising — can be tested
 * without a browser.
 */

export const SUPPORT_STATUSES = [
  "Open",
  "In progress",
  "Assigned",
  "Completed",
  "Cancelled",
];

/** Pill colour for a status; unknown values fall back to a neutral tone. */
export function statusTone(status) {
  switch (status) {
    case "Open":
      return "warn";
    case "In progress":
      return "info";
    case "Completed":
      return "ok";
    case "Assigned":
    case "Cancelled":
      return "mute";
    default:
      return "mute";
  }
}

/** A ticket the master has closed either way. */
export function isResolved(status) {
  return status === "Completed" || status === "Cancelled";
}

/**
 * Client-side guard for the raise form. Returns the first problem as a
 * sentence, or null when the draft is sendable. The server validates again;
 * this exists so the admin is told before the round trip.
 */
export function validateTicketDraft(draft = {}) {
  const subject = (draft.subject || "").trim();
  const body = (draft.body || "").trim();
  if (!subject) return "Give the issue a short subject";
  if (subject.length > 120) return "Keep the subject under 120 characters";
  if (!body) return "Describe what went wrong";
  return null;
}

/** Human-readable timestamp for a message or a ticket row. */
export function formatTicketTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
