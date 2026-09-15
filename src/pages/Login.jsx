import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import * as authApi from "../api/auth";

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
  const [resetStep, setResetStep] = useState("email");
  const [identifier, setIdentifier] = useState("");
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
    setResetStep("email");
    setIdentifier("");
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
      setResetMessage("Account found. Verify it to continue.");
      setResetStep("verify");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  async function verifyIdentifier() {
    setError(null);
    setResetMessage("");
    setResetSubmitting(true);
    try {
      const result = await authApi.verifyForgotPasswordIdentifier(identifier);
      setIdentifier(result.identifier || identifier);
      setResetMessage("Account verified. Choose a new password.");
      setResetStep("password");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError("Password must be 8–72 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setResetSubmitting(true);
    try {
      const result = await authApi.resetForgotPassword(identifier, newPassword);
      setResetMessage(result.message || "Password updated. You can now sign in.");
      setResetStep("complete");
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
            {resetStep === "email" && (
              <form onSubmit={checkIdentifier}>
                <div className="field">
                  <label>Username or email address</label>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. teacher1 or you@example.com" required />
                </div>
                <button className="btn primary block" type="submit" disabled={resetSubmitting}>
                  {resetSubmitting ? "Checking..." : "Continue"}
                </button>
              </form>
            )}
            {resetStep === "verify" && (
              <>
                <div className="reset-email">{identifier}</div>
                <button className="btn primary block" type="button" onClick={verifyIdentifier} disabled={resetSubmitting}>
                  {resetSubmitting ? "Verifying..." : "Verify account"}
                </button>
                <button className="login-link" type="button" onClick={() => setResetStep("email")}>Use another username or email</button>
              </>
            )}
            {resetStep === "password" && (
              <form onSubmit={resetPassword}>
                <div className="reset-email">{identifier}</div>
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
