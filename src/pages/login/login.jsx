import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { api, jsonBody } from "../../lib/api.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { refreshUser, notify } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/auth/login", { method: "POST", body: jsonBody({ email, password }) });
      await refreshUser();
      notify("Congratulations! You successfully created your profile.");
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-wordmark" to="/">northstar<span>.</span></Link>
        <div className="auth-badge">Welcome back</div>
        <h1>Log in to your workspace</h1>
        <p>Manage your business profile, campaigns, and connections in one place.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email address<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-btn full-width" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="auth-footer"><span>New to Northstar?</span><Link to="/signup">Create an account</Link></div>
        <Link className="auth-home-link" to="/">Return home</Link>
      </div>
    </main>
  );
}
