import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  SUPPORT_STATUSES,
  formatTicketTime,
  isResolved,
  statusTone,
  validateTicketDraft,
} from "../src/utils/support.js";

// Contact Support lets a school admin raise an issue and the master admin work
// the queue. Two honesty rules matter on the frontend: only the master may move
// a ticket's status, and the raise form refuses an empty ticket before it wastes
// a round trip. The helpers are pure so those rules are testable here, and the
// source checks pin the role split onto the actual screens.

function source(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

test("the five ticket statuses match the backend enum", () => {
  assert.deepEqual(SUPPORT_STATUSES, [
    "Open",
    "In progress",
    "Assigned",
    "Completed",
    "Cancelled",
  ]);
});

test("every status maps to a pill tone, with a neutral fallback", () => {
  assert.equal(statusTone("Open"), "warn");
  assert.equal(statusTone("In progress"), "info");
  assert.equal(statusTone("Completed"), "ok");
  assert.equal(statusTone("Assigned"), "mute");
  assert.equal(statusTone("Cancelled"), "mute");
  assert.equal(statusTone("Something else"), "mute");
});

test("completed and cancelled are both resolved", () => {
  assert.equal(isResolved("Completed"), true);
  assert.equal(isResolved("Cancelled"), true);
  assert.equal(isResolved("Open"), false);
  assert.equal(isResolved("In progress"), false);
});

test("the raise form refuses a blank ticket", () => {
  assert.equal(validateTicketDraft({ subject: "P", body: "It fails" }), null);
  assert.match(validateTicketDraft({ subject: "  ", body: "It fails" }), /subject/i);
  assert.match(validateTicketDraft({ subject: "P", body: "   " }), /describe/i);
  assert.match(validateTicketDraft({ subject: "x".repeat(121), body: "b" }), /120/);
});

test("timestamps format and never throw on junk", () => {
  assert.equal(formatTicketTime(""), "");
  assert.equal(formatTicketTime("not-a-date"), "");
  assert.match(formatTicketTime("2026-10-03T10:30:00"), /2026/);
});

test("the API module exposes the full support surface", () => {
  const api = source("src/api/support.js");
  for (const fn of [
    "listTickets",
    "getTicket",
    "createTicket",
    "addTicketMessage",
    "setTicketStatus",
  ]) {
    assert.match(api, new RegExp(`export function ${fn}`), `missing ${fn}`);
  }
});

test("only the master screen can change a ticket's status", () => {
  const admin = source("src/pages/admin/AdminSupport.jsx");
  const master = source("src/pages/master/MasterSupport.jsx");
  const panel = source("src/components/support/SupportTicketPanel.jsx");
  const thread = source("src/components/support/SupportTicketThread.jsx");

  // The admin raises tickets and replies; the master also moves the status.
  assert.match(admin, /createTicket/);
  assert.match(admin, /SupportTicketPanel/);
  assert.doesNotMatch(admin, /canManageStatus/);
  assert.match(master, /canManageStatus/);
  assert.match(master, /setTicketStatus|SupportTicketPanel/);

  // The status control only appears when the panel says the caller may manage it.
  assert.match(panel, /canManageStatus/);
  assert.match(thread, /canManageStatus/);
  assert.match(thread, /SUPPORT_STATUSES/);
});

test("the support routes and navigation are registered", () => {
  const app = source("src/App.jsx");
  assert.ok(app.includes('path="support"'), "support route is not registered");
  assert.match(source("src/components/layout/AdminShell.jsx"), /\/admin\/support/);
  assert.match(source("src/components/layout/MasterShell.jsx"), /\/master\/support/);
});

test("opening a ticket loads its detail from the shared client", () => {
  const api = source("src/api/support.js");
  // The thread is fetched on demand from the single-ticket endpoint, and it
  // must stay on the shared axios client so it inherits the gateway base URL
  // and the auth header — the path that broke when the gateway mislabelled a
  // decoded body as gzip and the browser reported a Network Error.
  assert.ok(
    api.includes('import client from "./client"'),
    "support API must use the shared client"
  );
  assert.ok(
    api.includes("client.get(`/support/tickets/${ticketId}`)"),
    "ticket detail must hit the single-ticket endpoint"
  );
});

test("a failed detail load is surfaced, not swallowed", () => {
  const panel = source("src/components/support/SupportTicketPanel.jsx");
  assert.match(panel, /useApi/);
  assert.match(panel, /ErrorBanner/);
  assert.match(panel, /message=\{error\}/);
});
