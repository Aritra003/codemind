# ADR-005: PostgreSQL 16 with schema separation (identity / billing / public)
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The cloud API has three distinct data domains: identity (users, teams, API keys),
billing (subscriptions, invoices, usage), and telemetry (analytics — handled by
ClickHouse, ADR-006). These domains have different:
- Access patterns: identity is read-heavy (auth on every request); billing is write-heavy
  during billing cycles; usage metering is high-frequency write
- Sensitivity: identity contains PII (email, password hash); billing contains financial
  data; usage is aggregate counts
- Scaling characteristics: at 500K MAU, identity.users hits ~500K rows; billing.subscriptions
  hits ~100K rows; usage_meters hits ~600K rows/year
- Team ownership: if the team splits (post-PMF), identity and billing are natural service
  boundaries

The two patterns available are: (a) a single shared schema with table prefixes, or (b)
separate PostgreSQL schemas within a single database instance.

## Decision
**PostgreSQL 16 (AWS RDS Multi-AZ)** with two explicit schemas: `identity` and `billing`.
The `public` schema holds only infrastructure tables (feature_flags, schema_versions).
**No cross-schema foreign keys.** Services join within their schema only.

Prisma is configured with multiple schema sources but a single `DATABASE_URL`.
The identity service uses the `identity` schema; the billing service uses `billing`.

## Alternatives Rejected
1. **Single schema, table prefixes** (`identity_users`, `billing_subscriptions`) — rejected
   because: table prefixes are a naming convention, not an enforced boundary. BUILDER will
   inevitably join across domains directly. When we want to split to separate services
   post-PMF, the joins are already in the codebase. Schema separation makes the boundary
   visible and enforceable (DL-009: no cross-schema FK).
2. **Separate databases per domain** — rejected because: at current scale, separate
   databases add operational overhead (2 connection pools, 2 RDS instances, 2 backup
   schedules) with no meaningful benefit. Single RDS instance with schema separation
   gives the boundary without the ops cost. Revisit post-100K MAU.
3. **DynamoDB** — rejected because: billing and identity have complex query patterns
   (team membership lookups, subscription status checks) that require multi-field filtering.
   DynamoDB's single-table design would require careful key design to avoid full scans.
   PostgreSQL's query planner is the right tool for relational data with joins.

## Consequences
Positive:
- Enforced domain boundary: `identity` service cannot accidentally query `billing` tables
- Clear migration ownership: identity schema migrations are separate from billing schema
  migrations — fewer merge conflicts in prisma/migrations/
- Gradual service extraction: when splitting post-PMF, `identity` tables move to their own
  RDS instance by changing the connection string, not rewriting queries
- Row-level partitioning: `identity.users` partitioned by `created_at` month handles
  500K MAU growth with predictable query performance

Negative (tradeoffs accepted):
- Prisma's multi-schema support requires careful configuration (two schema blocks in
  schema.prisma, or two separate Prisma schema files)
- No cross-schema foreign keys means application-level consistency enforcement for
  operations that span identity + billing (e.g., creating a subscription requires a
  valid user_id but there's no FK to enforce it at the DB layer)
  (Mitigation: the billing service calls the identity service to validate user existence
  before creating a subscription — not a DB constraint, but a service contract)

Blast radius: `packages/server/prisma/schema.prisma` and all `repositories/` files.

## Review trigger
A strong operational case for separate databases exists (e.g., identity needs HIPAA
compliance with stricter encryption settings, or billing needs a different region for
regulatory reasons). If these cases arise, schema separation makes extraction straightforward.
