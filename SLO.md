# SLO.md — CodeMind Service Level Objectives
# Mode: SLO-DESIGN | Agent: TITAN
# Input: API-DESIGN.md (SLO tiers per endpoint) + INFRASTRUCTURE.md
# Last updated: 2026-04-23
# Rule: every endpoint in API-DESIGN.md has an SLO tier assigned below.
# Error budgets reviewed monthly. Alerts defined here are the source of truth for OBSERVABILITY.md.
================================================================================

## SLO Tier Definitions

| Tier | Availability | Latency p99 | Error budget (28 days) | On-call |
|---|---|---|---|---|
| **CRITICAL** | 99.9% | per-endpoint | 40.3 min/month | Immediate page |
| **STANDARD** | 99.5% | per-endpoint | 3.4 hrs/month | Business hours |
| **BACKGROUND** | 99.0% | best effort | 6.7 hrs/month | Next business day |

Error budget burn rate alert: page when 2% of monthly budget consumed in 1 hour (fast burn).
Error budget warning: notify when 10% consumed in 6 hours (slow burn).

================================================================================
## CRITICAL Tier SLOs (page immediately on breach)
================================================================================

### SLO-C01: Authentication — POST /auth/login, /auth/register, /auth/refresh
  Availability:    99.9% (< 40.3 min downtime/month)
  Latency p50:     < 150ms
  Latency p99:     < 600ms (bcrypt-dominated — cannot be faster without reducing security)
  Error rate:      < 0.1% 5xx responses per minute
  Error budget:    40.3 minutes/month
  Measurement:     Synthetic probe: POST /auth/login with test credentials every 60s
  Alert (fast burn): > 2% budget in 1h → page on-call immediately
  Alert (slow burn): > 5% budget in 6h → Slack #ops-alerts
  Runbook:         runbooks/auth-service.md

### SLO-C02: GET /auth/me (called on every app load)
  Availability:    99.9%
  Latency p50:     < 30ms
  Latency p99:     < 100ms (Redis cache hit for subscription; no DB call on warm cache)
  Error rate:      < 0.1% 5xx per minute
  Runbook:         runbooks/auth-service.md

### SLO-C03: GET /health (liveness — external monitors poll this)
  Availability:    99.9%
  Latency p50:     < 10ms
  Latency p99:     < 50ms (in-memory check only — no DB query)
  Runbook:         runbooks/api-server.md

### SLO-C04: Stripe Webhook Processing — POST /billing/webhooks/stripe
  Availability:    99.9%
  Processing SLA:  < 300ms p99 (Stripe retries if no 200 within 5s)
  Idempotency:     100% — duplicate event IDs must not double-charge or double-upgrade
  Error rate:      < 0.1% processing failures
  Runbook:         runbooks/billing-service.md

### SLO-C05: CLI check (fast tier — local, not cloud)
  Note: this is a CLIENT-SIDE SLO (measured by telemetry, not server probe)
  Latency p50:     < 1.0s on 50K-node graph
  Latency p99:     < 2.0s on 50K-node graph
  Accuracy:        graph completeness metric must reflect actual call site resolution rate
  Alert:           if telemetry shows p99 > 2.5s for > 5% of installs → investigate
  Runbook:         runbooks/cli-performance.md

================================================================================
## STANDARD Tier SLOs (business hours response)
================================================================================

### SLO-S01: Team Management endpoints
  Availability:    99.5%
  Latency p99:     < 200ms (simple DB reads with team_id filter)
  Error rate:      < 0.5% 5xx per 5 minutes

### SLO-S02: Billing read endpoints (GET /billing/subscription, /billing/usage, /billing/invoices)
  Availability:    99.5%
  Latency p99:     < 150ms (Redis cache for subscription + usage; DB for invoices)
  Error rate:      < 0.5% 5xx per 5 minutes

### SLO-S03: Billing write endpoints (upgrade, cancel, portal)
  Availability:    99.5%
  Latency p99:     < 1500ms (Stripe API call included)
  Error rate:      < 1% 5xx per 5 minutes (Stripe dependency degrades gracefully)
  Degraded mode:   if Stripe unreachable, queue upgrade for retry + notify user

### SLO-S04: API Key management (GET, POST, DELETE /api-keys)
  Availability:    99.5%
  Latency p99:     < 200ms
  Error rate:      < 0.5% 5xx per 5 minutes

### SLO-S05: CLI index (local, client-side SLO via telemetry)
  Latency p50:     < 20s for 50K-node repo
  Latency p99:     < 45s for 50K-node repo
  Alert:           p99 > 60s for > 5% of index_completed events → performance regression

