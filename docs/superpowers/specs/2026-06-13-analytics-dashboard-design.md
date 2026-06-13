# Analytics Dashboard — Design

**Date:** 2026-06-13
**Status:** Approved, ready for implementation

## Goal

A complete, program-wide analytics page at `/admin/analytics` for PROTOVIEW: per-prototype
performance across every batch (average rating, review count, star distribution as a donut),
a side-by-side average-rating comparison, and a per-batch "opened → voted" funnel. This is the
page the LOF hub's Admin Link will later SSO into; SSO itself is a separate follow-up.

## Background — what we already capture vs. what is new

The current schema stores **votes only** (`Vote`: sessionId, modelId, voterUUID, rating 1–5,
timestamps; unique index on sessionId+modelId+voterUUID). From votes we can derive vote counts,
averages, distributions, and unique voters — retroactively and accurately.

We capture **nothing about page opens** today. To answer "how many people opened this review,"
we add lightweight open-tracking. It is **forward-only**: it starts counting the day it deploys
and cannot recover opens for reviews that already happened.

Prototypes live as **copies** inside each batch (a batch holds its own `Model` docs, no foreign
key back to `LibraryModel`). To analyse "each product across everything," we group batch models
by `sketchfabEmbedUrl`, the stable identity that survives copying.

## Architecture

Three new/modified server pieces and one new page, reusing existing patterns (StatCard,
ResultBar histogram, brand tokens, jest+supertest, vitest).

### Server

1. **`server/models/View.js`** (new) — one document per device-open of a batch.
   - Fields: `sessionId` (ObjectId ref Session), `voterUUID` (String), timestamps.
   - Unique compound index `{ sessionId, voterUUID }` so repeat opens from the same device
     count once. "Opens" therefore means **unique devices that opened the link**.

2. **`POST /api/sessions/:id/open`** (new, public, in `sessions.js`) — fire-and-forget beacon.
   - Body `{ voterUUID }`. Validates id (`isValidObjectId` → 404), session exists (→ 404),
     missing voterUUID → 400.
   - Upserts the View (`updateOne` with `$setOnInsert`, `upsert: true`); a racing duplicate
     key (11000) is swallowed and still returns 204.
   - Always 204 on success. No effect on the voting flow.

3. **`GET /api/admin/analytics`** (new, `requireAuth`, in `admin.js`) — aggregates everything:
   ```json
   {
     "totals":     { "batches", "prototypes", "votes", "voters", "opens" },
     "prototypes": [ { "name", "sketchfabEmbedUrl", "voteCount", "averageRating",
                       "distribution":[5], "batchCount" } ],   // grouped by URL, best→worst
     "batches":    [ { "id", "name", "status", "opens", "voters", "voteCount",
                       "averageRating", "leader": { "name", "averageRating" } | null,
                       "createdAt" } ]                          // newest first
   }
   ```
   - `totals.prototypes` = distinct `sketchfabEmbedUrl` across all batch models.
   - `totals.voters` = distinct `voterUUID` across all votes; `totals.opens` = View count.
   - Per-prototype: group models by URL, union their votes, compute count/avg/distribution,
     `batchCount` = distinct sessions the prototype appeared in. Sort by avg desc, then count.
   - Per-batch: `opens` from Views, `voters` distinct in that batch, `averageRating` over all
     votes in the batch, `leader` = highest-average model in the batch.
   - All in-memory after a handful of `find()`s, matching the existing results endpoint style
     (data volume is a school's worth of votes).

### Client

4. **`client/src/components/DonutChart.jsx`** (new) — hand-rolled SVG donut of a 1–5★
   distribution. Brand color with the same opacity ramp as the existing histogram
   (`0.3 + (i/4)*0.7`). Center shows `★ avg` + review count. Empty → muted ring + "No votes".
   No charting library (keeps the brand locked and the bundle lean).

5. **`client/src/pages/AnalyticsDashboard.jsx`** (new) — `AdminLayout crumb="Analytics"`:
   - **KPI strip** of StatCards: batches, prototypes, votes, students, opens+conversion.
   - **Prototype performance** — card grid, each with the donut + a small star histogram
     (reusing the ResultBar histogram look) + review count + batch count. Ranked best→worst.
   - **Average rating — all prototypes** — horizontal comparison bars (ResultBar avg-bar style).
   - **By batch** — each batch with `opened → voted (conversion%)` funnel + winner badge.
     Batches with no open data (pre-tracking) show "opens not tracked" instead of a bogus %.
   - 401 → `/admin`; network failure → inline error banner. Loads once on mount (no polling;
     this is a review/overview page, not a live board).

6. **`client/src/components/AdminLayout.jsx`** — add an "Analytics" nav link (bar-chart icon)
   under Prototypes; active on `/admin/analytics`.

7. **`client/src/App.jsx`** — add `<Route path="/admin/analytics" element={<AnalyticsDashboard />} />`.

8. **`client/src/pages/VotePage.jsx`** — on mount, read/create the device UUID and POST the
   open beacon (fire-and-forget, errors ignored), before the existing load logic.

## Testing

- **`server/tests/analytics.test.js`** (new):
  - `GET /analytics` totals across two batches that share a prototype by URL (grouping,
    `batchCount`, distinct voters/prototypes), distribution correctness, 401 without JWT.
  - `POST /sessions/:id/open` creates a View, dedupes a repeat open from the same device,
    counts two distinct devices as two, 400 missing voterUUID, 404 malformed/unknown id.
- **`client/src/components/DonutChart.test.jsx`** (new): renders five segments for a non-empty
  distribution, shows the average in the center, renders the empty state for all-zero.
- Existing 45 server + 16 client tests must stay green; client build must succeed.

## Out of scope (deliberate)

- **SSO entry** from the hub (shared-secret token) — next sub-project; this builds the page.
- **Per-prototype opens** (which model a non-voter looked at) — voting already forces rating
  every prototype, so per-model views add little for submitters; YAGNI for v1.
- No changes to voting, results, or library flows.
