import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Nav from "../../components/home/nav.jsx";
import SiteFooter from "../../components/home/SiteFooter.jsx";
import { useAuth } from "../../context/useAuth.js";
import { api } from "../../lib/api.js";

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M3.5 10h12m-5-5 5 5-5 5" /></svg>;
}

export default function Collaboration() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = 12;
  const [result, setResult] = useState(null);
  const requestKey = `${page}:${search}`;

  useEffect(() => {
    let active = true;
    api(`/businesses?collaboration=true&page=${page}&limit=${pageSize}&q=${encodeURIComponent(search)}`)
      .then((result) => {
        if (!active) return;
        setResult({ key: requestKey, businesses: result.businesses, pageCount: result.pageCount, error: "" });
      })
      .catch((requestError) => {
        if (active) setResult({ key: requestKey, businesses: [], pageCount: 0, error: requestError.message });
      });
    return () => { active = false; };
  }, [page, search, requestKey]);

  const currentResult = result?.key === requestKey ? result : null;
  const loading = !currentResult;
  const businesses = currentResult?.businesses || [];
  const pageCount = currentResult?.pageCount || 0;
  const error = currentResult?.error || "";

  const goToPage = (nextPage) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage === 1) params.delete("page");
    else params.set("page", String(nextPage));
    setSearchParams(params);
  };

  return (
    <main className="home-page collaboration-page">
      <Nav />
      <section className="partner-section" id="partners" aria-labelledby="partner-title">
        <div className="partner-shell">
          <div className="partner-heading">
            <div>
              <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> YOUR NEXT GREAT INTRODUCTION</div>
              <h1 id="partner-title">Find the right<br /><span>kind of different.</span></h1>
            </div>
            <p>These businesses opted in to collaboration. Browse their ideas, then send a proposal directly from a business profile.</p>
          </div>
          <div className="partner-toolbar">
            <p className="collab-directory-label">Businesses currently open to collaboration</p>
            <label className="partner-search">
              <span className="visually-hidden">Search collaborating businesses</span>
              <input type="search" placeholder="Search by name, product, or category" value={search} onChange={(event) => {
                setSearch(event.target.value);
                goToPage(1);
              }} />
            </label>
          </div>

          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {loading ? <p className="page-status" role="status">Loading collaboration businesses…</p> : businesses.length ? (
            <>
              <div className="partner-results" aria-live="polite">
                Showing <strong>{businesses.length}</strong> businesses accepting collaboration proposals
              </div>
              <div className="partner-grid">
                {businesses.map((business) => (
                  <article className="partner-card" key={business._id}>
                    {business.photoUrl ? <img className="partner-photo" src={business.photoUrl} alt="" loading="lazy" /> : <div className="partner-brand-mark forest" aria-hidden="true">{business.name.slice(0, 1)}</div>}
                    <div className="partner-card-meta">
                      <span className="partner-status status-growing">Open to collaborate</span>
                      <span>{business.foundedYear ? `Since ${business.foundedYear}` : business.branches?.[0]?.address || "Independent"}</span>
                    </div>
                    <h3>{business.name}</h3>
                    <div className="partner-category">{business.category || "Independent business"}</div>
                    <p className="partner-summary">{business.description || "A Northstar business ready to explore a good collaboration."}</p>
                    <div className="partner-products">
                      <span className="partner-label">PRODUCTS &amp; SERVICES</span>
                      <div className="partner-product-list">{(business.products || []).slice(0, 3).map((product) => <span key={product}>{product}</span>)}</div>
                    </div>
                    <div className="partner-ideas">
                      <span className="partner-label">OPEN TO</span>
                      <div className="partner-idea-list">{(business.collaborationIdeas || []).slice(0, 3).map((idea) => <span key={idea}>{idea}</span>)}</div>
                    </div>
                    <Link className="partner-cta" to={`/business/${business._id}`}>View profile &amp; propose <ArrowIcon /></Link>
                  </article>
                ))}
              </div>
              {pageCount > 1 && (
                <nav className="partner-pagination" aria-label="Collaboration directory pages">
                  <button className="pagination-edge" type="button" onClick={() => goToPage(page - 1)} disabled={page === 1}><span aria-hidden="true">←</span> Previous</button>
                  <span>{page} / {pageCount}</span>
                  <button className="pagination-edge" type="button" onClick={() => goToPage(page + 1)} disabled={page === pageCount}>Next <span aria-hidden="true">→</span></button>
                </nav>
              )}
            </>
          ) : (
            <div className="partner-empty">
              <span aria-hidden="true">✳</span>
              <h3>{search ? "No collaboration businesses match that search." : "No businesses have opened collaboration yet."}</h3>
              <p>Business owners can switch on collaboration proposals from their Northstar workspace.</p>
              {!user && <Link className="button button-dark" to="/signup">Create an account <ArrowIcon /></Link>}
            </div>
          )}
        </div>
      </section>

      <section className="benefits-section">
        <div className="benefits-shell">
          <div className="benefits-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> GOOD PARTNERSHIPS, REAL MOMENTUM</div>
            <h2>What could<br /><span>we make?</span></h2>
            <p>Collaboration should feel like a good fit—not another transaction. Start with what each business already does best.</p>
          </div>
          <div className="benefits-grid">
            <article className="benefit-card"><span className="benefit-number">01</span><span className="benefit-icon" aria-hidden="true">↗</span><h3>Reach new people</h3><p>Introduce your work to a like-minded audience through thoughtful co-marketing and community moments.</p></article>
            <article className="benefit-card"><span className="benefit-number">02</span><span className="benefit-icon" aria-hidden="true">✳</span><h3>Create something new</h3><p>Bring different strengths together for limited-edition products, bundles, or shared experiences.</p></article>
            <article className="benefit-card"><span className="benefit-number">03</span><span className="benefit-icon" aria-hidden="true">↗</span><h3>Grow with good people</h3><p>Trade know-how, build your network, and learn from businesses at a different stage of the journey.</p></article>
          </div>
        </div>
      </section>

      <section className="collab-invite">
        <div><div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> YOUR BUSINESS IS PART OF THE STORY</div><h2>Ready to make<br />a <span>good connection?</span></h2><p>Register your business and choose whether you want to receive collaboration proposals.</p></div>
        {!user && <Link className="button button-dark" to="/signup">Build your business profile <ArrowIcon /></Link>}
      </section>
      <SiteFooter />
    </main>
  );
}
