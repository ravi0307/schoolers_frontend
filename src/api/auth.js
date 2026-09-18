import client from "./client";

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data);

export const me = () => client.get("/auth/me").then((r) => r.data);

export const checkForgotPasswordIdentifier = (identifier) =>
  client.post("/auth/forgot-password", { identifier }).then((r) => r.data);

export const resetForgotPassword = (identifier, otp, newPassword) =>
  client.post("/auth/forgot-password/reset", {
    identifier,
    otp,
    new_password: newPassword,
  }).then((r) => r.data);
