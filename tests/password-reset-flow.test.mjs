import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { sanitizeOtp, validatePasswordReset } from "../src/utils/passwordReset.js";

const root = path.resolve(".");

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("sanitizeOtp keeps only digits and caps at six", () => {
  assert.equal(sanitizeOtp("123456"), "123456");
  assert.equal(sanitizeOtp("12ab34"), "1234");
  assert.equal(sanitizeOtp("123 456!"), "123456");
  assert.equal(sanitizeOtp("1234567890"), "123456");
  assert.equal(sanitizeOtp(""), "");
  assert.equal(sanitizeOtp(null), "");
  assert.equal(sanitizeOtp(undefined), "");
});

test("validatePasswordReset accepts a valid OTP + matching, 8-72 char password", () => {
  assert.equal(validatePasswordReset("123456", "newpass123", "newpass123"), null);
  assert.equal(validatePasswordReset("000000", "asecurenewpassword", "asecurenewpassword"), null);
});

test("validatePasswordReset rejects malformed OTPs", () => {
  assert.equal(validatePasswordReset("", "newpass123", "newpass123"), "Enter the 6-digit OTP sent to your email.");
  assert.equal(validatePasswordReset("123", "newpass123", "newpass123"), "Enter the 6-digit OTP sent to your email.");
  assert.equal(validatePasswordReset("12345a", "newpass123", "newpass123"), "Enter the 6-digit OTP sent to your email.");
  assert.equal(validatePasswordReset("1234567", "newpass123", "newpass123"), "Enter the 6-digit OTP sent to your email.");
});

test("validatePasswordReset rejects too-short, too-long, and mismatched passwords", () => {
  assert.equal(validatePasswordReset("123456", "short", "short"), "Password must be 8–72 characters.");
  assert.equal(validatePasswordReset("123456", "x".repeat(73), "x".repeat(73)), "Password must be 8–72 characters.");
  assert.equal(validatePasswordReset("123456", "newpass123", "different"), "Passwords do not match.");
});

test("Login uses the reset validators and no longer calls a separate verify step", () => {
  const login = source("src/pages/Login.jsx");
  assert.match(login, /sanitizeOtp/);
  assert.match(login, /validatePasswordReset/);
  assert.match(login, /checkForgotPasswordIdentifier\(/);
  assert.match(login, /resetForgotPassword/);
  assert.doesNotMatch(login, /verifyForgotPasswordIdentifier/);
  assert.doesNotMatch(login, /forgot-password\/verify/);
});

test("resetForgotPassword posts the identifier, otp and new_password to the reset endpoint", () => {
  const auth = source("src/api/auth.js");
  assert.match(auth, /\/auth\/forgot-password\/reset/);
  assert.match(auth, /new_password: newPassword/);
  assert.match(auth, /otp,/);
  assert.doesNotMatch(auth, /forgot-password\/verify/);
});