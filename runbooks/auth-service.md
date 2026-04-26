# runbooks/auth-service.md — Authentication Service Runbook
# SLO coverage: SLO-C01 (login/register/refresh) · SLO-C02 (GET /auth/me)
# Agent: DOCTOR | Last updated: 2026-04-23
# On-call trigger: Auth p99 > 600ms sustained · Error rate > 0.1% · Auth endpoint 5xx
================================================================================

## Symptoms

Dashboard signals (Grafana "Is StinKit healthy?" Row 2):
  - Auth p99 latency > 600ms
  - Auth error rate > 0.1% 5xx per minute
  - auth_logins_total{status: failure} spike (may indicate credential stuffing)
  - auth_lockouts_total spike (> 100/hour = possible attack)

User-reported:
  - "I can't log in"
  - "My session keeps expiring"
  - "I get a 401 immediately after logging in"

PagerDuty alerts that trigger this runbook:
  - SLO-C01 fast burn (> 2% budget in 1h)
  - auth_lockouts_total > 100 in 60 min

================================================================================
## Severity Assessment (first 5 minutes)

P0: ALL of: error rate > 50% + p99 > 2000ms + lasting > 5 minutes
    → All users cannot log in. Declare P0. Page founder + on-call.

P1: ANY of: error rate 10-50% | p99 600ms-2000ms | lockout spike > 100/hour
    → Subset of users affected or SLO burning fast. Page on-call. Investigate.

P2: Error rate < 10% + p99 slightly elevated + no user reports
    → Monitor. Investigate in business hours. Check recent deploys.

================================================================================
## Immediate Mitigation (before root cause is known)

Step 1 — Check for recent deployment:
  ```
  # List recent ECS task deployments
  aws ecs describe-services --cluster stinkit-prod --services stinkit-api \
    --query 'services[0].deployments'
  ```
  If a deploy happened in the last 30 minutes → ROLLBACK IMMEDIATELY (see below).

Step 2 — Check RDS connection count:
  Grafana: Row 4 → "DB connection pool"
  If connections at max (100): restart ECS tasks to release hung connections.
  ```
  aws ecs update-service --cluster stinkit-prod --service stinkit-api \
    --force-new-deployment
  ```

Step 3 — Check Redis availability:
  CloudWatch: ElastiCache → auth namespace
  If Redis down: auth continues (sessions fall back to DB) but lockout protection disabled.
  → Alert ops immediately. Patch within 30 min (security: rate limits and lockouts disabled).

Rollback command (ECS rolling deploy):
  ```
  aws ecs update-service --cluster stinkit-prod --service stinkit-api \
    --task-definition stinkit-api:[PREVIOUS_REVISION]
  # Find previous revision:
  aws ecs list-task-definitions --family-prefix stinkit-api --sort DESC --max-items 3
  ```
  Rollback takes ~3 minutes. Confirm with: GET /health → 200 + auth smoke test.

================================================================================
## Root Cause Investigation

Check in this order (most likely cause first):

1. **Recent deployment** (most common cause)
   - CloudWatch ECS → deployment events
   - Check: did error rate spike at exactly the deploy time?
   - Fix: rollback if deploy correlates with error spike

2. **bcrypt work factor / slow hashing**
   - Symptom: p99 climbing but no error spike (slow, not failing)
   - Check: auth_latency_ms histogram in Grafana → is p99 at exact bcrypt-expected timing?
   - SLO-C01 allows < 600ms — bcrypt at cost 12 = ~250ms. If > 350ms: server CPU contention.
   - Fix: check ECS CPU utilization. Scale out tasks if > 80%.

3. **RDS connection exhaustion**
   - CloudWatch: RDS → DatabaseConnections metric
   - If at max (100): connection pool leak. Restart ECS tasks as immediate mitigation.
   - Root cause: unclosed connections in a new code path. Check recent PRs.

4. **JWT signing key misconfiguration**
   - Symptom: 401 on all token validations, including valid fresh tokens
   - Check: CloudWatch logs filter: `suspicious_token` log events
   - Fix: verify JWT_SECRET env var in ECS task definition matches expected value.
     CAUTION: changing JWT_SECRET invalidates ALL active sessions — plan user impact.

5. **Credential stuffing attack (lockout spike)**
   - Symptom: auth_lockouts_total spike, not a service error
   - Check: `auth_lockouts_total` counter in Grafana + CloudWatch logs `account_locked`
   - Mitigation: IP-based rate limits already in place. Add Cloudflare WAF rule for source IP range.
   - Escalate: > 1000 lockouts/hour → STEWARD security incident briefing.

================================================================================
## Security Breach Protocol

If credential stuffing is confirmed AND passwords may have been compromised:
  1. STEWARD declares security incident (P0-02 in ESCALATION-TREE.md)
  2. SENTINEL takes over forensics
  3. DOCTOR assists with mass refresh token revocation:
     ```
     # Purge all refresh tokens for affected users (Redis pattern)
     redis-cli -h $REDIS_HOST SCAN 0 MATCH "refresh:*" COUNT 1000
     # For targeted purge by userId:
     redis-cli -h $REDIS_HOST DEL "refresh:{userId}"
     ```
  4. GDPR 72-hour notification clock starts from confirmed breach time.
     → STEWARD notifies legal immediately.

================================================================================
## Recovery Steps

1. Deploy fix or roll back to last known good revision.
2. Verify ECS tasks are healthy:
   ```
   aws ecs describe-tasks --cluster stinkit-prod \
     --tasks $(aws ecs list-tasks --cluster stinkit-prod --service-name stinkit-api \
               --query 'taskArns[]' --output text)
   ```
3. Run auth smoke test:
   ```
   # POST /auth/login with test credentials (from Secrets Manager: test-account creds)
   curl -X POST https://api.stinkit.dev/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "$TEST_EMAIL", "password": "$TEST_PASSWORD"}'
   # Expected: 200 + accessToken
   ```
4. Verify GET /auth/me with returned token → 200.
5. Monitor Grafana for 10 minutes: error rate should return to < 0.1%.

================================================================================
## Verification (service fully recovered)

[ ] GET /health returns 200 with all checks passing
[ ] auth_logins_total{status: success} climbing back to normal rate
[ ] auth_latency_ms p99 < 600ms
[ ] Auth p99 latency alert auto-resolved in PagerDuty
[ ] No new auth_lockouts_total spike
[ ] CloudWatch log group: no new `login_failed` burst

================================================================================
## Post-Mortem Trigger

P0 or P1 → mandatory post-mortem within 24 hours → POSTMORTEMS.md entry.
KNOWLEDGE-BASE.md entry required for any auth incident that recurs.
