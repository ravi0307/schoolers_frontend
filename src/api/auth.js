import client from "./client";

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data);

/** The signed-in user's own details, including username, email and name. */
export const me = () => client.get("/auth/me").then((r) => r.data);

/**
 * Rotate the signed-in user's password. Unlike the forgot-password flow this
 * needs no OTP: the caller already holds a token and re-enters the current
 * password, so a stolen token alone is not enough.
 */
export const changePassword = (currentPassword, newPassword) =>
  client.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  }).then((r) => r.data);

export const checkForgotPasswordIdentifier = (identifier) =>
  client.post("/auth/forgot-password", { identifier }).then((r) => r.data);

export const resetForgotPassword = (identifier, otp, newPassword) =>
  client.post("/auth/forgot-password/reset", {
    identifier,
    otp,
    new_password: newPassword,
  }).then((r) => r.data);
