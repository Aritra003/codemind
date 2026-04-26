# API-DESIGN.md — StinKit REST API Contract
# Mode: API-DESIGN | Agent: TITAN
# Hard block: BUILDER cannot implement any route without a matching entry here.
# Last updated: 2026-04-23
# Base URL: https://api.stinkit.dev/api/v1
# All responses: Content-Type: application/json
# All timestamps: ISO 8601 UTC (e.g. "2026-04-23T20:00:00Z")
================================================================================

## Global Contracts

### Authentication
All authenticated endpoints require:
  Header: Authorization: Bearer <access_token>
  access_token: JWT, 15-minute TTL, signed HS256 with APP_JWT_SECRET
  On expiry: respond 401 TOKEN_EXPIRED — client must call POST /auth/refresh

API-key authentication (CLI telemetry + status checks):
  Header: X-Api-Key: <raw_key>
  Validated by: bcrypt compare against identity.api_keys.key_hash

### Standard Error Envelope
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### Error Code Registry
| Code | HTTP | Trigger |
|---|---|---|
| VALIDATION_FAILED | 400 | Zod schema parse failure — details contains field errors |
| INVALID_CREDENTIALS | 401 | Wrong email/password combination |
| TOKEN_EXPIRED | 401 | JWT exp claim passed |
| TOKEN_INVALID | 401 | JWT signature invalid or malformed |
| ACCOUNT_DELETED | 401 | User soft-deleted (deleted_at is set) |
| UNAUTHORIZED | 401 | Missing Authorization header |
| FORBIDDEN | 403 | Authenticated but insufficient role/permission |
| NOT_FOUND | 404 | Resource does not exist or is not visible to caller |
| CONFLICT | 409 | Duplicate: email already registered, slug already taken |
| USAGE_LIMIT_EXCEEDED | 402 | Monthly deep_analysis_count reached tier limit |
| PAYMENT_REQUIRED | 402 | Feature requires a paid subscription tier |
| RATE_LIMITED | 429 | Rate limit hit — Retry-After header included |
| INTERNAL_ERROR | 500 | Unhandled server error — never exposes stack traces |
| SERVICE_UNAVAILABLE | 503 | Dependency (DB/Redis/Stripe) unreachable — includes Retry-After |

### Pagination Contract (all list endpoints)
Cursor-based. Never offset-based.
```json
{
  "data": [...],
  "next_cursor": "base64_opaque_cursor_or_null",
  "has_more": true
}
```
Request: ?limit=20&cursor=<next_cursor>
Default limit: 20. Max limit: 100. Over max → VALIDATION_FAILED.

### Versioning
All routes prefixed /api/v1/. Breaking change = /api/v2/ + Deprecation header on v1.
Deprecation header format: Deprecation: true; sunset="2027-04-23"

================================================================================
## HEALTH
================================================================================

### GET /api/v1/health
Auth:        public (no auth required)
Request:     none
Response 200:
  {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2026-04-23T20:00:00Z",
    "services": {
      "postgres": "ok" | "degraded",
      "redis":    "ok" | "degraded",
      "clickhouse": "ok" | "degraded"
    }
  }
Response 503: status "degraded" if any critical service unreachable
Errors:      503 SERVICE_UNAVAILABLE (when returning degraded)
Rate limit:  200 req/min per IP (monitoring systems poll this)
Idempotent:  yes
AI usage:    no
SLO tier:    CRITICAL
Perf target: p50 < 10ms · p99 < 50ms (in-memory check only — no DB query)
Breaking:    no

================================================================================
## AUTH
================================================================================

### POST /api/v1/auth/register
Auth:        public
Request:
  {
    "email":        string (email format, max 254 chars),
    "password":     string (min 10 chars, max 128 chars),
    "display_name": string (optional, max 100 chars)
  }
Response 201:
  {
    "user": {
      "id":           uuid,
      "email":        string,
      "display_name": string | null,
      "created_at":   timestamp
    },
    "access_token":  string (JWT, 15 min),
    "refresh_token": string (opaque UUID, 7 days — set HttpOnly cookie AND returned in body)
  }
Errors:
  400 VALIDATION_FAILED — missing/invalid fields
  409 CONFLICT — email already registered
