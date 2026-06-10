# 3D Viewer — Design Spec
**Date:** 2026-06-08  
**Project:** LOF 3D Model Voting Portal  
**Status:** Approved

---

## Overview

A standalone web portal where students open a shareable link, rate 3D prototype models (1–5 stars), and submit once. Admins manage sessions (create, open, close) and view live rankings. The top-rated model goes to production. Built to match the LOF Internal Portal design system and designed for clean integration into the LOF Portal later.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (online) |
| Styling | LOF Design System (Orbitron / Rajdhani / Fira Code, brand `#1C4D8C`) |
| Auth | bcrypt (admin password) + JWT (24h, localStorage) |
| Dedup | voterUUID (random UUID, localStorage) + MongoDB unique compound index |

**Server:** i7-14700K, 28 cores, ~13GB free RAM — far more than sufficient.

---

## Architecture

```
[React + Vite]  ──HTTPS──▶  [Node.js + Express]  ──▶  [MongoDB Atlas]
     │                              │
  /vote/:id                  JWT middleware (admin routes)
  /admin                     bcrypt (admin password check)
  /admin/dashboard           voterUUID dedup (compound index)
```

The frontend and backend are separate packages inside one monorepo (`client/` and `server/`). They communicate over REST. No WebSockets needed — admin refreshes to see updated rankings.

---

## MongoDB Collections

### `sessions`
```json
{
  "_id": "ObjectId",
  "name": "Batch 3 Prototype Review",
  "status": "open | closed",
  "adminPasswordHash": "bcrypt hash",
  "createdAt": "Date",
  "closedAt": "Date | null"
}
```

### `models`
```json
{
  "_id": "ObjectId",
  "sessionId": "ObjectId",
  "name": "Heat Seek Rover",
  "sketchfabEmbedUrl": "https://sketchfab.com/models/.../embed",
  "order": 1
}
```

### `votes`
```json
{
  "_id": "ObjectId",
  "sessionId": "ObjectId",
  "modelId": "ObjectId",
  "voterUUID": "uuid-v4",
  "rating": 4,
  "createdAt": "Date"
}
```
**Unique index:** `{ sessionId: 1, modelId: 1, voterUUID: 1 }` — hard-rejects duplicate votes at DB level.

---

## API Routes

### Public (no auth)
```
GET  /api/sessions/:id
     → session status + ordered models list

POST /api/votes
     body: { sessionId, ratings: [{ modelId, rating }], voterUUID }
     → 200 OK | 403 session closed | 400 invalid rating | 409 duplicate
```

### Admin (JWT required)
```
POST   /api/admin/login
       body: { sessionId, password }
       → { token }

POST   /api/sessions
       body: { name, password }
       → created session

PATCH  /api/sessions/:id/status
       body: { status: "open" | "closed" }

POST   /api/sessions/:id/models
       body: { name, sketchfabEmbedUrl, order }
       → only allowed when session is closed

DELETE /api/sessions/:id/models/:modelId
       → only allowed when session is closed

GET    /api/sessions/:id/results
       → models sorted by average rating desc, with vote count
```

---

## Pages

### `/vote/:sessionId` — Student Voting Page
- Fetches session on load; shows "Voting is closed" if `status === "closed"`
- Checks localStorage for `submitted_<sessionId>` flag; shows "Already voted" if set
- Generates `voterUUID` on first visit and persists to localStorage
- **Carousel flow:** one model at a time (one Sketchfab iframe loaded at a time — performance critical)
- Progress indicator: "Model 3 of 8"
- Star rating widget (1–5) per model; Previous / Next navigation
- Submit button appears only on the last model; disabled until the current model is rated
- Students can skip back and change ratings before submitting; unrated models are simply excluded from the vote (no error)
- On submit: POST all rated models in one request → on 200, set `submitted_<sessionId>` in localStorage → show Thank You screen

