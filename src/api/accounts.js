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

export const clearSalary = (staffId, month) =>
  client.delete(`/accounts/salaries/${staffId}/${month}`).then((r) => r.data);

export const clearFee = (studentId, month) =>
  client.delete(`/accounts/fees/${studentId}/${month}`).then((r) => r.data);
