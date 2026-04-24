# OBSERVABILITY.md — CodeMind Observability Design
# Mode: OBSERVABILITY | Agent: TITAN
# Rule: BUILDER cannot start a feature without its observability spec defined here.
# Input: SLO.md + API-DESIGN.md + INFRASTRUCTURE.md
# Last updated: 2026-04-23
# Stack: Sentry (errors + traces) · CloudWatch (infra metrics) · Pino (structured logs) · Grafana (dashboards)
================================================================================

## Observability Principles

1. Every feature defines its observability before BUILDER writes a line of code.
2. Structured logs only. No `console.log`. Every log line has: requestId, userId (if authenticated), level, message, context fields.
3. PII never in logs. Emails, names, API keys, IP addresses: redact or omit.
4. Latency measured at every layer: route → service → repository → external call.
5. Business metrics alongside technical metrics. A slow query is a technical metric. A failed subscription upgrade is a business metric. Both page.
6. The on-call dashboard must answer "what is broken?" in < 30 seconds. Design dashboards for that question, not for completeness.

================================================================================
## Logging Infrastructure
================================================================================

### Logger Setup

```typescript
// packages/server/src/lib/logger.ts — shared logger, imported everywhere
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['*.password', '*.password_hash', '*.key', '*.token', '*.secret',
            '*.authorization', '*.email', '*.ip'],
    censor: '[REDACTED]'
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
})
```

Every log line must include:
```typescript
{
  level:     'info' | 'warn' | 'error',
  requestId: string,       // X-Request-Id header (generated per request)
  userId:    string | null,// from JWT claims — null for unauthenticated
  timestamp: string,       // ISO 8601
  msg:       string,
  // + feature-specific context fields (defined per feature below)
}
```

Log levels:
  ERROR: unhandled exceptions, failed critical operations (stripe webhook fail, DB error)
  WARN:  recoverable errors, rate limit hits, security events (injection attempts)
  INFO:  all auth events, subscription changes, key creation/revocation
  DEBUG: AI calls (model + token counts), SQL queries (dev only — never production)

### Log Shipping
  Production: Pino → CloudWatch Logs (via pino-cloudwatch transport)
  Retention:  90 days hot, 1 year cold (CloudWatch log archival to S3)
  Alerting:   CloudWatch Metric Filters → CloudWatch Alarms → SNS → PagerDuty

================================================================================
## Feature Observability Specs
================================================================================

### Feature: Authentication (register / login / refresh / OAuth)
```
Trace:    auth.register / auth.login / auth.refresh / auth.oauth
          → child spans: db.users.findByEmail, bcrypt.compare, redis.setRefreshToken
          Attributes: endpoint, auth_method (password|oauth|api_key), provider (if oauth)

Metrics:
  Business:  auth_logins_total{status: success|failure, method: password|oauth} — Counter
             Alert: failure rate > 10% in 5 min → WARN to #ops-alerts
  Technical: auth_latency_ms{endpoint, p50, p99} — Histogram
             Alert: p99 > 700ms for /auth/login → SLO-C01 breach
  Security:  auth_lockouts_total — Counter (account lockout events)
             Alert: > 100 lockouts in 1 hour → possible credential stuffing → page

Log events:
  INFO:  user_registered { userId, method }
  INFO:  user_logged_in { userId, method, ip_hash }     ← ip_hash, never raw IP
  INFO:  user_logged_out { userId }
  INFO:  password_reset_requested { email_hash }         ← email_hash, never raw email
  INFO:  password_reset_completed { userId }
  WARN:  login_failed { email_hash, attempt_count }
  WARN:  account_locked { email_hash, locked_until }
  WARN:  suspicious_token { reason: 'alg_none'|'invalid_sig'|'expired' }

Dashboard (on-call first look):
  - Login success rate (last 1h) — target > 90% of attempts
  - Auth p99 latency (last 1h) — target < 600ms
  - Account lockouts (last 1h) — spike = credential stuffing
  - Token errors by type (last 1h) — alg_none spike = attack
```

---

### Feature: API Key Management
```
Trace:    api_key.create / api_key.validate / api_key.revoke
          → child spans: bcrypt.hash (create), bcrypt.compare (validate), db.api_keys.*
          Attributes: key_id (UUID), scope

Metrics:
  Business:  api_keys_created_total — Counter
             api_keys_revoked_total — Counter
  Technical: api_key_validation_latency_ms — Histogram (bcrypt.compare dominates)
             Alert: p99 > 300ms → bcrypt work factor may need tuning
  Security:  api_key_scope_violations_total — Counter (scope bypass attempts)
             Alert: > 5 in 1 hour → potential API abuse → page

Log events:
  INFO:  api_key_created { keyId, userId, scopes }
  INFO:  api_key_revoked { keyId, userId }
  INFO:  api_key_used { keyId, endpoint, scopes }    ← on each successful API-key-auth request
  WARN:  api_key_scope_violation { keyId, required_scope, actual_scopes, endpoint }
```