Side effects:
  - Creates identity.users row
  - Creates billing.subscriptions row (tier: 'free', trial: 14 days)
  - Creates billing.usage_meters row for current billing period
  - Emits install_id registration if provided in X-Install-Id header
Rate limit:  5 req/min per IP · 3 req/min per email (anti-spam)
Idempotent:  no
AI usage:    no
SLO tier:    CRITICAL
Perf target: p50 < 150ms · p99 < 500ms (bcrypt is the bottleneck — work factor 12)
Breaking:    no

---

### POST /api/v1/auth/login
Auth:        public
Request:
  {
    "email":    string,
    "password": string
  }
Response 200:
  {
    "user": { "id", "email", "display_name", "created_at" },
    "access_token":  string,
    "refresh_token": string
  }
Errors:
  400 VALIDATION_FAILED
  401 INVALID_CREDENTIALS — deliberate: same response for wrong email AND wrong password
  401 ACCOUNT_DELETED — account was soft-deleted
Rate limit:  10 req/min per IP · 5 req/min per email (brute-force prevention)
Idempotent:  no
AI usage:    no
SLO tier:    CRITICAL
Perf target: p50 < 200ms · p99 < 600ms (bcrypt compare dominant)
Breaking:    no
Security:    Constant-time comparison via bcrypt. No timing oracle.

---

### POST /api/v1/auth/refresh
Auth:        public (refresh token in body — not a bearer endpoint)
Request:
  {
    "refresh_token": string
  }
Response 200:
  {
    "access_token":  string (new JWT, 15 min),
    "refresh_token": string (rotated — old token invalidated in Redis)
  }
Errors:
  400 VALIDATION_FAILED
  401 TOKEN_INVALID — token not found in Redis or malformed
  401 TOKEN_EXPIRED — token TTL exceeded (7 days)
  401 ACCOUNT_DELETED
Rate limit:  30 req/min per IP
Idempotent:  no (token rotation)
AI usage:    no
SLO tier:    CRITICAL
Perf target: p50 < 20ms · p99 < 80ms (Redis lookup only)
Breaking:    no
Security:    Refresh token stored as UUID in Redis (key: refresh:{token_hash}).
             On use: delete old token, write new token. Prevents replay attacks.

---

### POST /api/v1/auth/logout
Auth:        bearer
Request:
  {
    "refresh_token": string (optional — if provided, revokes it)
  }
Response 204: no body
Errors:      401 UNAUTHORIZED | TOKEN_EXPIRED | TOKEN_INVALID
Side effects: deletes refresh token from Redis if provided
Rate limit:  30 req/min per user
Idempotent:  yes (safe to call multiple times)
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 15ms · p99 < 60ms
Breaking:    no

---

### GET /api/v1/auth/me
Auth:        bearer
Request:     none
Response 200:
  {
    "id":           uuid,
    "email":        string,
    "display_name": string | null,
    "created_at":   timestamp,
    "subscription": {
      "tier":   "free" | "pro" | "team" | "enterprise",
      "status": "active" | "trialing" | "past_due" | "cancelled",
      "trial_ends_at": timestamp | null
    }
  }
Errors:      401 UNAUTHORIZED | TOKEN_EXPIRED
Rate limit:  60 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    CRITICAL (called on every app load)
Perf target: p50 < 30ms · p99 < 100ms (PostgreSQL + Redis subscription cache, 60s TTL)
Breaking:    adding fields = non-breaking. removing/renaming = breaking.

---

### PUT /api/v1/auth/me
Auth:        bearer
Request:
  {
    "display_name": string (optional, max 100 chars)
  }
Response 200: same shape as GET /auth/me
Errors:      400 VALIDATION_FAILED | 401 UNAUTHORIZED
Rate limit:  10 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 50ms · p99 < 150ms
Breaking:    no

---

### POST /api/v1/auth/password/reset-request
Auth:        public
Request:
  {
    "email": string
  }
Response 204: always (even if email not found — prevents enumeration)
Side effects: queues email job via BullMQ if account exists
Rate limit:  3 req/hour per email · 10 req/hour per IP
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 50ms · p99 < 200ms
Breaking:    no

---

