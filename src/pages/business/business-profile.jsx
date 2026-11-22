import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../../components/home/nav.jsx";
import SiteFooter from "../../components/home/SiteFooter.jsx";
import { useAuth } from "../../context/useAuth.js";
import { api, jsonBody } from "../../lib/api.js";

export default function BusinessProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [fromBusinessId, setFromBusinessId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const locations = business?.branches || [];
  const products = business?.products || [];
  const workers = business?.workers || [];
  const collaborationIdeas = business?.collaborationIdeas || [];
  const socialLinks = Object.entries(business?.socialLinks || {}).filter(([, url]) => url);

  useEffect(() => {
    let active = true;
    api(`/businesses/${id}`)
      .then((result) => { if (active) setBusiness(result.business); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!user || !showRequest) return;
    api("/businesses/mine")
      .then((result) => {
        setOwnedBusinesses(result.businesses);
        if (result.businesses[0]) setFromBusinessId(result.businesses[0]._id);
      })
      .catch((requestError) => setError(requestError.message));
  }, [user, showRequest]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/collaborations", {
        method: "POST",
        body: jsonBody({ fromBusinessId, toBusinessId: business._id, message }),
      });
      setNotice("Your collaboration proposal has been sent to the business owner.");
      setShowRequest(false);
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="home-page business-detail-page">
      <Nav />
      {loading ? <p className="page-status" role="status">Loading business…</p> : error && !business ? (
        <section className="business-detail-shell"><p className="form-message form-error" role="alert">{error}</p><Link to="/businesses">Back to businesses</Link></section>
      ) : business ? (
        <section className="business-detail-shell">
          <Link className="detail-back-link" to="/businesses">← All businesses</Link>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {notice && <p className="form-message form-success" role="status">{notice}</p>}
          <article className="business-profile">
            <div className="business-profile-cover">
              {business.photoUrl && (
                <img className="business-profile-cover-photo" src={business.photoUrl} alt="" />
              )}
              <div className="business-profile-cover-shade" aria-hidden="true" />
              <div className="business-profile-cover-top">
                <span>THE NORTHSTAR DIRECTORY</span>
                <span>{locations[0]?.address || "Independent business"}</span>
              </div>
              <div className="business-profile-cover-mark" aria-hidden="true">N<span>✳</span></div>
            </div>
            <div className="business-profile-intro">
              <div className="business-profile-avatar">
                {business.photoUrl
                  ? <img src={business.photoUrl} alt={`${business.name} logo`} />
                  : <span aria-hidden="true">{business.name.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="business-profile-identity">
                <div className="business-profile-labels">
                  <span className="business-profile-category">{business.category || "Independent business"}</span>
                  {business.isCollaborationOpen && <span className="business-profile-open">Open to collaboration</span>}
                </div>
                <h1>{business.name}</h1>
                <p>{business.description || "A Northstar community business."}</p>
                <div className="business-profile-facts">
                  {locations[0]?.address && <span>{locations[0].address}</span>}
                  {business.foundedYear && <span>Founded {business.foundedYear}</span>}
                  {business.ownerName && <span>By {business.ownerName}</span>}
                </div>
              </div>
              {business.isCollaborationOpen && (
                <div className="business-profile-actions">
                  {user ? (
                    <button className="button button-dark" type="button" onClick={() => setShowRequest((open) => !open)}>Propose a collaboration ↗</button>
                  ) : (
                    <Link className="button button-dark" to="/login">Sign in to collaborate ↗</Link>
                  )}
                </div>
              )}
            </div>
            <div className="business-profile-stats" aria-label="Business at a glance">
              <div><strong>{locations.length}</strong><span>{locations.length === 1 ? "Location" : "Locations"}</span></div>
              <div><strong>{products.length}</strong><span>Products &amp; services</span></div>
              <div><strong>{workers.length}</strong><span>Team members</span></div>
            </div>
          </article>

          {showRequest && (
            <form className="portal-form profile-request-form" onSubmit={submitRequest}>
              {ownedBusinesses.length ? (
                <>
                  <label>Send from
                    <select required value={fromBusinessId} onChange={(event) => setFromBusinessId(event.target.value)}>
                      {ownedBusinesses.map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>Your proposal<textarea required maxLength="2000" rows="4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Introduce your business and share your collaboration idea." /></label>
                  <button className="button button-dark" type="submit">Send proposal ↗</button>
                </>
              ) : <p>Register your business before sending a proposal. <Link to="/dashboard">Go to your workspace</Link></p>}
            </form>
          )}

          <div className="business-profile-content">
            <div className="business-profile-main">
            <section className="business-profile-section">
              <span className="business-profile-section-label">OUR STORY</span>
              <h2>About {business.name}</h2>
              <p>{business.description || "This business hasn't added an introduction yet."}</p>
              {business.ownerName && <p className="business-profile-owner">Founded by <strong>{business.ownerName}</strong></p>}
            </section>
            <section className="business-profile-section">
              <span className="business-profile-section-label">WHAT WE DO</span>
              <h2>Products &amp; services</h2>
              {products.length ? (
                <div className="business-profile-chips">{products.map((item) => <span key={item}>{item}</span>)}</div>
              ) : <p>No products or services listed yet.</p>}
            </section>
            {business.isCollaborationOpen && (
              <section className="business-profile-section">
                <span className="business-profile-section-label">GOOD THINGS, TOGETHER</span>
                <h2>Open to collaboration</h2>
                {collaborationIdeas.length ? (
                  <div className="business-profile-chips">{collaborationIdeas.map((idea) => <span key={idea}>{idea}</span>)}</div>
                ) : <p>Get in touch with a collaboration idea.</p>}
              </section>
            )}
            </div>
            <aside className="business-profile-sidebar">
            <section className="business-profile-section">
              <span className="business-profile-section-label">AT A GLANCE</span>
              <h2>Business details</h2>
              {business.ownerName && <p><strong>Owner</strong><span>{business.ownerName}</span></p>}
              {business.foundedYear && <p><strong>Established</strong><span>{business.foundedYear}</span></p>}
              {locations.length ? locations.map((branch) => (
                <p key={branch._id || branch.name}><strong>{branch.name || "Location"}</strong><span>{branch.address}</span></p>
              )) : <p><strong>Location</strong><span>Not specified</span></p>}
            </section>
            {workers.length > 0 && (
              <section className="business-profile-section">
                <span className="business-profile-section-label">THE PEOPLE</span>
                <h2>Meet the team</h2>
                <ul className="business-profile-team">{workers.map((worker) => <li key={`${worker.name}-${worker.role}`}><strong>{worker.name}</strong>{worker.role && <span>{worker.role}</span>}</li>)}</ul>
              </section>
            )}
            {business.achievements?.length > 0 && (
              <section className="business-profile-section">
                <span className="business-profile-section-label">MILESTONES</span>
                <h2>Achievements</h2>
                <ul className="business-profile-list">{business.achievements.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            )}
            {socialLinks.length > 0 && (
              <section className="business-profile-section">
                <span className="business-profile-section-label">STAY CONNECTED</span>
                <h2>Find us online</h2>
                <div className="business-socials">{socialLinks.map(([platform, url]) => <a href={url} target="_blank" rel="noreferrer" key={platform}>{platform === "x" ? "X / Twitter" : platform[0].toUpperCase() + platform.slice(1)} ↗</a>)}</div>
              </section>
            )}
            </aside>
          </div>
        </section>
      ) : null}
      <SiteFooter />
    </main>
  );
}
