export function sanitizeOtp(value) {
  return String(value ?? "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

export function validatePasswordReset(otp, newPassword, confirmPassword) {
  if (!/^[0-9]{6}$/.test(String(otp ?? ""))) {
    return "Enter the 6-digit OTP sent to your email.";
  }
  const password = String(newPassword ?? "");
  if (password.length < 8 || password.length > 72) {
    return "Password must be 8–72 characters.";
  }
  if (password !== String(confirmPassword ?? "")) {
    return "Passwords do not match.";
  }
  return null;
}