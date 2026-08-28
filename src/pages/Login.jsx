import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

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
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2 style={{ margin: "0 0 4px" }}>Schoolers Sign In</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "0 0 20px" }}>
          Parent · Teacher · School Admin · Pilot · Master Admin
        </p>
        {error && <div className="error-banner">{error}</div>}
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
        </form>
      </div>
    </div>
  );
}