### `/admin` — Admin Login
- LOF login card (matches portal style)
- Password input → POST `/api/admin/login` → JWT stored in localStorage → redirect to dashboard
- Error banner on wrong password

### `/admin/dashboard` — Admin Dashboard (JWT protected)
- Shows current session name, status badge, shareable vote link with Copy button
- Open / Close voting buttons (PATCH status)
- Rankings table: models sorted by avg rating, showing star score + vote count
- Add model form: name + Sketchfab embed URL + Add button (disabled when session is open); order is set by insertion sequence
- Model list showing all models in order, with delete button (disabled when session is open)

---

## Sketchfab Performance Strategy

Loading 5–10 Sketchfab iframes simultaneously is heavy on the student's browser GPU. The carousel approach loads **one iframe at a time** — the previous iframe is unmounted when navigating to the next model. This keeps browser memory stable regardless of how many models are in the session.

Sketchfab rendering happens entirely in the student's browser (WebGL) — zero load on the LOF server.

---

## Duplicate Vote Prevention

| Mechanism | What it does | Limitation |
|---|---|---|
| voterUUID in localStorage | Identifies returning visitor | Cleared if student uses incognito |
| MongoDB unique compound index | Hard DB-level rejection | Cannot be bypassed by the API |
| `submitted_<sessionId>` flag | Blocks UI re-submission | Cleared in incognito |

This is the correct trust level for prototype voting by students — not a public election. A determined student in incognito can vote twice; this is acceptable.

---

## Admin Auth

- Password stored as bcrypt hash inside the session document (no separate users collection needed)
- Login returns a JWT signed with `JWT_SECRET` env var, 24h expiry
- JWT sent as `Authorization: Bearer <token>` header on all admin API calls
- Frontend stores JWT in localStorage, reads on dashboard load, redirects to `/admin` if missing or expired

---

## Folder Structure

```
3dviewer/
├── client/                         (React + Vite)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 (React Router setup)
│       ├── styles/
│       │   └── lof-design-system.css
│       ├── pages/
│       │   ├── VotePage.jsx
│       │   ├── AdminLogin.jsx
│       │   └── AdminDashboard.jsx
│       └── components/
│           ├── StarRating.jsx
│           ├── ModelCarousel.jsx
│           └── RankingsTable.jsx
└── server/
    ├── package.json
    ├── index.js                    (Express app entry)
    ├── middleware/
    │   └── auth.js                 (JWT verification)
    ├── models/
    │   ├── Session.js              (Mongoose schema)
    │   ├── Model.js
    │   └── Vote.js
    └── routes/
        ├── admin.js
        ├── sessions.js
        └── votes.js
```

---

## Environment Variables

```
# server/.env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/3dviewer
JWT_SECRET=<random 64-char string>
PORT=4000

# client/.env
VITE_API_URL=http://localhost:4000
```

---

## LOF Portal Integration (Future)

This app is built standalone. When integrating into the LOF Portal:
1. Replace admin password auth with LOF SSO JWT validation (`GET /auth/validate`)
2. MongoDB Atlas stays as-is or migrates to portal's PostgreSQL — either works
3. Add the vote link to portal navigation as a sub-app tile
4. Pass `?token=` on navigation per the existing portal sub-app pattern

---

## Failure Modes & Mitigations

| Scenario | What happens | Mitigation |
|---|---|---|
| Student loses connection mid-vote | Ratings lost, not submitted | Submit is one atomic POST — partial states never reach DB |
| MongoDB Atlas goes down | API returns 503 | Express error handler returns clear error; student sees "Try again" |
| Sketchfab embed fails to load | Blank iframe | Show model name + "3D preview unavailable" fallback text |
| Admin JWT expires during session | Dashboard shows 401 | Redirect to `/admin` login with "Session expired" message |
| Student clears localStorage | Can vote again | Acceptable for this use case |
| Server restarts | Zero data loss | All state is in MongoDB Atlas |