### POST /api/v1/auth/password/reset
Auth:        public (one-time reset token in body)
Request:
  {
    "token":        string (opaque reset token from email link),
    "new_password": string (min 10 chars, max 128 chars)
  }
Response 200:
  {
    "access_token":  string,
    "refresh_token": string
  }
Errors:
  400 VALIDATION_FAILED
  401 TOKEN_INVALID — reset token expired (TTL: 1 hour) or already used
Rate limit:  5 req/hour per IP
Idempotent:  no (token consumed on use)
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 200ms · p99 < 600ms (bcrypt dominant)
Breaking:    no

---

### POST /api/v1/auth/oauth/:provider
Auth:        public
Request:
  {
    "code":         string (OAuth authorization code from provider),
    "redirect_uri": string
  }
Path param: provider = "github" | "google"
Response 200: same shape as /auth/login response
Response 201: same shape + { "new_user": true } (first sign-in creates account)
Errors:
  400 VALIDATION_FAILED
  400 INVALID_CREDENTIALS — OAuth code invalid or expired
  409 CONFLICT — email already registered with password (offer merge flow)
Rate limit:  10 req/min per IP
Idempotent:  no
AI usage:    no
SLO tier:    CRITICAL
Perf target: p50 < 500ms · p99 < 1500ms (external OAuth provider RTT included)
Breaking:    adding new providers = non-breaking

================================================================================
## API KEYS
================================================================================

### GET /api/v1/api-keys
Auth:        bearer
Request:     none
Response 200:
  {
    "data": [
      {
        "id":           uuid,
        "name":         string,
        "scopes":       string[],
        "created_at":   timestamp,
        "last_used_at": timestamp | null,
        "revoked_at":   timestamp | null
      }
    ],
    "next_cursor": null,
    "has_more": false
  }
Note:        key_hash never returned. Raw key returned ONLY at creation time.
Rate limit:  30 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 100ms
Breaking:    no

---

### POST /api/v1/api-keys
Auth:        bearer
Request:
  {
    "name":   string (max 100 chars),
    "scopes": string[] (subset of ["telemetry:write", "status:read"])
  }
Response 201:
  {
    "id":         uuid,
    "name":       string,
    "key":        string (raw key — shown ONCE, never again. Format: cm_live_<32 hex chars>),
    "scopes":     string[],
    "created_at": timestamp
  }
Errors:
  400 VALIDATION_FAILED
  409 CONFLICT — name already used by this user
  403 FORBIDDEN — free tier cannot create more than 1 API key
Side effects: inserts identity.api_keys with key_hash = bcrypt(raw_key, 12)
Rate limit:  5 req/min per user · max 10 active keys per user
Idempotent:  no
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 200ms · p99 < 500ms
Breaking:    no
Security:    Raw key: cm_live_{crypto.randomBytes(32).toString('hex')}. Prefix enables key
             scanning in logs/repos. Never logged server-side.

---

### DELETE /api/v1/api-keys/:id
Auth:        bearer
Request:     none
Response 204: no body
Errors:
  401 UNAUTHORIZED
  404 NOT_FOUND — key does not exist or does not belong to authenticated user
Side effects: sets identity.api_keys.revoked_at = now()
Rate limit:  10 req/min per user
Idempotent:  yes (DELETE of already-revoked key returns 204)
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 80ms
Breaking:    no

================================================================================
## TEAMS
================================================================================

### POST /api/v1/teams
Auth:        bearer
Tier gate:   requires subscription tier ≥ 'team'
Request:
  {
    "name": string (min 3, max 100 chars),
    "slug": string (optional — auto-generated from name if omitted. max 50 chars, /^[a-z0-9-]+$/)
  }
Response 201:
  {
    "id":         uuid,
    "name":       string,
    "slug":       string,
    "created_at": timestamp,
    "role":       "admin"
  }
Errors:
  400 VALIDATION_FAILED
  402 PAYMENT_REQUIRED — tier < 'team'
  409 CONFLICT — slug already taken
Side effects:
  - Creates identity.teams row
  - Creates identity.team_members row (caller = admin)
Rate limit:  5 req/min per user · 3 teams max per user on team tier
Idempotent:  no
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 50ms · p99 < 150ms
Breaking:    no

---

