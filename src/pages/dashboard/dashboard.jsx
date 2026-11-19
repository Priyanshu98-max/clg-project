import { useCallback, useEffect, useState } from "react";
import Nav from "../../components/home/nav.jsx";
import SiteFooter from "../../components/home/SiteFooter.jsx";
import { useAuth } from "../../context/useAuth.js";
import { api, jsonBody } from "../../lib/api.js";

const emptyForm = {
  name: "",
  photoUrl: "",
  category: "",
  description: "",
  foundedYear: "",
  ownerName: "",
  achievements: "",
  workers: "",
  branches: "",
  products: "",
  collaborationIdeas: "",
  isCollaborationOpen: false,
  socialLinks: { website: "", instagram: "", facebook: "", x: "", google: "" },
};

const lines = (value) => String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

function toForm(business) {
  if (!business) return { ...emptyForm, socialLinks: { ...emptyForm.socialLinks } };
  return {
    ...business,
    foundedYear: business.foundedYear || "",
    achievements: (business.achievements || []).join("\n"),
    workers: (business.workers || []).map((person) => `${person.name || ""} | ${person.role || ""}`).join("\n"),
    branches: (business.branches || []).map((branch) => `${branch.name || ""} | ${branch.address || ""}`).join("\n"),
    products: (business.products || []).join("\n"),
    collaborationIdeas: (business.collaborationIdeas || []).join("\n"),
    socialLinks: { ...emptyForm.socialLinks, ...(business.socialLinks || {}) },
  };
}

