import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import * as authApi from "../api/auth";
import { sanitizeOtp, validatePasswordReset } from "../utils/passwordReset";

const ROLE_HOME = {
  parent: "/parent/home",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
  pilot: "/pilot/pickdrop",
  master: "/master/schools",
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function openForgotPassword() {
    setError(null);
    setResetMessage("");
    setShowForgotPassword(true);
    setResetStep("identifier");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function closeForgotPassword() {
    setError(null);
    setResetMessage("");
    setShowForgotPassword(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(ROLE_HOME[user.role] || "/login");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkIdentifier(e) {
    e.preventDefault();
    setError(null);
    setResetMessage("");
    setResetSubmitting(true);
    try {
      const result = await authApi.checkForgotPasswordIdentifier(identifier.trim());
      setIdentifier(result.identifier || identifier.trim());
      setResetMessage("An OTP has been sent to the email on file. Enter it below to set a new password.");
      setResetStep("reset");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(null);
    const validationError = validatePasswordReset(otp, newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    setResetSubmitting(true);
    try {
      const result = await authApi.resetForgotPassword(identifier, otp, newPassword);
      setResetMessage(result.message || "Password updated. You can now sign in.");
      setResetStep("complete");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2 style={{ margin: "0 0 4px" }}>Schoolers Sign In</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "0 0 20px" }}>
          Parent · Teacher · School Admin · Pilot · Master Admin
        </p>
        {error && <div className="error-banner">{error}</div>}
        {!showForgotPassword ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. admin1" />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button className="btn primary block" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Log In"}
            </button>
            <button className="login-link" type="button" onClick={openForgotPassword}>
              Forgot password?
            </button>
          </form>
        ) : (
          <div className="forgot-password-flow">
            <h3>Reset password</h3>
            <p>Use the username or email address linked to your active Schoolers account.</p>
            {resetMessage && <div className="reset-success">{resetMessage}</div>}
            {resetStep === "identifier" && (
              <form onSubmit={checkIdentifier}>
                <div className="field">
                  <label>Username or email address</label>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. teacher1 or you@example.com" required />
                </div>
                <button className="btn primary block" type="submit" disabled={resetSubmitting}>
                  {resetSubmitting ? "Sending OTP..." : "Continue"}
                </button>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
                  We'll email a 6-digit OTP to the address on file for this account.
                </p>
              </form>
            )}
            {resetStep === "reset" && (
              <form onSubmit={resetPassword}>
                <div className="reset-email">{identifier}</div>
                <div className="field">
                  <label>OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(sanitizeOtp(e.target.value))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength="6"
                    minLength="6"
                    required
                  />
                </div>
                <div className="field">
                  <label>New password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength="8" maxLength="72" required />
                </div>
                <div className="field">
                  <label>Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength="8" maxLength="72" required />
                </div>
                <button className="btn primary block" type="submit" disabled={resetSubmitting}>
                  {resetSubmitting ? "Updating..." : "Update password"}
                </button>
                <button className="login-link" type="button" onClick={() => setResetStep("identifier")}>
                  Didn't get the OTP? Try again
                </button>
              </form>
            )}
            {resetStep === "complete" && (
              <button className="btn primary block" type="button" onClick={closeForgotPassword}>Back to sign in</button>
            )}
            {resetStep !== "complete" && (
              <button className="login-link" type="button" onClick={closeForgotPassword}>Back to sign in</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}