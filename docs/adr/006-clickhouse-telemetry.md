# ADR-006: ClickHouse for telemetry analytics (not PostgreSQL)
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The telemetry pipeline (ANALYTICS-SCHEMA.md) produces ~5M events/day at 500K MAU
(500K active users × ~10 events/active session). These events are append-only (never
updated), queried by time range and event name for aggregate analytics (counts, averages,
funnels), and must be retained for 90 days hot + 2 years cold.

At 5M events/day × 365 days = ~1.8 billion rows/year, standard OLTP databases like
PostgreSQL will degrade significantly on analytical queries (GROUP BY event_name,
COUNT(*) over millions of rows).

## Decision
**ClickHouse** (self-hosted or ClickHouse Cloud) for all telemetry events.
Table: `telemetry.events`, partitioned by `toYYYYMM(timestamp)`, ordered by `(event_name, timestamp)`.
Cold storage tiered via ClickHouse's TTL MOVE to S3-compatible storage after 90 days.
PostgreSQL is **never** used for analytics queries.

## Alternatives Rejected
1. **PostgreSQL with TimescaleDB** — rejected because: TimescaleDB is excellent for
   time-series at moderate scale, but ClickHouse's columnar storage gives 10-100x better
   compression and query performance on analytics aggregations at > 1B rows. TimescaleDB
   would require the same RDS instance to handle both OLTP (identity/billing) and OLAP
   (telemetry) — mixing these workloads on one instance creates contention under load.
2. **BigQuery** — rejected because: BigQuery is excellent but creates a Google Cloud
   vendor lock-in in what is otherwise an AWS-first architecture. Per-query cost model
   also creates unpredictable bills under high dashboard query volume. ClickHouse's
   fixed-cost deployment model is more predictable at our scale.
3. **Amazon Redshift** — rejected because: Redshift requires a dedicated cluster, costs
   $0.25/node/hour at minimum, and is significantly over-engineered for 5M events/day.
   ClickHouse on a single c6i.xlarge handles 50M events/day.
4. **Storing telemetry in PostgreSQL (billing schema)** — rejected because: at 1.8B rows/year,
   a standard PostgreSQL table with no columnar storage will produce query times of 10-30s
   for simple aggregations. This makes the dashboard unusable. DL-010 permanently locks
   PostgreSQL out of the analytics role.

## Consequences
Positive:
- ClickHouse compresses telemetry events to ~200 bytes/row (vs ~500 bytes in PostgreSQL)
  → 1.8B rows/year = ~360GB compressed (manageable on a single node)
- Analytical queries (GROUP BY event_name WHERE timestamp > now() - 7d) run in < 1s
  even at full scale
- Built-in TTL with S3 tiering — hot/cold management is automated, not manual
- ClickHouse Cloud provides a managed option with no ops overhead for early stage

Negative (tradeoffs accepted):
- Additional infrastructure to operate: ClickHouse vs. just PostgreSQL
  (Mitigation: ClickHouse Cloud managed option for v1 — operational overhead minimal)
- ClickHouse's SQL dialect differs from PostgreSQL — Prisma does not support ClickHouse
  (Mitigation: `packages/server/src/lib/clickhouse.ts` is a thin abstraction over
   `@clickhouse/client`. Queries are raw SQL but isolated to one file.)
- ClickHouse is eventually consistent on replicas (ReplicatedMergeTree). For dashboard
  reads, this is acceptable (analytics can be T-1 minute fresh).

Blast radius: `packages/server/src/lib/clickhouse.ts` + `services/telemetry.ts`.
No other server file touches ClickHouse directly.

## Review trigger
ClickHouse operational complexity exceeds the team's capacity to manage (e.g., all
3 engineers on the team are front-end focused), AND a managed alternative (BigQuery,
Redshift Serverless) can be proven to cost less than ClickHouse Cloud at our query volume.
