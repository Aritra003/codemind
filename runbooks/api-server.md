# runbooks/api-server.md — API Server + Infrastructure Runbook
# SLO coverage: SLO-C03 (GET /health) · General API availability
# Agent: DOCTOR | Last updated: 2026-04-23
# On-call trigger: GET /health failing · API error rate > 1% · ECS task crashes
================================================================================

## Symptoms

Dashboard signals (Grafana Row 1 "Service health"):
  - API availability % drops below 99.9%
  - Error rate % rising
  - Active incidents counter incrementing

Infrastructure signals (Grafana Row 4):
  - DB connection pool near max
  - Redis hit rate dropping
  - ClickHouse queue depth > 5000

Synthetic probe failure:
  - GET /health returning non-200 or timing out > 50ms

================================================================================
## Severity Assessment

P0: GET /health returns non-200 for > 2 minutes consistently.
    → Full outage. All API endpoints likely down. Page immediately.
    → STEWARD posts to status page (ESCALATION-TREE.md P0-01 protocol).

P1: Subset of endpoints failing. /health returns 200 but specific routes error.
    → Partial degradation. Page on-call. Investigate per-route in Grafana.

P2: Elevated error rate < 5% or p99 latency elevated but health check green.
    → Monitor and investigate. Not waking anyone up.

================================================================================
## Health Check Anatomy

GET /health returns:
  ```json
  {
    "status": "healthy" | "degraded",
    "checks": {
      "database": "ok" | "error",
      "redis":    "ok" | "error" | "degraded",
      "version":  "1.x.x"
    }
  }
  ```

"degraded" vs "error":
  - database "error" → return 503 → P0 alert fires
  - redis "error" → return 200 with "degraded" → P1 alert fires (rate limiting disabled)
  - redis "degraded" → 200 → monitor (cache miss, not total failure)

================================================================================
## Immediate Mitigation

Step 1 — Identify scope:
  ```bash
  # Check which ECS tasks are running
  aws ecs list-tasks --cluster stinkit-prod --service-name stinkit-api \
    --desired-status RUNNING
  # If 0 running tasks: immediate ECS restart
  aws ecs update-service --cluster stinkit-prod --service stinkit-api \
    --force-new-deployment
  ```

Step 2 — Check for recent deployment (most common cause):
  ```bash
  aws ecs describe-services --cluster stinkit-prod --services stinkit-api \
    --query 'services[0].deployments[*].[status,createdAt,taskDefinition]'
  ```
  Active deployment in LAST 30 MINUTES + health degraded = rollback candidate.

Step 3 — Rollback (if deploy is cause):
  ```bash
  # Find previous stable task definition
  aws ecs list-task-definitions --family-prefix stinkit-api --sort DESC --max-items 5
  # Roll back
  aws ecs update-service --cluster stinkit-prod --service stinkit-api \
    --task-definition stinkit-api:[PREVIOUS_REVISION]
  ```

Step 4 — If NOT a deploy issue (infra failure):
  Check RDS: CloudWatch → RDS → DatabaseConnections, ReadLatency, WriteLatency
  Check Redis: CloudWatch → ElastiCache → CurrConnections, CacheHits, EngineCPUUtilization
  Check ECS task memory: CloudWatch → ECS → MemoryUtilization (OOM kills appear here)

================================================================================
## Root Cause Investigation (ordered by likelihood)

1. **Failed deployment (bad code)**
   - ECS deployment events align with error spike
   - Check CloudWatch Logs: /stinkit/prod/api → ERROR level events around deploy time
   - Fix: rollback. Write fix. Re-deploy with proper test coverage.

2. **RDS connection pool exhaustion**
   - CloudWatch RDS DatabaseConnections > 95 (max 100)
   - Cause: connection leak in a code path (unclosed Prisma clients, unhandled errors)
   - Immediate: restart ECS tasks (releases leaked connections)
   - Root cause: find the unclosed connection in PR that shipped before the spike

3. **OOM (Out of Memory) ECS task kill**
   - ECS task stops with exit code 137
   - CloudWatch Container Insights: MemoryUtilization > 90%
   - Cause: memory leak (graph data loaded without pagination, large JSON response)
   - Immediate: restart tasks. Add memory threshold alert.
   - Fix: identify the memory-growing operation via heap profiling.

4. **RDS unavailable (AWS infrastructure failure)**
   - CloudWatch RDS: DBInstanceStatus = "storage-full" | "failed" | "rebooting"
   - Multi-AZ automatic failover: ~30 seconds RTO. WAIT before acting.
   - If not auto-failing: AWS support ticket + status.aws.amazon.com check

5. **Redis unavailable**
   - Health check returns { redis: "error" }
   - Degraded mode: API continues but rate limiting, lockout protection, session cache disabled
   - STEWARD alert: ops must patch within 30 min (security: rate limits disabled)
   - Fix: ElastiCache restart. If persistent: check ElastiCache CloudWatch for cause.

6. **Cost runaway / ECS task termination**
   - ECS service desired count 0 (someone scaled to zero accidentally)
   - Or: ECS task keeps crashing on startup (crash loop)
   - Crash loop: check CloudWatch Logs for startup error. Fix config or rollback.

================================================================================
## Cost Runaway Protocol (ESCALATION-TREE.md P0-06)

If AWS Cost Anomaly Detection fires (bill > 3× daily average):
  1. CloudWatch → Cost Explorer → identify top-cost resource this hour
  2. ECS runaway: check task count vs desired count. Scale down if unexpected.
  3. RDS runaway: check for full-table scans (OFFSET pagination bug, missing index)
  4. Data transfer runaway: check ClickHouse data export volume
  5. Immediately reduce or pause the runaway resource
  6. STEWARD briefing to founder within 1 hour (P0-06 in ESCALATION-TREE.md)

================================================================================
## Recovery Steps

1. Deploy fix or rollback verified.
2. All ECS tasks running and healthy:
   ```bash
   aws ecs describe-services --cluster stinkit-prod --services stinkit-api \
     --query 'services[0].runningCount'
   # Should equal desired count (e.g., 2)
   ```
3. GET /health → 200, status: "healthy", all checks "ok".
4. API smoke test (run from CI smoke test suite):
   ```bash
   cd packages/server && npx vitest run tests/smoke/
   ```
5. Monitor Grafana for 10 minutes. Error rate < 0.1%. p99 < SLO targets.

================================================================================
## Verification

[ ] GET /health returns 200 + { status: "healthy" }
[ ] ECS running count = desired count
[ ] RDS DatabaseConnections < 50 (returning to normal)
[ ] Redis CacheHitRate > 80%
[ ] API availability % in Grafana returning to > 99.9%
[ ] PagerDuty alert auto-resolved or manually cleared

================================================================================
## Post-Mortem Trigger

Any P0 (full outage) → mandatory post-mortem within 24 hours.
Any crash loop that persists > 15 minutes → post-mortem required.
