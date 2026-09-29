import client from "./client";

// `end` anchors the window on its last month, so the admin can page backwards
// through history. Omitting it asks for the window ending this month.
export const salarySheet = (months = 6, end) =>
  client.get("/accounts/salaries", { params: { months, end } }).then((r) => r.data);

export const feeSheet = (months = 6, end) =>
  client.get("/accounts/fees", { params: { months, end } }).then((r) => r.data);

export const recordSalary = (payload) =>
  client.post("/accounts/salaries", payload).then((r) => r.data);

export const recordFee = (payload) =>
  client.post("/accounts/fees", payload).then((r) => r.data);

// The deposit periods come from the server rather than being hardcoded, so a
// plan the dialog offers is by construction one the service can split with.
export const feePlans = () =>
  client.get("/accounts/fees/plans").then((r) => r.data);

// What a deposit WOULD write, month by month. A yearly deposit touches twelve
// months of a fee register, so the months and the split are shown before the
// admin commits rather than discovered afterwards.
export const previewFeeDeposit = (payload) =>
  client.post("/accounts/fees/deposit/preview", payload).then((r) => r.data);

export const depositFee = (payload) =>
  client.post("/accounts/fees/deposit", payload).then((r) => r.data);

export const clearSalary = (staffId, month) =>
  client.delete(`/accounts/salaries/${staffId}/${month}`).then((r) => r.data);

export const clearFee = (studentId, month) =>
  client.delete(`/accounts/fees/${studentId}/${month}`).then((r) => r.data);
