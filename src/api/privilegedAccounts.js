import client from "./client";

/**
 * Master-only Sub-Master account lifecycle.
 *
 * Every call here is guarded server-side by require_master_only, so a
 * Sub-Master's token receives 403 on all four — the page-level role guard in
 * MasterAccounts is a convenience, not the control.
 */

export const listPrivilegedAccounts = () =>
  client.get("/auth/privileged-accounts").then((r) => r.data);

/**
 * Create a Sub-Master. The payload deliberately carries no `role` field —
 * the server assigns it — and the response is the only time the plaintext
 * password is ever returned.
 */
export const createPrivilegedAccount = (data) =>
  client.post("/auth/privileged-accounts", data).then((r) => r.data);

/** Partial update: email, activation state, or password rotation. */
export const updatePrivilegedAccount = (userId, data) =>
  client.patch(`/auth/privileged-accounts/${userId}`, data).then((r) => r.data);

/** Soft-delete: deactivates the account (reversible via is_active update). */
export const deactivatePrivilegedAccount = (userId) =>
  client.delete(`/auth/privileged-accounts/${userId}`).then((r) => r.data);
