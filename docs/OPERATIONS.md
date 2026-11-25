# Katavi E-Kilimo — Operations & Disaster Recovery Runbook

Owner: platform maintainer. Last reviewed: 2026-11-25.

The API runs on Render from `gateway`-style Express 5 code in `server/`, backed by
MongoDB Atlas and an optional Redis cache. This document covers deploy, monitoring,
secret rotation, incident response and recovery drills.

## 1. Environments

| Environment | URL | Notes |
| --- | --- | --- |
| Production API | `https://katavi-farmer-hub.onrender.com/api/v1` | Render free plan, `render.yaml` |
| Local API | `http://localhost:5000` | `.env` copied from `.env.example` |
| Local Flutter web | `http://localhost:8090` | CORS allow-list |

Secrets live only in Render environment variables and the gitignored `.env`.
`.env.example` and `render.yaml` list the variable names, never values.

## 2. Health & monitoring

- `GET /api/health` (also `/api/v1/health`) — 200 when MongoDB is connected, 503
  otherwise. Reports `database`, `cache` (backend, host, latency, max keys), and
  `uptimeSeconds`. Render uses this path as its health check.
- `GET /api/v1/metrics` — admin JWT only. Request counters, status buckets,
  slowest routes, heap/RSS.
- Error bursts: every 5xx is counted; 10 errors within 60s triggers one alert with
  a 60s cooldown. Alerts POST JSON to `ALERT_WEBHOOK_URL` (Slack/Teams/Discord)
  and always also log at `error` level.
- Logs are structured JSON (`LOG_LEVEL=info` in production). Always include the
  request id returned in error responses when correlating incidents.

Recommended Render alert rules: health check failing for 2 minutes, HTTP 5xx rate
above 2%, p95 latency above 1.5s.

## 3. Deploy & rollback

1. CI (GitHub Actions) must pass `npm test` in `server/`.
2. Merge to `master`; Render auto-deploys if the repo is connected. Otherwise
   trigger a manual deploy in the Render dashboard.
3. Verify: `/api/health` returns 200 with `"database":"connected"`, then run the
   smoke load test (section 7) at 10 concurrency for 15s.
4. Rollback: Render → service → Deploys → previous successful deploy → "Redeploy".
   No database migrations are destructive, so rollback needs no data fix.

## 4. Secret rotation

| Secret | Rotation steps |
| --- | --- |
| `JWT_SECRET` | Set new value in Render, redeploy. All existing tokens become invalid, so announce a re-login window. |
| `MONGODB_URI` | Rotate the Atlas database user; update Render; redeploy; confirm health. |
| `PAYMENT_WEBHOOK_SECRET` | Update with the payment provider at the same time; both sides must match before the next webhook. |
| `CLOUDINARY_*`, `GROQ_API_KEY`, `RESEND_API_KEY`, `AFRICASTALKING_*` | Rotate in provider console, update Render, redeploy, exercise one request path that uses the key. |
| `ALERT_WEBHOOK_URL` | Point at the new channel; send a test error burst (dev only) or rely on the next real alert. |

Never commit rotated values. If a secret leaks, rotate first, then audit
`GET /api/v1/admin/audit-logs` for unusual admin activity.

## 5. Caching and Redis degradation

- `REDIS_URL` is optional. Without it (or on connection failure) the service falls
  back to an in-process cache capped at `CACHE_MAX_KEYS` (default 5000).
- Cache failures never fail a request; they degrade to MongoDB reads.
- Health output shows `cache.backend = "memory"`, `ready: false` and masks
  credentials (`rediss://***@host:port`).
- Redis loss invalidates caches automatically because entries are keyed by
  `katavi:ekilimo:` and rebuilt from MongoDB on demand.

## 6. Background work

- Hourly cron marks expired pending orders (crop and input) and releases stock.
- Job worker polls `JobTask` every 5s for PDF/report jobs; failures retry with
  exponential backoff (60s × 2^n, cap 1h) up to `maxAttempts`, then `failed`.
