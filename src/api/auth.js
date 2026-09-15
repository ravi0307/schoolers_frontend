import client from "./client";

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data);

export const me = () => client.get("/auth/me").then((r) => r.data);

export const checkForgotPasswordIdentifier = (identifier) =>
  client.post("/auth/forgot-password", { identifier }).then((r) => r.data);

export const verifyForgotPasswordIdentifier = (identifier) =>
  client.post("/auth/forgot-password/verify", { identifier }).then((r) => r.data);

export const resetForgotPassword = (identifier, newPassword) =>
  client.post("/auth/forgot-password/reset", {
    identifier,
    new_password: newPassword,
  }).then((r) => r.data);