---

### Feature: Team Management
```
Trace:    teams.create / teams.member_invite / teams.member_remove / teams.role_change
          → child spans: db.teams.*, db.team_members.*, email.queue (for invite)
          Attributes: team_id, actor_user_id, target_user_id (for member ops)

Metrics:
  Business:  teams_created_total — Counter
             team_invites_sent_total — Counter
             team_invites_accepted_total — Counter
             invite_acceptance_rate — Gauge (accepted / sent, 7-day rolling)
             Alert: acceptance_rate < 30% → invite email deliverability issue
  Technical: team_query_latency_ms — Histogram
             Alert: p99 > 300ms → possible missing index on team_members

Log events:
  INFO:  team_created { teamId, creatorUserId }
  INFO:  member_invited { teamId, inviterUserId, inviteeEmail_hash }
  INFO:  member_joined { teamId, userId, role }
  INFO:  member_removed { teamId, actorUserId, targetUserId }
  INFO:  role_changed { teamId, actorUserId, targetUserId, oldRole, newRole }
  WARN:  last_admin_removal_blocked { teamId, userId }
  WARN:  cross_tenant_access_attempt { actorUserId, targetTeamId }  ← security event
```

---

### Feature: Billing + Subscriptions
```
Trace:    billing.upgrade / billing.cancel / billing.webhook_process
          → child spans: stripe.checkout.create, stripe.webhook.verify,
                         db.subscriptions.update, redis.usage_reset, email.queue
          Attributes: subscription_id, tier, stripe_event_id (for webhook)

Metrics:
  Business:  subscriptions_created_total{tier} — Counter
             subscriptions_upgraded_total{from_tier, to_tier} — Counter
             subscriptions_cancelled_total{tier} — Counter (churn signal)
             mrr_events_total{type: new|expansion|contraction|churn} — Counter (feed MRR calc)
             Alert: churn rate > 5% in a week → business alert to founders
  Technical: stripe_webhook_processing_ms — Histogram
             Alert: p99 > 4000ms → risk of Stripe timeout (5s limit)
             stripe_webhook_failures_total — Counter
             Alert: > 2 failures in 1h → billing state corruption risk → page
  Cost:      usage_deep_analysis_total{tier} — Counter (track AI usage per tier for pricing)
             Alert: usage nearing limit → automatic email to user (via billing service)

Log events:
  INFO:  subscription_created { subscriptionId, userId, tier, trialEndsAt }
  INFO:  subscription_upgraded { subscriptionId, fromTier, toTier }
  INFO:  subscription_cancelled { subscriptionId, tier, reason }
  INFO:  webhook_received { stripeEventId, eventType }
  INFO:  webhook_processed { stripeEventId, eventType, duration_ms }
  WARN:  webhook_signature_invalid { endpoint: '/billing/webhooks/stripe' }
  ERROR: webhook_processing_failed { stripeEventId, error, attempt }
```

---

### Feature: Telemetry Ingest (POST /telemetry/events)
```
Trace:    telemetry.ingest / telemetry.flush_to_clickhouse
          → child spans: redis.enqueue, bullmq.job_add, clickhouse.batch_insert
          Attributes: event_count, install_id_hash (not raw), rejected_count

Metrics:
  Technical: telemetry_events_received_total — Counter
             telemetry_events_rejected_total{reason: unknown_name|pii_detected} — Counter
             telemetry_flush_duration_ms — Histogram (ClickHouse batch write time)
             telemetry_queue_depth — Gauge (BullMQ queue length)
             Alert: queue depth > 5000 → ClickHouse ingestion falling behind → investigate
  Cost:      clickhouse_rows_inserted_total — Counter (ClickHouse storage cost tracking)

Log events:
  DEBUG: telemetry_batch_received { eventCount, installId_hash }
  INFO:  telemetry_flushed { eventCount, duration_ms }
  WARN:  telemetry_event_rejected { reason, event_name }
  ERROR: clickhouse_insert_failed { attempt, error }
```

---