### GET /api/v1/teams/:id
Auth:        bearer · must be a member of the team
Request:     none
Response 200:
  {
    "id":           uuid,
    "name":         string,
    "slug":         string,
    "created_at":   timestamp,
    "member_count": number,
    "my_role":      "admin" | "member" | "viewer"
  }
Errors:      401 UNAUTHORIZED | 404 NOT_FOUND (or not a member — same response)
Rate limit:  60 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 100ms
Breaking:    no

---

### PUT /api/v1/teams/:id
Auth:        bearer · role: admin
Request:
  { "name": string (optional) }
Response 200: same shape as GET /teams/:id
Errors:      400 | 401 | 403 FORBIDDEN (not admin) | 404
Rate limit:  10 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 40ms · p99 < 120ms
Breaking:    no

---

### DELETE /api/v1/teams/:id
Auth:        bearer · role: admin
Request:     none
Response 204: no body
Errors:      401 | 403 | 404
Side effects:
  - Soft-deletes team (no hard delete — historical billing record must remain)
  - Cancels associated team subscription via Stripe
Rate limit:  3 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 100ms · p99 < 300ms (Stripe API call included)
Breaking:    no

---

### GET /api/v1/teams/:id/members
Auth:        bearer · must be a member
Request:     ?limit=20&cursor=
Response 200: paginated list
  {
    "data": [
      {
        "user_id":      uuid,
        "email":        string,
        "display_name": string | null,
        "role":         "admin" | "member" | "viewer",
        "joined_at":    timestamp
      }
    ],
    "next_cursor": string | null,
    "has_more":    boolean
  }
Errors:      401 | 404
Rate limit:  30 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 100ms
Breaking:    no

---

### POST /api/v1/teams/:id/members/invite
Auth:        bearer · role: admin
Request:
  {
    "email": string,
    "role":  "member" | "viewer"
  }
Response 201:
  {
    "invite_id":  uuid,
    "email":      string,
    "expires_at": timestamp (24 hours from now)
  }
Errors:
  400 VALIDATION_FAILED
  402 PAYMENT_REQUIRED — team member count at tier limit
  403 FORBIDDEN — not admin
  404 NOT_FOUND — team not found
  409 CONFLICT — user already a member
Side effects: queues email job (BullMQ) with invite link
Rate limit:  10 req/min per user
Idempotent:  no
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 60ms · p99 < 200ms
Breaking:    no

---

### DELETE /api/v1/teams/:id/members/:userId
Auth:        bearer · role: admin (or self-removal for non-admin)
Request:     none
Response 204: no body
Errors:
  403 FORBIDDEN — trying to remove another admin without being admin
  403 FORBIDDEN — trying to remove the last admin
  404 NOT_FOUND
Rate limit:  10 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 80ms
Breaking:    no

---

### PUT /api/v1/teams/:id/members/:userId/role
Auth:        bearer · role: admin
Request:
  { "role": "member" | "viewer" }
Response 200:
  { "user_id": uuid, "role": string, "updated_at": timestamp }
Errors:
  400 VALIDATION_FAILED
  403 FORBIDDEN — cannot demote the last admin
  404 NOT_FOUND
Rate limit:  10 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 80ms
Breaking:    no

================================================================================
## BILLING
================================================================================

### GET /api/v1/billing/subscription
Auth:        bearer
Request:     none
Response 200:
  {
    "tier":                  "free" | "pro" | "team" | "enterprise",
    "status":                "active" | "trialing" | "past_due" | "cancelled",
    "current_period_start":  timestamp,
    "current_period_end":    timestamp,
    "trial_ends_at":         timestamp | null,
    "cancelled_at":          timestamp | null,
    "deep_analysis_used":    number,
    "deep_analysis_limit":   number
  }
Errors:      401 UNAUTHORIZED
Rate limit:  60 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 30ms · p99 < 80ms (Redis cache for usage_meters — 60s TTL)
Breaking:    no

---

### POST /api/v1/billing/subscription/upgrade
Auth:        bearer
Request:
  {
    "tier":          "pro" | "team" | "enterprise",
    "billing_cycle": "monthly" | "annual"
  }
Response 200:
  {
    "checkout_url": string (Stripe Checkout session URL — redirect user here)
  }
