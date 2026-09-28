import client from "./client";

export const salarySheet = (months = 6) =>
  client.get("/accounts/salaries", { params: { months } }).then((r) => r.data);

export const feeSheet = (months = 6) =>
  client.get("/accounts/fees", { params: { months } }).then((r) => r.data);

export const recordSalary = (payload) =>
  client.post("/accounts/salaries", payload).then((r) => r.data);

export const recordFee = (payload) =>
  client.post("/accounts/fees", payload).then((r) => r.data);

export const clearSalary = (staffId, month) =>
  client.delete(`/accounts/salaries/${staffId}/${month}`).then((r) => r.data);

export const clearFee = (studentId, month) =>
  client.delete(`/accounts/fees/${studentId}/${month}`).then((r) => r.data);
