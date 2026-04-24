# runbooks/billing-service.md — Billing + Stripe Webhook Runbook
# SLO coverage: SLO-C04 (Stripe webhook) · SLO-S02/S03 (billing reads/writes)
# Agent: DOCTOR | Last updated: 2026-04-23
# On-call trigger: stripe_webhook_failures_total > 2 in 1h · webhook p99 > 4000ms
================================================================================

## Symptoms

Dashboard signals (Grafana Row 2 "Stripe webhook queue"):
  - stripe_webhook_failures_total counter incrementing
  - stripe_webhook_processing_ms p99 > 4000ms (Stripe retries after 5s)
  - BullMQ email queue depth growing (subscription changes queued but not processed)
  - mrr_events_total counters not incrementing after known Stripe events

User-reported:
  - "I upgraded but my plan hasn't changed"
  - "I cancelled but I'm still being charged"
  - "My invoice doesn't appear in the dashboard"

PagerDuty alerts:
  - stripe_webhook_failures_total > 2 in 1h → P0
  - stripe_webhook_processing_ms p99 > 4000ms → P0 (SLO-C04)

Stripe Dashboard (https://dashboard.stripe.com → Developers → Webhooks):
  - Failed deliveries visible in Stripe's own UI — cross-reference with our logs

================================================================================
## Severity Assessment

P0: ANY webhook failure → subscription state may be corrupted → page immediately.
    Stripe retries for 72 hours — window exists, but billing integrity is at risk.

P1: Webhook processing > 4000ms (timeout risk) but not yet failing.
    → Investigate immediately. One more slow processing = Stripe marks failed.

P2: Billing READ endpoint degraded (GET /billing/subscription slow) but webhooks healthy.
    → Investigate in business hours. No immediate financial integrity risk.

================================================================================
## Immediate Mitigation

Step 1 — Check Stripe webhook logs:
  Stripe Dashboard → Developers → Webhooks → [endpoint] → Recent deliveries
  Note: failed event IDs. These are the events we must process.

Step 2 — Check our webhook processing logs:
  CloudWatch Logs → /codemind/prod/api → filter: `stripeEventId`
  Look for: `webhook_signature_invalid` or `webhook_processing_failed` log events

Step 3 — Is this a signature verification failure?
  Cause: STRIPE_WEBHOOK_SECRET env var mismatch, or raw body not being passed correctly.
  Test: check env var in ECS task definition matches Stripe Dashboard webhook signing secret.
  Code: billing route must use `fastify-raw-body` plugin → `request.rawBody` for Stripe.verify().

Step 4 — Is this a processing timeout (> 4000ms)?
  Cause: slow DB write, Redis unavailable, downstream email queue backed up.
  Mitigation: return 200 to Stripe immediately, process asynchronously via BullMQ.
  Check: does billing webhook handler return 200 before processing? (It should by design.)

Step 5 — Manual event replay (if events failed but system is now healthy):
  Use Stripe Dashboard → failed event → "Resend" to replay missed webhooks.
  WARNING: Verify idempotency — our `stripeEventId` deduplication must handle replays.

================================================================================
## Root Cause Investigation

1. **Signature verification failure** (most common with env var changes)
   - Log pattern: `webhook_signature_invalid`
   - Check: STRIPE_WEBHOOK_SECRET in ECS task definition vs Stripe Dashboard
   - Fix: update env var, redeploy. Replay failed events via Stripe Dashboard.

2. **Raw body parsing failure** (fastify plugin misconfiguration)
   - Stripe requires the raw Buffer, not the parsed JSON body
   - Check: fastify-raw-body plugin registered on the webhook route
   - Log pattern: error in signature verification despite correct secret
   - Fix: ensure `addContentTypeParser` with `parseAs: 'buffer'` is on the webhook route

3. **Idempotency failure (double processing)**
   - Symptom: user double-charged or double-upgraded
   - Check: search logs for same `stripeEventId` processed twice
   - Fix: idempotency key check must be the FIRST step in webhook handler (before any DB write)
   - Immediate: manually reverse the duplicate action via Stripe + DB

4. **Slow DB write → Stripe timeout**
   - Check: RDS slow query log for UPDATE subscriptions queries
   - Fix: ensure subscription update is a single indexed query by subscriptionId

5. **BullMQ email queue backup blocking webhook response**
   - Check: BullMQ email queue depth (Grafana Row 4)
   - Fix: email dispatch must be fire-and-forget — do not await email in webhook handler

================================================================================
## State Reconciliation (when webhooks were missed)

If webhook failures caused subscription state corruption:
  1. Pull Stripe subscription state via API:
     ```
     curl https://api.stripe.com/v1/subscriptions/{subscription_id} \
       -u $STRIPE_SECRET_KEY:
     ```
  2. Compare to local DB `billing.subscriptions` table.
  3. Manually correct via admin script (requires SENTINEL review on any DB write):
     ```
     # packages/server/scripts/reconcile-subscription.ts
     # Usage: npx ts-node scripts/reconcile-subscription.ts --userId [id] --stripeSubId [id]
     ```
  4. Log the reconciliation in CONTEXT.md under DECISIONS THIS SESSION.
  5. Affected users: proactive email acknowledging the issue (STEWARD approves copy).

================================================================================
## Recovery Steps

1. Fix root cause (env var, code deploy, or manual replay).
2. Verify Stripe webhook endpoint shows 200 for recent test events:
   Stripe Dashboard → send test webhook → confirm `webhook_processed` log event
3. Monitor: stripe_webhook_failures_total counter must not increment.
4. Check subscription state for any affected users (compare Stripe vs DB).
5. Clear BullMQ failed jobs if they are safe to re-enqueue:
   ```
   # BullMQ Bull Board (admin UI) or via code:
   # queue.getFailedCount() → review → queue.retryJobs()
   ```

================================================================================
## Verification

[ ] stripe_webhook_processing_ms p99 < 300ms
[ ] stripe_webhook_failures_total not incrementing
[ ] Stripe Dashboard: no recent failed deliveries (last 1 hour)
[ ] mrr_events_total counters incrementing normally
[ ] Spot check: 3 users with recent subscription changes — local DB matches Stripe

================================================================================
## Post-Mortem Trigger

ANY webhook failure = P0 = mandatory post-mortem within 24 hours.
Billing integrity incidents must have KNOWLEDGE-BASE.md entries.
Reconciliation scripts must be version-controlled (packages/server/scripts/).