Errors:
  400 VALIDATION_FAILED
  400 INVALID_UPGRADE — already on tier or higher
  402 PAYMENT_REQUIRED — Stripe setup required
Side effects:
  - Creates Stripe Checkout session
  - Stripe webhook (POST /billing/webhooks/stripe) handles actual upgrade on success
Rate limit:  5 req/min per user
Idempotent:  no
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 500ms · p99 < 1500ms (Stripe API call)
Breaking:    no

---

### POST /api/v1/billing/subscription/cancel
Auth:        bearer
Request:
  { "reason": string (optional, max 500 chars — for churn analytics) }
Response 200:
  { "cancelled_at": timestamp, "access_until": timestamp (end of current period) }
Errors:      401 | 400 (already cancelled)
Side effects:
  - Calls Stripe API to schedule cancellation at period end
  - Sets billing.subscriptions.cancelled_at
Rate limit:  3 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 500ms · p99 < 1500ms
Breaking:    no

---

### GET /api/v1/billing/usage
Auth:        bearer
Request:     ?period=current (default) | ?period=YYYY-MM
Response 200:
  {
    "period_start": date,
    "period_end":   date,
    "deep_analysis_count":   number,
    "deep_analysis_limit":   number,
    "deep_analysis_remaining": number
  }
Rate limit:  60 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 20ms · p99 < 60ms (Redis counter)
Breaking:    no

---

### GET /api/v1/billing/invoices
Auth:        bearer
Request:     ?limit=20&cursor=
Response 200: paginated
  {
    "data": [
      {
        "id":            uuid,
        "amount_cents":  number,
        "currency":      string,
        "status":        string,
        "created_at":    timestamp,
        "paid_at":       timestamp | null,
        "invoice_url":   string | null (Stripe hosted invoice URL)
      }
    ],
    "next_cursor": string | null,
    "has_more": boolean
  }
Rate limit:  20 req/min per user
Idempotent:  yes
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 50ms · p99 < 150ms
Breaking:    no

---

### POST /api/v1/billing/portal
Auth:        bearer
Request:     none
Response 200:
  { "portal_url": string (Stripe Customer Portal session URL — expires in 5 min) }
Errors:      401 | 402 PAYMENT_REQUIRED (no Stripe customer yet — free tier with no card)
Side effects: creates Stripe Customer Portal session
Rate limit:  5 req/min per user
Idempotent:  no
AI usage:    no
SLO tier:    STANDARD
Perf target: p50 < 500ms · p99 < 1500ms (Stripe API)
Breaking:    no

---

### POST /api/v1/billing/webhooks/stripe
Auth:        none (Stripe-signed) — verified via Stripe-Signature header + STRIPE_WEBHOOK_SECRET
Request:     Stripe webhook event payload (raw body required for signature verification)
Response 200: { "received": true }
Response 400: if signature verification fails
Events handled:
  - checkout.session.completed    → activate/upgrade subscription
  - customer.subscription.updated → sync tier + status
  - customer.subscription.deleted → cancel subscription
  - invoice.payment_succeeded     → record invoice + send receipt email
  - invoice.payment_failed        → trigger dunning flow + send warning email
Note:        This endpoint MUST use rawBody plugin — Fastify default parses JSON; Stripe
             requires the raw buffer for signature verification.
Rate limit:  none (Stripe IPs only — allowlist via Fastify plugin)
Idempotent:  yes (Stripe guarantees at-least-once delivery — handlers must be idempotent)
AI usage:    no
SLO tier:    CRITICAL (missed webhook = billing state corruption)
Perf target: p50 < 100ms · p99 < 300ms (must respond < 5s or Stripe retries)
Breaking:    no

================================================================================
## TELEMETRY
================================================================================

### POST /api/v1/telemetry/events
Auth:        X-Api-Key header (scope: telemetry:write) OR anonymous with X-Install-Id header
             Anonymous installs (no API key) are accepted — install_id provides attribution
Request:
  {
    "install_id":     string (UUID — identifies the anonymous CLI install),
    "client_version": string (semver, max 20 chars),
    "events": [
      {
        "event_name":  string (max 100 chars — must match ANALYTICS-SCHEMA.md registry),
        "properties":  object (max 4KB serialized — unknown keys silently dropped),
        "timestamp":   string (ISO 8601)
      }
    ]
  }