### Feature: CLI check (local — measured via telemetry)
```
Client-side telemetry events (from ANALYTICS-SCHEMA.md):
  K-03 check_fast_completed: { risk_level, direct_dependents, duration_ms, triggered_by }
  K-04 check_deep_completed: { base_risk_level, opus_tokens_used, opus_latency_ms }

Server-side dashboard queries (ClickHouse):
  SELECT
    quantile(0.50)(duration_ms) AS p50,
    quantile(0.99)(duration_ms) AS p99,
    count() AS total_checks,
    countIf(risk_level = 'HIGH' OR risk_level = 'CRITICAL') / count() AS high_risk_rate
  FROM telemetry.events
  WHERE event_name = 'check_fast_completed'
    AND timestamp > now() - INTERVAL 7 DAY

Alert (via scheduled query):
  p99 > 2500ms for > 5% of check_fast_completed events → performance regression alert
  high_risk_rate > 50% (not an alert — just a product health signal)
```

---

### Feature: CLI see / drift (local — measured via telemetry)
```
Client-side telemetry:
  K-05 see_completed: { accuracy_pct, phantom_count, missing_count, duration_ms, extraction_retries }
  D-02 extraction_failed: { retry_count, error_type }

Server alerts (ClickHouse):
  extraction_failed rate > 10% of see_completed → Anthropic vision API issue or prompt regression
  accuracy_pct median < 40% → entity resolution quality degraded → review prompt
```

---

### Feature: CLI trace / forensics (local — measured via telemetry)
```
Client-side telemetry:
  K-06 trace_completed: { origin_classification, code_trace_ran, commits_ranked, duration_ms }

Server alerts:
  origin_classification = 'UNKNOWN' > 20% of traces → triage prompt quality issue
```

---

### Feature: GDPR Purge (BullMQ background job — special treatment)
```
Trace:    gdpr.purge_job
          → child spans: db.users.hard_delete, db.api_keys.purge, db.team_members.purge,
                         redis.purge_user_keys, billing.purge_non_invoice_records
          Attributes: userId (logged until purge completes — then this log itself is purged)

Metrics:
  Compliance: gdpr_purges_completed_total — Counter
              gdpr_purges_failed_total — Counter
              Alert: ANY failure → P0 page immediately (legal obligation)
              gdpr_purge_duration_days — Histogram (must be < 30 days — INV-008)
              Alert: any purge taking > 25 days → SLA breach warning

Log events:
  INFO:  gdpr_purge_started { jobId, scheduledAt, triggeredByUserId }
  INFO:  gdpr_purge_completed { jobId, duration_ms, rows_deleted }
  ERROR: gdpr_purge_failed { jobId, attempt, error }  ← P0 alert trigger
```

================================================================================
## On-Call Dashboard Layout
================================================================================

Primary dashboard ("Is CodeMind healthy?"): — opens in < 5 seconds on incident

  Row 1 — Service health:
    [ API availability % (last 1h) ]  [ Error rate % (last 1h) ]  [ Active incidents ]

  Row 2 — CRITICAL SLOs:
    [ Auth p99 latency ]  [ Auth error rate ]  [ Stripe webhook queue ]

  Row 3 — Business health:
    [ Logins / hour ]  [ New signups / hour ]  [ Subscription upgrades today ]

  Row 4 — Infrastructure:
    [ DB connection pool ]  [ Redis hit rate ]  [ ClickHouse queue depth ]

Secondary dashboard ("What broke during the incident?"):
  Row 1 — Error details: Sentry issues by frequency, last 1h
  Row 2 — DB: slow query log (> 100ms), connection count, replication lag
  Row 3 — Redis: key hits/misses, memory usage, command latency
  Row 4 — BullMQ: queue depths (all queues), failed jobs, processing rate

================================================================================
## Alerting Routing
================================================================================

| Alert | Severity | Channel | Response |
|---|---|---|---|
| SLO breach (CRITICAL tier) | P0 | PagerDuty → on-call | Immediate |
| Stripe webhook failure | P0 | PagerDuty | Immediate |
| GDPR purge failure | P0 | PagerDuty + email to legal | Immediate |
| SLO breach (STANDARD tier) | P1 | Slack #ops-alerts | Business hours |
| Error budget > 50% | P1 | Slack #ops-alerts | Next sprint |
| Credential stuffing detected | P1 | Slack #security-alerts | 1 hour |
| Redis unavailable | P1 | Slack #ops-alerts | 30 min |
| CLI p99 regression | P2 | Slack #eng | Next sprint |
| Telemetry queue depth | P2 | Slack #eng | Same day |
| Churn rate spike | P2 | Slack #product | Async |

================================================================================
# END OF OBSERVABILITY.md
# Gate: OBSERVABILITY complete.
# Next gate: BUSINESS-METRICS (ANALYST) → BUSINESS-METRICS.md
================================================================================
