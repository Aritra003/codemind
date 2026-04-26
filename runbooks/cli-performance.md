# runbooks/cli-performance.md — CLI Performance Runbook
# SLO coverage: SLO-C05 (check fast p99 < 2s) · SLO-S05 (index p99 < 45s)
# Agent: DOCTOR | Last updated: 2026-04-23
# Trigger: telemetry shows p99 > 2.5s on check_fast_completed for > 5% of installs
# Note: This is a CLIENT-SIDE SLO — measured via opt-in telemetry. No server alert.
================================================================================

## Important: Client-Side SLO

CLI performance is measured via anonymous telemetry, not server probes.
Alert fires via scheduled ClickHouse query (OBSERVABILITY.md CLI check section).
There is no PagerDuty alert — this is discovered in the telemetry dashboard.
Discovery mechanism: daily Grafana dashboard review + ClickHouse scheduled query.

This runbook is triggered by a PRODUCT REGRESSION (code change), not infrastructure.

================================================================================
## Symptoms

ClickHouse query (from OBSERVABILITY.md):
  ```sql
  SELECT
    quantile(0.99)(duration_ms) AS p99,
    count() AS total_checks
  FROM telemetry.events
  WHERE event_name = 'check_fast_completed'
    AND timestamp > now() - INTERVAL 7 DAY
  ```
  Alert: p99 > 2500ms for > 5% of check_fast_completed events.

Corroborating signals:
  - D-03 llm_timeout events increasing (Anthropic API latency)
  - D-06 index_duration_recorded showing parse_duration or graph_build increase
  - D-04 graph_staleness_detected increasing (users not re-indexing = stale, slow checks)

User-reported:
  - "stinkit check is slower after the update"
  - GitHub issues or Discord reports of hang on large repos

================================================================================
## Severity Assessment

P1: p99 > 2500ms for > 10% of installs (sustained 3+ days)
    → Confirmed regression. Slack #eng alert. Investigate this sprint.
    → SPEC success metric: check p99 < 2s. This is a launch-critical metric.

P2: p99 2000-2500ms or only affecting < 5% of installs
    → Monitor. Investigate next sprint. Not an immediate regression.

Not an incident: p99 spike on a single day, returns to normal.
    → Could be Anthropic API latency on that day. Check D-03 llm_timeout.

================================================================================
## Root Cause Investigation

Step 1 — Determine if the p99 spike is CLI-native or Anthropic-dependent:

  ```sql
  -- Separate fast-tier (local) from deep tier (Anthropic)
  SELECT
    quantile(0.99)(duration_ms) AS p99,
    event_name
  FROM telemetry.events
  WHERE event_name IN ('check_fast_completed', 'check_deep_completed')
    AND timestamp > now() - INTERVAL 7 DAY
  GROUP BY event_name
  ```

  - If check_fast_completed p99 high BUT check_deep_completed normal:
    → Problem is in local graph traversal code (not Anthropic). See Step 2.
  - If check_deep_completed high AND D-03 llm_timeout elevated:
    → Anthropic API latency. Check https://status.anthropic.com. Wait or notify users.

Step 2 — Identify the slow phase (for CLI-native regression):

  D-06 diagnostic event breaks down: parse_duration_ms, graph_build_duration_ms,
  graph_traversal_duration_ms (implicitly from check duration - parse - build).

  ```sql
  SELECT
    avg(JSONExtractFloat(properties, 'parse_duration_ms')) AS avg_parse,
    avg(JSONExtractFloat(properties, 'graph_build_duration_ms')) AS avg_build,
    quantile(0.99)(JSONExtractFloat(properties, 'parse_duration_ms')) AS p99_parse
  FROM telemetry.events
  WHERE event_name = 'index_duration_recorded'
    AND timestamp > now() - INTERVAL 7 DAY
  ```

  - parse_duration high → tree-sitter regression or new language file types
  - graph_build_duration high → edge count growth or algorithm regression
  - persist_duration high → msgpack serialization issue or disk I/O

Step 3 — Correlate with release date:

  ```sql
  SELECT
    toDate(timestamp) AS day,
    quantile(0.99)(duration_ms) AS p99
  FROM telemetry.events
  WHERE event_name = 'check_fast_completed'
    AND timestamp > now() - INTERVAL 30 DAY
  GROUP BY day
  ORDER BY day
  ```

  Look for: did p99 jump on a specific date matching a CLI release?

Step 4 — Repository size factor:

  ```sql
  -- Correlate duration with repo size
  SELECT
    multiIf(JSONExtractInt(properties, 'node_count') < 10000, 'small',
            JSONExtractInt(properties, 'node_count') < 50000, 'medium', 'large') AS size_bucket,
    quantile(0.99)(duration_ms) AS p99
  FROM telemetry.events
  WHERE event_name = 'check_fast_completed'
    AND timestamp > now() - INTERVAL 7 DAY
  GROUP BY size_bucket
  ```

  If regression is only in "large" bucket → O(n) algorithm issue (acceptable SLO breach
  for repos much larger than the 50K-node SLO specification).

================================================================================
## Regression Fix Protocol

1. Reproduce locally:
   ```bash
   # Use the codmind-bench repo (50K node synthetic graph)
   cd packages/cli && npx ts-node bench/check-perf.ts
   # Target: < 2000ms p99 on 50K node graph
   ```

2. Profile the slow path:
   ```bash
   node --prof packages/cli/dist/index.js check bench/fixtures/large-repo.ts
   node --prof-process isolate-*.log > profile.txt
   ```

3. Write a regression test before fixing:
   ```typescript
   // packages/cli/tests/perf/check.perf.test.ts
   it('check_fast on 50K node graph completes in < 2000ms', async () => {
     const start = Date.now()
     await runCheck({ files: ['bench/fixtures/entry.ts'], graph: largeGraph })
     expect(Date.now() - start).toBeLessThan(2000)
   })
   ```

4. Fix the regression. Re-run bench. Confirm p99 < 2000ms.

5. Release. Monitor telemetry for 7 days post-release.

================================================================================
## Anthropic API Latency (not a CLI regression — external dependency)

If check_deep_completed p99 spikes but check_fast_completed is normal:
  1. Check https://status.anthropic.com
  2. Check D-03 llm_timeout rate: if > 5% of deep-analysis calls → confirm Anthropic issue
  3. Mitigation: CLI already shows offline-mode gracefully (--think falls back to fast tier message)
  4. Action: no code change needed. Update status.stinkit.dev if user-reported.
  5. If persistent (> 24h): consider reducing Anthropic API timeout from 30s to 20s to
     fail faster — TITAN reviews before implementing (architecture decision).

================================================================================
## Verification

[ ] ClickHouse check_fast p99 < 2000ms for rolling 7-day window
[ ] Bench suite passes: < 2000ms on 50K node synthetic graph
[ ] No D-03 llm_timeout spike
[ ] Release notes updated with performance fix

================================================================================
## Post-Mortem Trigger

CLI p99 regression that affects > 10% of installs for > 7 days → post-mortem.
Anthropic API outage > 4 hours affecting --think → post-mortem (for dependency tracking).