### SLO-S06: CLI see (local, depends on Anthropic API)
  Vision extraction: < 20s p99 (Anthropic-dependent)
  Comparison:        < 5s p99 (deterministic — local)
  Alert:             > 30s for > 10% of see_completed events → Anthropic latency degradation

### SLO-S07: CLI trace (local, partially Anthropic-dependent)
  Deterministic ranking:  < 5s p99
  Full with narrative:    < 25s p99 (Anthropic-dependent)
  Alert:                  > 40s for > 10% of trace_completed events

================================================================================
## BACKGROUND Tier SLOs (next business day)
================================================================================

### SLO-B01: POST /telemetry/events (batch ingest)
  Availability:    99.0%
  Latency p99:     < 200ms (Redis enqueue — ClickHouse write is async)
  Data freshness:  events appear in ClickHouse within 5 minutes (BullMQ 60s flush)
  Loss tolerance:  < 0.1% event loss (fire-and-forget; individual event loss acceptable)
  Note:            CLI silently drops telemetry failures — never surfaces to user

### SLO-B02: Email delivery (BullMQ email queue)
  Delivery SLA:    < 5 minutes for transactional emails (invite, receipt, password reset)
  Delivery rate:   > 99% of queued jobs delivered within 1 hour
  Note:            Resend handles deliverability (bounces, spam). BullMQ SLO is enqueue-to-send.

### SLO-B03: GDPR purge (BullMQ gdpr-purge queue — delayed 30 days)
  Completion SLA:  100% within 30 days of AccountDeleted event (legal requirement INV-008)
  Failure mode:    P0 incident — page legal counsel immediately (not a background issue)
  Alert:           Any gdpr-purge job in failed state → immediate alert regardless of time

================================================================================
## Error Budget Tracking
================================================================================

Measurement window: rolling 28 days.
Measurement tool:  AWS CloudWatch (availability) + Sentry (error rate) + Grafana (latency).
Review cadence:    Monthly sync with team. Postmortem required if > 50% budget consumed.

### Budget consumption thresholds and actions:

| % Budget consumed | Action |
|---|---|
| 0–25% | Normal operations. Ship freely. |
| 25–50% | Reliability review in next sprint planning. Identify top error causes. |
| 50–75% | Freeze non-critical feature work. Focus next sprint on reliability. |
| 75–99% | DOCTOR incident review. Weekly reliability sync. Hotfix only deployments. |
| 100% | SLO breach. Postmortem within 48 hours. STEWARD escalation. |

================================================================================
## Dependency SLOs (third-party services we depend on)
================================================================================

| Dependency | Their SLO | Our mitigation if they breach |
|---|---|---|
| Anthropic API | 99.9% (estimated) | Offline path — CLI works fully without Opus |
| AWS RDS | 99.95% | Multi-AZ automatic failover (~30s RTO) |
| AWS ElastiCache | 99.9% | Redis failure: degrade to no-cache reads from DB |
| Stripe | 99.99% | Queue upgrade for retry; read-only billing data from local DB cache |
| ClickHouse Cloud | 99.9% | Telemetry events buffered in BullMQ; replay when available |
| Resend | 99.5% | Email queued in BullMQ; retry up to 3x |

Degraded mode policy:
  Redis unavailable: API continues but without rate limiting. Log event. Alert ops.
                     Security implication: rate limits disabled — ops must patch within 30min.
  DB unavailable:    API returns 503 for all endpoints needing DB. Health check shows degraded.
  ClickHouse unavailable: Telemetry queue builds up in BullMQ (max 10K jobs). Events replayed on recovery.

================================================================================
## Dashboard Definitions (feeds OBSERVABILITY.md)
================================================================================

On-call engineer opens these first when paged:

**CRITICAL tier breach:**
  1. API availability graph (last 24h) — CloudWatch ALB metrics
  2. Error rate per endpoint (last 1h) — Sentry issues grouped by route
  3. DB connection count (last 1h) — CloudWatch RDS metrics
  4. Redis hit rate (last 1h) — ElastiCache metrics

**Latency breach:**
  1. p50/p95/p99 latency per endpoint (last 1h) — CloudWatch X-Ray or Fastify metrics
  2. DB query p99 (last 1h) — Prisma slow query log
  3. Redis command latency (last 1h)

**Billing incident:**
  1. Stripe webhook processing rate (last 1h) — custom Sentry breadcrumb
  2. Failed subscription upgrades (last 1h) — Sentry + BullMQ dashboard
  3. Usage meter counts vs limits — ClickHouse query

================================================================================
# END OF SLO.md
# Gate: SLO-DESIGN complete.
# Next gate: OBSERVABILITY (TITAN) → OBSERVABILITY.md
================================================================================
