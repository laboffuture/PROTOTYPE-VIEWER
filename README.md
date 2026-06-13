# PROTOVIEW — 3D Prototype Review Portal

A student voting portal for 3D prototypes. The admin creates a **review batch**, adds Sketchfab-hosted 3D models, and shares a single link. Students open the link on any device, explore each model in an interactive 3D viewer (rotate, zoom, play animations), rate it 1–5 stars, and submit. The admin watches results update **live** — with average-rating bars and star-distribution histograms — on a dedicated dashboard.

Built for **LOF (Lab of Future)** as a standalone module that can also be driven by a parent admin dashboard through its REST API.

---

## Features

### Student side (`/vote/:batchId`)
- Large interactive 3D viewer (Sketchfab embed, 68% of screen) with autorotate
- Animation play/pause buttons driven by the Sketchfab Viewer API
- Model name + description panel, star rating — all on one screen, no scrolling
- **Every prototype must be rated before submitting** — enforced in the UI and again on the server
- One submission per device (localStorage UUID + unique DB index — no duplicate votes)
- Responsive: viewer and controls stack vertically on phones
- After submitting: a simple thank-you. **Students never see results.**

### Admin side (`/admin`)
- Single common admin login (username + password from environment, JWT 24h)
- Professional sidebar layout — Batches and Prototypes sections
- **Prototype library** — a master list of all models (name, embed URL, summary) managed on its own page; batches receive copies, so editing the library never affects a running review
- **Create a batch by tapping prototype tiles** — selection order becomes the order students see; copies go into the new batch
- Add/remove models per batch manually too (locked while voting is open)
- Open/close voting with one click (opening requires at least one prototype), copy shareable vote link
- Delete a closed batch along with its models and votes — from the list or the batch page
- **Live results page** — auto-refreshes every 5s: total votes, leading prototype, average-rating bars, per-star histograms
- **Analytics page** — program-wide view across every batch: per-prototype donut charts + star histograms (grouped by model, so one product is one row even across several reviews), an average-rating comparison, and a per-batch "opened → voted" participation funnel

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  Student: /vote/:id          Admin: /admin → dashboard      │
└──────────────┬──────────────────────────┬───────────────────┘
               │ REST (JSON)              │ REST + JWT Bearer
