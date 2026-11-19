import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";

export default function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <Link className="footer-brand" to={user ? "/dashboard" : "/"} aria-label="Northstar home">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>northstar<span className="brand-period">.</span></span>
      </Link>
      <span className="footer-note">Made for the ones making it happen.</span>
      <div className="footer-links">
        <Link to="/businesses">Explore</Link>
        <Link to="/collaboration">Collaborate</Link>
        <Link to={user ? "/dashboard" : "/login"}>{user ? "My workspace" : "Sign in"}</Link>
      </div>
      <span className="footer-copyright">© 2025 NORTHSTAR</span>
    </footer>
  );
}
