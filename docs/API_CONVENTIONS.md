# API conventions

Base URL: `https://katavi-farmer-hub.onrender.com/api/v1`. All responses are JSON
unless noted (USSD is `text/plain`). Swahili `message` fields are shown directly to
users, so keep them short and actionable.

## List envelope

Every list endpoint returns the same shape when the client asks for it:

```http
GET /api/v1/opportunities?page=2&limit=20
X-List-Format: envelope
```

```json
{
  "items": [ ... ],
  "total": 137,
  "page": 2,
  "limit": 20,
  "pages": 7,
  "hasMore": true
}
```

Rules:

- `X-List-Format: envelope` (or `?format=envelope`) opts in. Without it, legacy
  endpoints keep returning bare arrays so older app builds do not break.
- Endpoints built after 2026-11 (opportunities, contracts, farm services, jobs,
  documents, billing, agents, training, warehouses, institutional, sync) always
  return the envelope; the opt-in only matters for older arrays.
- `page` starts at 1. `limit` defaults to the size of the result set and is capped
  at 200. `total` is the full count before slicing, `pages` is derived, and
  `hasMore` tells scroll views when to stop.
- Error responses are never wrapped: `{ "message": "...", "requestId": "..." }`.

The Flutter app sends the header from `ApiService` and parses with a tolerant
helper, so both legacy arrays and envelopes decode into `List<dynamic>`.

## Paths and casing

- Plural, kebab-case collections: `/market-prices`, `/farm-services`,
  `/warehouse-bookings`.
- Current user scoped lists sit under an explicit segment: `/my`, `/mine`,
  `/applications/my`.
- Staff-only lists are mounted under `/admin` or guarded by `requirePermission`.

## Auth

`Authorization: Bearer <jwt>`. Roles: `farmer`, `buyer`, `seller`, `expert`,
`logistics`, `warehouse`, and staff (`admin`, `support`, `content_moderator`,
`finance_officer`). Role switches reuse the same token; the server re-reads the
user on every request.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Validation failure (`message` explains the field in Swahili) |
| 401 | Missing/expired token |
| 403 | Role or permission denied, or phone not verified |
| 404 | Record missing or not visible to the caller |
| 409 | Duplicate (application already sent, invoice number clash) |
| 413 | Upload too large |
| 429 | Rate limited per device/token |
| 500 | Unhandled server error; includes `requestId` for log correlation |

## Offline clients

`POST /sync/push` accepts up to 50 mutations per batch and is idempotent by
`clientId`; `GET /sync/bootstrap` caches reference data for 10 minutes.