Constraints:
  - Max 50 events per batch
  - Max payload: 256KB
  - events array must not be empty
Response 202: accepted (async — not yet written to ClickHouse)
  { "accepted": number (count of accepted events), "rejected": number }
  Note: events with unknown event_name are silently rejected (counted in "rejected")
Errors:
  400 VALIDATION_FAILED — payload > 256KB, or events > 50, or empty events array
  429 RATE_LIMITED
Rate limit:  100 req/min per install_id · 500 req/min per API key (batch of 50 = one request)
Idempotent:  yes (safe to retry — ClickHouse deduplication on (install_id, event_name, timestamp))
AI usage:    no
SLO tier:    BACKGROUND (failures silently dropped client-side — never surfaces to CLI user)
Perf target: p50 < 50ms · p99 < 200ms (Redis queue write, not ClickHouse write)
Breaking:    adding new accepted event_names = non-breaking. Removing = breaking (reject silently until client updates)
Side effects: enqueues to BullMQ telemetry-flush queue. Worker batch-writes to ClickHouse every 60s.

================================================================================
## RATE LIMIT SUMMARY TABLE
================================================================================

| Endpoint group | Per-IP | Per-user | Per-install_id |
|---|---|---|---|
| POST /auth/register | 5/min | — | — |
| POST /auth/login | 10/min | 5/min (per email) | — |
| POST /auth/refresh | 30/min | — | — |
| POST /auth/password/reset-request | 10/hr | 3/hr (per email) | — |
| GET /auth/me | — | 60/min | — |
| POST /api-keys | — | 5/min | — |
| GET /api-keys | — | 30/min | — |
| GET /teams/* | — | 60/min | — |
| POST /teams | — | 5/min | — |
| POST /teams/*/members/invite | — | 10/min | — |
| POST /billing/subscription/upgrade | — | 5/min | — |
| POST /billing/portal | — | 5/min | — |
| POST /billing/webhooks/stripe | Stripe IPs only | — | — |
| POST /telemetry/events | — | — | 100/min |
| GET /health | 200/min | — | — |

Rate limit responses always include:
  X-RateLimit-Limit: <limit>
  X-RateLimit-Remaining: <remaining>
  X-RateLimit-Reset: <unix_timestamp>
  Retry-After: <seconds> (on 429 only)

================================================================================
## RESPONSE HEADERS (all endpoints)
================================================================================

  X-Request-Id:      uuid (generated per request — logged for tracing)
  X-Version:         "1.0.0" (API version)
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'none' (API responses — no HTML served)

================================================================================
## ENDPOINT COUNT SUMMARY
================================================================================

  Health:    1
  Auth:      8  (register, login, logout, refresh, me GET, me PUT, password reset x2, oauth)
  API Keys:  3  (list, create, revoke)
  Teams:     7  (create, get, update, delete, list members, invite, remove member, change role)
  Billing:   6  (subscription GET, upgrade, cancel, usage, invoices, portal, stripe webhook)
  Telemetry: 1
  Total:     26 endpoints

================================================================================
## IMPLEMENTATION NOTES FOR BUILDER
================================================================================

1. Every route MUST have a Zod schema for request validation. No manual if-checks.
2. Access token validated by fastify-jwt plugin — not manually in route handlers.
3. API key validated by a custom Fastify preHandler — checks bcrypt(key, hash) with 12 rounds.
4. Stripe webhook route must use Fastify rawBody plugin — default JSON parse breaks sig verify.
5. Telemetry endpoint must never throw on bad event_name — silently reject + count.
6. All list endpoints use cursor-based pagination — never OFFSET.
7. Redis-backed rate limiting via @fastify/rate-limit — keys defined in lib/rate-limit.ts.
8. Error handler plugin (lib/errors.ts) converts all Zod/Fastify errors to standard envelope.
9. Health endpoint must NOT query PostgreSQL (only check connection pool state in Redis).
10. GDPR: POST /auth/me DELETE not yet in this contract — add at COMPLIANCE-LEGAL gate.

================================================================================
# END OF API-DESIGN.md
# Gate: API-DESIGN complete.
# Next gate: SECURITY (SENTINEL) → THREAT-MODEL.md
================================================================================
