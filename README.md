# LOF 3D Viewer

Student prototype voting portal — rate Sketchfab 3D models 1–5 stars.

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (free M0 tier works)

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd server && npm install
cd ../client && npm install
```

### 2. Configure server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
- `MONGODB_URI` — your Atlas connection string
- `JWT_SECRET` — run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `ADMIN_MASTER_SECRET` — any string you'll use to create sessions
- `PORT=4000`

### 3. Configure client

```bash
cp client/.env.example client/.env
```

`VITE_API_URL` can stay empty in development — Vite proxy forwards `/api` to `http://localhost:4000`.

## Development

Two terminals:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- Student vote page: `http://localhost:5173/vote/<sessionId>`
- Admin login: `http://localhost:5173/admin`

## Create a session (first-time setup)

```bash
curl -X POST http://localhost:4000/api/admin/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Batch 3 Review","password":"yourpassword","masterSecret":"yourMasterSecret"}'
```

Copy the returned `sessionId`. Use it to log in at `/admin`.

## Production build

```bash
cd client && npm run build
NODE_ENV=production cd ../server && npm start
```

The Express server serves the React build at port 4000.

## Tests

```bash
cd server && npm test       # Jest — 4 test suites
cd client && npm test       # Vitest — component tests
```