function toPayload(form) {
  return {
    ...form,
    foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
    achievements: lines(form.achievements),
    workers: lines(form.workers).map((item) => {
      const [name, ...role] = item.split("|");
      return { name: name.trim(), role: role.join("|").trim() };
    }),
    branches: lines(form.branches).map((item) => {
      const [name, ...address] = item.split("|");
      return { name: name.trim(), address: address.join("|").trim() };
    }),
    products: lines(form.products),
    collaborationIdeas: lines(form.collaborationIdeas),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(toForm(null));
  const [campaignForm, setCampaignForm] = useState({ title: "", description: "", platform: "instagram", scheduledFor: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setError("");
    try {
      const [businessResult, campaignResult, requestResult] = await Promise.all([
        api("/businesses/mine"),
        api("/campaigns"),
        api("/collaborations"),
      ]);
      setBusinesses(businessResult.businesses);
      setCampaigns(campaignResult.campaigns);
      setRequests(requestResult.requests);
      if (user.role === "admin") {
        const adminResult = await api("/admin/businesses?status=pending");
        setPendingBusinesses(adminResult.businesses);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [user.role]);

  useEffect(() => {
    let active = true;
    const requests = [
      api("/businesses/mine"),
      api("/campaigns"),
      api("/collaborations"),
    ];
    if (user.role === "admin") requests.push(api("/admin/businesses?status=pending"));
    Promise.all(requests)
      .then(([businessResult, campaignResult, requestResult, adminResult]) => {
        if (!active) return;
        setBusinesses(businessResult.businesses);
        setCampaigns(campaignResult.campaigns);
        setRequests(requestResult.requests);
        if (adminResult) setPendingBusinesses(adminResult.businesses);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.role]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateSocialLink = (field, value) => setForm((current) => ({
    ...current,
    socialLinks: { ...current.socialLinks, [field]: value },
  }));
  const selectedBusiness = businesses.find((business) => business._id === selectedId);

  const saveBusiness = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingBusiness(true);
    try {
      const payload = toPayload(form);
      const result = selectedId
        ? await api(`/businesses/${selectedId}`, { method: "PUT", body: jsonBody(payload) })
        : await api("/businesses", { method: "POST", body: jsonBody(payload) });
      setSelectedId(result.business._id);
      setForm(toForm(result.business));
      setNotice(selectedId ? "Your business profile has been saved." : "Business registered. It will appear publicly after admin approval.");
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingBusiness(false);
    }
  };

  const saveCampaign = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/campaigns", {
        method: "POST",
        body: jsonBody({ ...campaignForm, businessId: selectedId }),
      });
      setCampaignForm({ title: "", description: "", platform: "instagram", scheduledFor: "" });
      setNotice("Campaign draft saved. Connecting a social account is required before anything can be published.");
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const uploadPhoto = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await api("/uploads/business-photo", { method: "POST", body });
      updateForm("photoUrl", result.photoUrl);
      setNotice("Business photo uploaded to MongoDB. Save your profile to publish it.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      input.value = "";
    }
  };

  const respondToRequest = async (requestId, status) => {
    setError("");
    try {
      await api(`/collaborations/${requestId}`, { method: "PATCH", body: jsonBody({ status }) });
      setNotice(`Collaboration request ${status}.`);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const moderateBusiness = async (businessId, status) => {
    setError("");
    try {
      await api(`/admin/businesses/${businessId}`, { method: "PATCH", body: jsonBody({ status }) });
      setNotice(`Business ${status}.`);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (loading) {
    return <main className="home-page"><Nav /><p className="page-status" role="status">Loading your workspace…</p><SiteFooter /></main>;
  }

  return (
    <main className="home-page portal-page">
      <Nav />
      <section className="portal-shell">
        <div className="portal-heading">
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> YOUR NORTHSTAR WORKSPACE</div>
          <h1>Welcome, <span>{user.name}.</span></h1>
          <p>Register your business, keep its details up to date, and manage the connections you make.</p>
        </div>

        {error && <p className="form-message form-error" role="alert">{error}</p>}
        {notice && <p className="form-message form-success" role="status">{notice}</p>}

        <section className="portal-panel profile-editor-panel" aria-labelledby="business-form-title">
          <div className="portal-section-heading">
            <div>
              <span className="portal-kicker">01 / BUSINESS PROFILE</span>
              <h2 id="business-form-title">{selectedId ? "Your business details" : "Register a business"}</h2>
            </div>
            <label className="portal-select-label">
              <span>Choose a business</span>
              <select value={selectedId} onChange={(event) => {
                const nextId = event.target.value;
                setSelectedId(nextId);
                setForm(toForm(businesses.find((business) => business._id === nextId)));
              }}>
                <option value="">New business</option>
                {businesses.map((business) => <option value={business._id} key={business._id}>{business.name} · {business.status}</option>)}
              </select>
            </label>
          </div>
          {selectedBusiness && <p className="business-review-note">Listing status: <strong>{selectedBusiness.status}</strong>. Pending or rejected profiles are not visible in the public directory.</p>}

          <div className="profile-editor-layout">
            <aside className="profile-editor-preview" aria-label="Business profile preview">
              <div className="profile-editor-cover">
                <span>PROFILE PREVIEW</span>
                <span className="profile-cover-decoration" aria-hidden="true">✳</span>
              </div>
              <div className="profile-editor-preview-body">
                <div className="profile-editor-avatar">
                  {form.photoUrl
                    ? <img src={form.photoUrl} alt="" />
                    : <span aria-hidden="true">{(form.name || "B").slice(0, 1).toUpperCase()}</span>}
                </div>
                <span className="profile-editor-category">{form.category || "Business category"}</span>
                <h3>{form.name || "Your business name"}</h3>
                <p>{form.description || "A short introduction to your business will appear here."}</p>
                <div className="profile-editor-preview-footer">
                  <span>{form.foundedYear ? `Since ${form.foundedYear}` : "Your public profile"}</span>
                  <span className={form.isCollaborationOpen ? "is-open" : ""}>{form.isCollaborationOpen ? "Open to collaborate" : "Not accepting proposals"}</span>
                </div>
              </div>
            </aside>

            <form className="portal-form profile-editor-form" onSubmit={saveBusiness}>
              <section className="profile-editor-section">
                <div className="profile-editor-section-heading">
                  <div><span className="portal-kicker">01 / ESSENTIALS</span><h3>Tell your story</h3></div>
                  <span>Required fields marked *</span>
                </div>
                <div className="portal-form-grid">
                  <label>Business name *<input required maxLength="120" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="e.g. Northstar Studio" /></label>
                  <label>Category<input maxLength="80" value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="Food, design, retail…" /></label>
                  <label>Owner / founder<input maxLength="100" value={form.ownerName} onChange={(event) => updateForm("ownerName", event.target.value)} placeholder="Your name" /></label>
                  <label>Year founded<input type="number" min="1000" max="3000" value={form.foundedYear} onChange={(event) => updateForm("foundedYear", event.target.value)} placeholder="2024" /></label>
                  <label className="portal-field-wide">About your business<textarea maxLength="2000" rows="3" value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="What makes your business special?" /></label>
                </div>
              </section>

              <section className="profile-editor-section">
                <div className="profile-editor-section-heading">
                  <div><span className="portal-kicker">02 / BRAND</span><h3>Images</h3></div>
                  <span>Make your profile recognizable</span>
                </div>
                <div className="profile-image-options">
                  <div className="profile-image-option">
                    <label>Profile image
                      <input type="url" value={form.photoUrl.startsWith("/api/business-photos/") ? "" : form.photoUrl} onChange={(event) => updateForm("photoUrl", event.target.value)} placeholder="Paste an image URL" />
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
                    </label>
                    <span>Shown as your business avatar. Upload or paste an image URL.</span>
                  </div>
                  <div className="profile-image-option profile-image-coming-soon">
                    <span>Business cover image</span>
                    <button className="profile-image-placeholder" type="button" disabled><span aria-hidden="true">＋</span> Add a cover photo</button>
                    <span>Cover image option · coming soon</span>
                  </div>
                  <div className="profile-image-option profile-image-coming-soon">
                    <span>Business photos</span>
                    <button className="profile-image-placeholder" type="button" disabled><span aria-hidden="true">＋</span> Add photos to your gallery</button>
                    <span>Photo gallery option · coming soon</span>
                  </div>
                </div>
              </section>

              <section className="profile-editor-section">
                <div className="profile-editor-section-heading">
                  <div><span className="portal-kicker">03 / SOCIAL</span><h3>Links &amp; social profiles</h3></div>
                </div>
                <div className="portal-form-grid profile-social-grid">
                  {Object.entries(form.socialLinks).map(([platform, value]) => (
                    <label key={platform}>{platform === "x" ? "X / Twitter" : platform === "google" ? "Google" : platform[0].toUpperCase() + platform.slice(1)}
                      <input type="url" value={value} onChange={(event) => updateSocialLink(platform, event.target.value)} placeholder={`https://${platform === "website" ? "yourbusiness.com" : `${platform}.com/yourbusiness`}`} />
                    </label>
                  ))}
                </div>
                <p className="profile-editor-hint">Add your website, Instagram, Facebook, Google, and X links to show them on your profile.</p>
              </section>

              <details className="profile-editor-details">
                <summary>More profile details <span>Team, locations, products &amp; achievements</span></summary>
                <div className="portal-form-grid">
                  <label>Achievements <span className="input-hint">One item per line</span><textarea rows="3" value={form.achievements} onChange={(event) => updateForm("achievements", event.target.value)} placeholder={"Local business award\nReached 1,000 customers"} /></label>
                  <label>Team members <span className="input-hint">One per line: Name | Role</span><textarea rows="3" value={form.workers} onChange={(event) => updateForm("workers", event.target.value)} placeholder={"Alex | Founder\nSam | Designer"} /></label>
                  <label className="portal-field-wide">Locations <span className="input-hint">One per line: Branch name | full address</span><textarea rows="3" value={form.branches} onChange={(event) => updateForm("branches", event.target.value)} placeholder={"Main branch | 123 Example Street, City"} /></label>
                  <label>Products / services <span className="input-hint">One per line</span><textarea rows="3" value={form.products} onChange={(event) => updateForm("products", event.target.value)} placeholder={"Custom furniture\nDesign consultation"} /></label>
                  <label>Collaboration ideas <span className="input-hint">One per line</span><textarea rows="3" value={form.collaborationIdeas} onChange={(event) => updateForm("collaborationIdeas", event.target.value)} placeholder={"Local events\nProduct bundles"} /></label>
                </div>
              </details>

              <label className="portal-check profile-editor-collaboration">
                <input type="checkbox" checked={form.isCollaborationOpen} onChange={(event) => updateForm("isCollaborationOpen", event.target.checked)} />
                <span>Show this business in the Collaboration directory and accept proposals.</span>
              </label>
              <button type="submit" className="button button-dark profile-editor-save" disabled={savingBusiness}>
                {savingBusiness ? "Saving…" : selectedId ? "Save business profile" : "Register business"} <span aria-hidden="true">↗</span>
              </button>
            </form>
          </div>
        </section>

        <div className="portal-two-column">
          <section className="portal-panel" aria-labelledby="campaign-title">
            <span className="portal-kicker">02 / CAMPAIGNS</span>
            <h2 id="campaign-title">Plan a campaign</h2>
            {!selectedId ? <p>Create a business profile before you start a campaign.</p> : (
              <>
                <form className="portal-form portal-campaign-form" onSubmit={saveCampaign}>
                  <label>Campaign name<input required maxLength="120" value={campaignForm.title} onChange={(event) => setCampaignForm({ ...campaignForm, title: event.target.value })} placeholder="Spring launch" /></label>
                  <label>Platform<select value={campaignForm.platform} onChange={(event) => setCampaignForm({ ...campaignForm, platform: event.target.value })}>
                    <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="x">X / Twitter</option><option value="google">Google</option>
                  </select></label>
                  <label>Campaign content<textarea rows="3" value={campaignForm.description} onChange={(event) => setCampaignForm({ ...campaignForm, description: event.target.value })} placeholder="Plan your post or campaign…" /></label>
                  <label>Planned date and time<input type="datetime-local" value={campaignForm.scheduledFor} onChange={(event) => setCampaignForm({ ...campaignForm, scheduledFor: event.target.value })} /></label>
                  <p className="integration-note">Campaigns are saved as drafts/plans. Live publishing is not connected until you configure each platform’s official API and OAuth credentials.</p>
                  <button className="button button-dark" type="submit">Save campaign <span aria-hidden="true">↗</span></button>
                </form>
                <div className="portal-list">
                  {campaigns.map((campaign) => (
                    <article className="portal-list-item" key={campaign._id}>
                      <div><h3>{campaign.title}</h3><p>{campaign.businessId?.name || "Business"} · {campaign.platform} · {campaign.status}</p></div>
                    </article>
                  ))}
                  {!campaigns.length && <p>No campaigns yet. Your drafts and plans will appear here.</p>}
                </div>
              </>
            )}
          </section>

          <section className="portal-panel" aria-labelledby="requests-title">
            <span className="portal-kicker">03 / COLLABORATION</span>
            <h2 id="requests-title">Your requests</h2>
            <div className="portal-list">
              {requests.map((request) => {
                const incoming = businesses.some((business) => business._id === request.toBusinessId?._id);
                return (
                  <article className="portal-list-item" key={request._id}>
                    <div>
                      <h3>{request.fromBusinessId?.name || "A business"} → {request.toBusinessId?.name || "A business"}</h3>
                      <p>{request.message}</p><span className="portal-status">{request.status}</span>
                    </div>
                    {incoming && request.status === "pending" && <div className="portal-inline-actions">
                      <button type="button" onClick={() => respondToRequest(request._id, "accepted")}>Accept</button>
                      <button type="button" onClick={() => respondToRequest(request._id, "declined")}>Decline</button>
                    </div>}
                  </article>
                );
              })}
              {!requests.length && <p>Collaboration proposals you send or receive will appear here.</p>}
            </div>
          </section>
        </div>

        {user.role === "admin" && (
          <section className="portal-panel" aria-labelledby="moderation-title">
            <span className="portal-kicker">ADMIN / REVIEW</span>
            <h2 id="moderation-title">Business listings to review</h2>
            <div className="portal-list">
              {pendingBusinesses.map((business) => (
                <article className="portal-list-item" key={business._id}>
                  <div><h3>{business.name}</h3><p>{business.ownerId?.name} · {business.ownerId?.email} · {business.category}</p><p>{business.description}</p></div>
                  <div className="portal-inline-actions">
                    <button type="button" onClick={() => moderateBusiness(business._id, "approved")}>Approve</button>
                    <button type="button" onClick={() => moderateBusiness(business._id, "rejected")}>Reject</button>
                  </div>
                </article>
              ))}
              {!pendingBusinesses.length && <p>No business listings are waiting for review.</p>}
            </div>
          </section>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