- `DISABLE_CRON=true` disables both; use it for load tests and local runs.
- Stuck jobs: inspect `JobTask {status: 'running'}`. If a worker died mid-job,
  reset with `{status: 'queued', runAt: now}` from `mongosh`. Admins can also
  `POST /api/v1/jobs/:id/retry` for failed jobs.

## 7. Load test baseline

Two scripts live in `loadtest/`:

- `k6 run -e BASE_URL=... loadtest/api.js` — full scenario with k6 thresholds
  (`p95 < 1200ms`, failure rate < 1%).
- `node loadtest/smoke.mjs <baseUrl> <seconds> <concurrency>` — dependency-free
  public-endpoint smoke. It sends a unique bearer token per request so the
  per-token rate limiter simulates many devices instead of one hot IP.

Baseline captured 2026-11-25 against a local Node 24 process using the production
Atlas cluster (remote DB latency included), 10 concurrent clients, 20 seconds:

| Metric | Result |
| --- | --- |
| Requests | 2,974 (148.7 rps) |
| Failures | 0 |
| p50 / p95 / p99 | 81ms / 108ms / 403ms |
| `/api/health` p95 | 16ms |
| `/api/v1/crop-types` p95 | 17ms (cached) |
| `/api/v1/products` p95 | 146ms |
| `/api/v1/market-prices` p95 | 383ms |
| `/api/v1/news` p95 | 391ms |

Interpretation: the API itself is not the bottleneck; uncached list endpoints are
dominated by Atlas round-trip time from the test machine. Re-run from a Render
instance (same region as Atlas) before making capacity decisions, and record the
new numbers here.

A control run without per-request tokens produced 37,629 `429` responses out of
47,862 requests — the per-client limiter behaves as designed and must not be
disabled in production.

## 8. Disaster recovery

Targets: RPO ≤ 5 minutes (Atlas continuous backup), RTO ≤ 1 hour.

1. **Database loss / corruption**
   - Atlas → Cluster → Backup → restore to a new cluster (point-in-time within the
     retention window; free tier: daily snapshot).
   - Update `MONGODB_URI` in Render to the restored cluster, redeploy, verify
     counts on `users`, `orders`, `payments`, then `/api/health`.
   - Re-run the hourly expiry job logic by waiting one hour (or triggering it in a
     dev shell) so stale pending orders are released.
2. **Render outage or bad deploy**
   - Roll back to the last good deploy (section 3). If the platform is down,
     redeploy the `master` commit to a new Render service using `render.yaml`.
3. **Redis loss** — no action; fallback cache takes over (section 5).
4. **Media loss (Cloudinary)** — URLs are stored, not binaries; re-upload from the
   original source or hide affected listings. Audit for broken image URLs.
5. **Ransomware / credential compromise** — rotate every secret in section 4,
   invalidate sessions via `JWT_SECRET`, review `AuditLog` and payment ledger,
   then restore from a backup taken before the incident.

Run a restore drill quarterly: restore the latest snapshot to a scratch cluster,
boot locally against it, and confirm the smoke load test passes with 0 failures.
Record the drill date and RTO below.

| Drill date | Snapshot used | Observed RTO | Notes |
| --- | --- | --- | --- |
| — | — | — | not yet run |

## 9. Incident checklist

1. Confirm scope: `/api/health`, Render logs, `GET /api/v1/metrics`.
2. Classify: database down, deploy regression, error burst, payment webhook,
   queue backlog, security event.
3. Mitigate (rollback, restore, rotate) before root-causing.
4. Communicate in Swahili to farmers via the announcement broadcast if the outage
   lasts more than 15 minutes.
5. Write a short post-incident note: timeline, impact, cause, follow-up commit.

## 10. Pre-release checklist

- `cd server && npm test` is green (243 tests at the time of writing).
- `node --check` on every changed file; boot smoke with `DISABLE_CRON=true`.
- New env vars added to `.env.example` **and** `render.yaml`.
- New admin mutations record an audit entry; no secrets in logs or responses.
- Flutter app builds and the changed screens were exercised against the API.
