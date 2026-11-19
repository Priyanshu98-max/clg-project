import Nav from "../../components/home/nav.jsx";
import BusinessDirectory from "../../components/home/BusinessDirectory.jsx";
import SiteFooter from "../../components/home/SiteFooter.jsx";

export default function Businesses() {
  return (
    <main className="home-page business-directory-page">
      <Nav />
      <div className="business-directory-shell">
        <header className="business-directory-intro">
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> THE NORTHSTAR DIRECTORY</div>
          <h1>Explore <span>businesses.</span></h1>
          <p>Discover independent businesses, search by name or category, and find your next favorite.</p>
        </header>
        <BusinessDirectory />
      </div>
      <SiteFooter />
    </main>
  );
}
