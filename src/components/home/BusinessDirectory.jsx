import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { api } from "../../lib/api.js";

const pageSize = 14;

export default function BusinessDirectory() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const requestKey = `${page}:${query}`;

  useEffect(() => {
    let active = true;
    api(`/businesses?page=${page}&limit=${pageSize}&q=${encodeURIComponent(query)}`)
      .then((result) => {
        if (!active) return;
        setResult({ key: requestKey, businesses: result.businesses, pageCount: result.pageCount, error: "" });
      })
      .catch((requestError) => {
        if (active) setResult({ key: requestKey, businesses: [], pageCount: 0, error: requestError.message });
      });
    return () => { active = false; };
  }, [page, query, requestKey]);

  const currentResult = result?.key === requestKey ? result : null;
  const loading = !currentResult;
  const businesses = currentResult?.businesses || [];
  const pageCount = currentResult?.pageCount || 0;
  const error = currentResult?.error || "";

  return (
    <section className="directory-preview" aria-labelledby="directory-title">
      <div className="directory-heading">
        <div>
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> GOOD BUSINESSES, OUT IN THE OPEN</div>
          <h2 id="directory-title">Meet the <span>community.</span></h2>
        </div>
        <label className="directory-search">
          <span className="visually-hidden">Search businesses</span>
          <input type="search" value={query} onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }} placeholder="Search businesses" />
        </label>
      </div>

      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {loading ? (
        <p className="page-status" role="status">Loading businesses…</p>
      ) : businesses.length ? (
        <>
          <div className="business-grid directory-grid">
            {businesses.map((business, index) => (
              <Link className="business-card directory-card" to={`/business/${business._id}`} key={business._id}>
                {business.photoUrl ? (
                  <img className="directory-photo" src={business.photoUrl} alt="" loading="lazy" />
                ) : (
                  <div className={`directory-placeholder directory-tone-${index % 4}`} aria-hidden="true">
                    {(business.name || "B").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="business-card-footer">
                  <div>
                    <h3>{business.name}</h3>
                    <p>{business.category || "Independent business"}{business.branches?.[0]?.address ? ` · ${business.branches[0].address}` : ""}</p>
                  </div>
                  <span className="round-arrow" aria-hidden="true">↗</span>
                </div>
              </Link>
            ))}
          </div>
          <nav className="directory-pagination" aria-label="Business pages">
            <span>Page {page} of {pageCount}</span>
            <div>
              <button type="button" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>Previous</button>
              {Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    type="button"
                    key={pageNumber}
                    aria-label={`Go to page ${pageNumber}`}
                    aria-current={pageNumber === page ? "page" : undefined}
                    disabled={pageNumber === page}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= pageCount}>Next</button>
            </div>
          </nav>
        </>
      ) : (
        <div className="directory-empty">
          <h3>{query ? "No businesses match that search yet." : "The directory is ready for its first business."}</h3>
          <p>Register your business to create a profile and become part of the Northstar community.</p>
          {!user && <Link className="button button-dark" to="/signup">Create an account <span aria-hidden="true">↗</span></Link>}
        </div>
      )}
    </section>
  );
}
