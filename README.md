# Northstar

Northstar helps independent businesses create public profiles, find collaborators,
and plan social campaigns. The project includes a React/Vite frontend and an
Express API backed by MongoDB. Explore the public business directory at
`/businesses` and open profiles to view business details.

## Run locally

1. Install Node.js and create a free MongoDB Atlas cluster.
2. In Atlas, create a database user and add your current IP address under Network Access. Avoid allowing access from `0.0.0.0/0`.
3. In the cluster's **Connect > Drivers** flow, copy the connection string. Replace its password placeholder, URL-encode special characters in the password, and use `northstar` as the database name.
4. Install dependencies with `npm install`.
5. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
   Use a randomly generated JWT secret of at least 32 characters. `.env` is
   ignored by Git; never share or commit it.
6. Optionally add administrator email addresses to `ADMIN_EMAILS` as a
   comma-separated list. Those addresses receive the admin role when they sign up.
7. To populate the public directory for a local demo, run `npm run seed`. This
   adds 42 fictional sample business profiles and does not erase existing data.
   The Explore directory displays up to 14 profiles per page. Sample profiles are
   also listed as open to collaboration, but they are not registered owner
   accounts.
8. Start the API and frontend together with `npm run dev`. Open the URL printed by
   Vite. The API listens on port 3001 and Vite proxies `/api` requests to it.

Accounts use email and password; email OTP verification is not enabled.

New business profiles are reviewed by an administrator before appearing publicly.
Owners can edit their business details, branches, team, achievements, links, and
collaboration preferences in `/dashboard`. Collaboration proposals are stored in
the database and can be accepted or declined there.

Campaigns can currently be saved as drafts or plans. Public social links are
displayed on the business profile, but publishing to Instagram, Facebook, X, or
Google is not enabled: each platform requires its own developer app, OAuth
credentials, access scopes, and in some cases platform approval. Owners can
provide an image URL or upload a JPEG, PNG, or WebP (up to 5 MB); uploaded images
are stored in MongoDB GridFS.

Never commit `.env` or production credentials. Deploying the API, database,
verified email sender, and frontend is a separate setup step.

## Validate

```sh
npm run lint
npm run build
```
