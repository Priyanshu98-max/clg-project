import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { api, jsonBody } from "../../lib/api.js";

export default function Signup() {
  const [name, setName] = useState("");
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
      await api("/auth/signup", {
        method: "POST",
        body: jsonBody({ name, email, password }),
      });
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
        <div className="auth-badge">Your next chapter</div>
        <h1>Create your account</h1>
        <p>Start with your details. You can register and manage your business after signing up.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Your name<input autoComplete="name" required minLength="2" maxLength="100" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></label>
          <label>Email address<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input autoComplete="new-password" type="password" required minLength="8" maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-btn full-width" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</button>
        </form>
        <div className="auth-footer"><span>Already have an account?</span><Link to="/login">Sign in</Link></div>
        <Link className="auth-home-link" to="/">Return home</Link>
      </div>
    </main>
  );
}