┌──────────────▼──────────────────────────▼───────────────────┐
│                 Express API  (Node.js, port 4000)           │
│                                                             │
│  /api/sessions/:id        public — batch info + models      │
│  /api/votes               public — submit ratings           │
│  /api/admin/*             JWT-protected — manage everything │
│                                                             │
│  In production also serves the built React app (client/dist)│
└──────────────────────────┬──────────────────────────────────┘
                           │ Mongoose
┌──────────────────────────▼──────────────────────────────────┐
│                  MongoDB Atlas (free tier)                  │
│   sessions        review batches (name, open/closed)        │
│   sessionmodels   models per batch (Sketchfab URL, desc)    │
│   votes           one doc per rating; unique index on       │
│                   {sessionId, modelId, voterUUID}           │
│   views           one doc per device that opened a batch;    │
│                   unique {sessionId, voterUUID} (open count) │
└─────────────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, React Router, plain CSS design system (no UI framework) |
| 3D | Sketchfab embed + Sketchfab Viewer API 1.12 (animations, viewer control) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas via Mongoose |
| Auth | Single admin credential (env) → JWT (24h), `Authorization: Bearer` |
| Testing | Vitest (client), Jest + Supertest + mongodb-memory-server (server) |

### Key design decisions

- **Vote integrity** — each browser gets a persistent UUID (localStorage); the DB enforces a compound unique index `{sessionId, modelId, voterUUID}`, so duplicates are rejected server-side, not just hidden in the UI.
- **Results are admin-only** — there is no public results endpoint. Students get a thank-you screen only.
- **Open-tracking is forward-only** — the student page pings a lightweight beacon on load, deduped per device, so the analytics "opens" funnel counts from the day it deployed onward. Votes, by contrast, are aggregated retroactively from existing data.
- **Models are locked while voting is open** — prevents mid-vote changes that would skew averages.
- **Admin credentials live in env, not the DB** — one common login, zero user-management overhead. Swap to DB-backed accounts only when multiple admins are needed.
- **One process in production** — Express serves the built React app, so a single port runs everything.

---

## Project structure

```
3dviewer/
├── client/                      # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── AdminLayout.jsx      # Sidebar + topbar shell for admin pages
│       │   ├── ModelCarousel.jsx    # 3D viewer + animations + rating (student)
│       │   ├── StarRating.jsx       # Accessible 1–5 star input
│       │   ├── DonutChart.jsx       # SVG donut of a 1–5★ distribution (no chart lib)
│       │   └── RankingsTable.jsx    # Sortable results table
│       ├── pages/
│       │   ├── VotePage.jsx         # Student voting flow (+ open beacon)
│       │   ├── AdminLogin.jsx       # Username/password → JWT
│       │   ├── AdminDashboard.jsx   # Batches list + create batch from library tiles
│       │   ├── PrototypeLibrary.jsx # Master prototype library (add/edit/remove)
│       │   ├── AnalyticsDashboard.jsx # Program-wide analytics across all batches
│       │   └── SessionDetail.jsx    # Per-batch: live results + model management
│       └── styles/
│           └── lof-design-system.css  # All design tokens & component classes
├── server/                      # Express API
│   ├── index.js                 # App wiring, CORS, static serving in production
│   ├── db.js                    # Mongoose connection
│   ├── models/                  # Session, Model (SessionModel), Vote, LibraryModel, View schemas
│   ├── routes/                  # admin.js, sessions.js, votes.js
│   ├── middleware/auth.js       # JWT verification
│   ├── seed.js                  # One-time seeding of demo batch into Atlas
│   ├── seed-library.js          # Seed the prototype library with all LOF models
│   └── demo.js                  # Zero-config demo (in-memory MongoDB)
└── docs/
    └── STYLE-GATE.md            # Complete visual style guide
```

---

## API reference

### Public

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions/:id` | Batch info + its models (no results) |
| `POST` | `/api/sessions/:id/open` | Record an open: `{ voterUUID }` — deduped per device, feeds the analytics funnel |
| `POST` | `/api/votes` | Submit ratings: `{ sessionId, voterUUID, ratings: [{ modelId, rating }] }` |

### Admin (require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | `{ username, password }` → `{ token }` |
| `GET` | `/api/admin/sessions` | List all batches with model counts |
| `POST` | `/api/admin/sessions` | Create batch: `{ name, copyModelIds? }` — optionally copy prototypes from the library |
| `DELETE` | `/api/admin/sessions/:id` | Delete a closed batch with its models and votes |
| `PATCH` | `/api/admin/sessions/:id/status` | `{ status: "open" \| "closed" }` — opening requires ≥ 1 model |
| `GET` | `/api/admin/library` | List all library prototypes |
| `POST` | `/api/admin/library` | Add prototype: `{ name, sketchfabEmbedUrl, description? }` |
| `PATCH` | `/api/admin/library/:id` | Edit a library prototype |
| `DELETE` | `/api/admin/library/:id` | Remove from library (batch copies unaffected) |
| `POST` | `/api/admin/sessions/:id/models` | Add model: `{ name, sketchfabEmbedUrl, description? }` |
| `DELETE` | `/api/admin/sessions/:id/models/:modelId` | Remove model (batch must be closed) |
| `GET` | `/api/admin/sessions/:id/results` | Live results: avg rating, vote count, star distribution per model |
| `GET` | `/api/admin/analytics` | Program-wide analytics: totals, per-prototype (grouped by embed URL), per-batch funnel |

### Integrating from a parent dashboard

PROTOVIEW is designed to run as a module under a central admin portal. The parent app logs in once via `/api/admin/login`, then drives everything over REST — create batches, add models, open voting, pull live results — and surfaces the vote link (`<host>/vote/:batchId`) to share. See the endpoint table above; every admin UI action has a 1:1 API call.

---

## Getting started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier is enough) — or none at all for demo mode

### Option A — instant demo (no database setup)

```bash
cd server && npm install
node demo.js
```

Spins up an in-memory MongoDB, seeds a demo batch with two models, and prints the vote link and admin credentials. Then in a second terminal:

```bash
cd client && npm install && npm run dev
```

### Option B — real setup

1. **Install**

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure** — copy `server/.env.example` to `server/.env` and fill in:

   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/3dviewer
   JWT_SECRET=<64-char random string>   # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ADMIN_USERNAME=<your admin username>
   ADMIN_PASSWORD=<your admin password>
   PORT=4000
   CLIENT_URL=http://localhost:5173
   ```

   In Atlas: create a database user and allow your server's IP (or `0.0.0.0/0`) under Network Access.

3. **Run** (two terminals)

   ```bash
   cd server && node index.js      # API on :4000
   cd client && npm run dev        # UI  on :5173
   ```

4. Open `http://localhost:5173/admin`, log in, create a batch, add models, open voting, share the link.

### Tests

```bash
cd server && npm test    # API + DB integration tests
cd client && npm test    # component tests
```

---

## Production deployment

One process serves everything:

```bash
cd client && npm run build          # outputs client/dist
cd ../server
NODE_ENV=production node index.js   # serves API + built frontend on PORT
```

- Set all env vars from `.env.example` on the host (Render / Railway / any VPS).
- Set `CLIENT_URL` to your public origin.
- The vote links (`https://your-domain/vote/:id`) then work on **any device with internet** — that's the whole point.

---

## Design system

Three fonts with one job each — **Orbitron** (uppercase headings), **Rajdhani** (body), **Fira Code** (data) — over a white-surface / 2px-gray-border / **LOF blue `#1C4D8C`** accent language. The complete style gate (tokens, sidebar recipe, component specs) is documented in [`docs/STYLE-GATE.md`](docs/STYLE-GATE.md).
