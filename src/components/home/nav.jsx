import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [navError, setNavError] = useState("");

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="nav-brand" to={user ? "/dashboard" : "/"} aria-label="Northstar home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>northstar<span className="brand-period">.</span></span>
        </Link>

        <button
          className={`menu-toggle${menuOpen ? " is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-links"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span />
        </button>

        <div className={`nav-content${menuOpen ? " is-open" : ""}`} id="primary-links">
          <div className="nav-links">
          <Link to="/businesses" onClick={closeMenu}>Explore businesses</Link>
            <Link to="/collaboration" onClick={closeMenu}>Collaboration</Link>
          </div>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="nav-login" to="/dashboard" onClick={closeMenu}>My workspace</Link>
                <button className="nav-signup" type="button" onClick={async () => {
                  setNavError("");
                  try {
                    await signOut();
                    closeMenu();
                    navigate("/");
                  } catch (error) {
                    setNavError(error.message);
                  }
                }}>Sign out</button>
              </>
            ) : (
              <>
                <Link className="nav-login" to="/login" onClick={closeMenu}>Log in</Link>
                <Link className="nav-signup" to="/signup" onClick={closeMenu}>Sign up <span aria-hidden="true">↗</span></Link>
              </>
            )}
          </div>
        </div>
        {navError && <span className="nav-error" role="alert">{navError}</span>}
      </nav>
    </header>
  );
}
