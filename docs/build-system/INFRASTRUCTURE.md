# INFRASTRUCTURE.md — CodeMind Infrastructure Design
# Mode: INFRA-DESIGN | Agent: TITAN
# Input: ARCHITECTURE.md + THREAT-MODEL.md + API-DESIGN.md
# Last updated: 2026-04-23
# Owned by: TITAN — no infrastructure component may be added without updating this file.
================================================================================

## Critical Finding: AI Cost Model

⚠️ The CLI uses the DEVELOPER'S OWN Anthropic API key (stored in ~/.codemind/config.yaml).
CodeMind does NOT pay for Opus API calls in the CLI product.

Implications:
  1. CodeMind's infrastructure AI cost is $0 for CLI users
  2. Users bear their own API costs — CodeMind must publish token budgets per feature
     so users can predict their spend
  3. Prompt caching maximizes user savings (cache hits at $1.50/1M vs $15/1M input)
  4. A future "managed AI" tier (CodeMind provides API access for a monthly fee) is
     a viable Pro/Enterprise upsell — but not in v1

Server-side AI usage (by CodeMind, billed to CodeMind):
  - None in v1. All Opus calls originate from the user's CLI with their API key.
  - If cloud-hosted forensics or CI-based drift detection is added post-v1,
    this section must be updated with a cost model and SENTINEL review.

================================================================================
## AI Usage Strategy Per Feature
================================================================================

All AI calls centralized in: packages/cli/src/lib/ai.ts
All prompts in versioned files: packages/cli/src/lib/ai/prompts/*.ts
Model strings: NEVER hardcoded in business logic. Always via selectModel(task).

### Model Routing Table (locked — review quarterly or on major Anthropic release)

```typescript
// packages/cli/src/lib/ai.ts — selectModel() routing table
type AITask =
  | 'think-blast-radius'        // Explain deterministic analysis, suggest tests
  | 'vision-extract-diagram'    // 3.75MP vision: extract components + connections
  | 'vision-resolve-entities'   // Map diagram names → code entity names
  | 'forensics-triage'          // Classify error origin (CODE|INFRA|CONFIG|DATA|DEPENDENCY)
  | 'forensics-narrate'         // Causal chain narrative for top commits

const MODEL_ROUTING: Record<AITask, ModelConfig> = {
  'think-blast-radius':       { model: 'claude-opus-4-7', maxTokens: 2048, cacheSystemPrompt: true },
  'vision-extract-diagram':   { model: 'claude-opus-4-7', maxTokens: 1024, vision: true },
  'vision-resolve-entities':  { model: 'claude-haiku-4-5-20251001', maxTokens: 512 },
  'forensics-triage':         { model: 'claude-haiku-4-5-20251001', maxTokens: 256, cacheSystemPrompt: true },
  'forensics-narrate':        { model: 'claude-opus-4-7', maxTokens: 2048, cacheSystemPrompt: true },
}
```

Rationale for model split:
  - Opus 4.7: deep reasoning, vision (3.75MP), nuanced narrative — used where quality matters
  - Haiku 4.5: fast classification tasks (triage, entity matching) — same accuracy at 20x lower cost
  - vision-resolve-entities uses Haiku because it's a fuzzy string matching task, not reasoning

### Token Budgets Per Feature (published in CLI output for user transparency)

| Feature | Task | Input (est.) | Output (est.) | Opus 4.7 cost* | Haiku 4.5 cost* |
|---|---|---|---|---|---|
| `check --think` | think-blast-radius | 1.5K (500 cached) | 2K | ~$0.16 | N/A |
| `see` extraction | vision-extract-diagram | 2K + image | 1K | ~$0.11 | N/A |
| `see` entity resolution | vision-resolve-entities | 500 | 512 | N/A | ~$0.001 |
| `trace` triage | forensics-triage | 300 | 256 | N/A | ~$0.0003 |
| `trace --think` | forensics-narrate | 2K (500 cached) | 2K | ~$0.16 | N/A |

*Estimates. Prompt caching applied to system prompts (cacheSystemPrompt: true).
 Actual cost shown to user via `codemind check --think --estimate-cost` flag (shows token count, no API call).
 Anthropic pricing current as of 2026-04-23 — review quarterly.

### Prompt Caching Strategy

All system prompts marked as cacheable blocks (Anthropic cache_control: ephemeral).
System prompt TTL at Anthropic: 5 minutes. Warm cache saves ~75% of system prompt cost.

Cache-eligible prompts (stable across calls):
  - think-blast-radius system prompt: ~500 tokens. Cache hit rate target: >90%
  - forensics-triage system prompt: ~200 tokens. Cache hit rate target: >95%
  - forensics-narrate system prompt: ~500 tokens. Cache hit rate target: >85%

Not cached:
  - User context (blast radius data, commit list) — unique per call
  - vision-extract-diagram — image input is always unique

Implementation in lib/ai.ts:
```typescript
messages: [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: systemPromptText,
        cache_control: { type: 'ephemeral' }   // ← Anthropic prompt caching
      },
      {
        type: 'text',
        text: userContextText                   // ← unique per call, not cached
      }
    ]
  }
]
```

### AI Cost Guard Rails (protect user from accidental spend)

1. `--estimate-cost` flag: count tokens locally, print estimate, do NOT call API.
2. Monthly token budget warning: if ~/.codemind/config.yaml has `monthly_token_budget: N`,
   warn when estimated cumulative spend exceeds 80%, block at 100%.
3. Retry limit: max 2 retries on API error. Never infinite retry. Total max spend per
   CLI invocation: 3× the single-call estimate.
4. Image size gate: > 5MB image rejected before Opus call (SENTINEL SV-002 requirement).
5. Error input gate: > 50KB stack trace truncated to 50KB before forensics-triage call.

================================================================================
## Redis Infrastructure
================================================================================

### Connection Configuration

```typescript
// packages/server/src/lib/cache.ts (ONLY Redis import in server package)
import Redis from 'ioredis'

const redis = new Redis({
  host:        process.env.REDIS_HOST,
  port:        parseInt(process.env.REDIS_PORT ?? '6379'),
  password:    process.env.REDIS_PASSWORD,
  tls:         process.env.NODE_ENV === 'production' ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),  // backoff: 100ms, 200ms, 300ms... max 3s
  lazyConnect: true,
})
```

Production: AWS ElastiCache Redis 7 (cluster mode disabled, Multi-AZ with auto-failover).
Dev: `docker-compose.yml` redis:7-alpine.

### Key Schema (all keys namespaced — no collision)

```
# Auth
session:{token_hash}                → { userId, email, tier }     TTL: 900s  (15 min, access token)
refresh:{token_hash}                → userId                       TTL: 604800s (7 days)
lockout:{email_hash}                → failCount                    TTL: 1800s (30 min — SV-001)
password_reset:{token_hash}         → userId                       TTL: 3600s (1 hour)

# Rate limiting (sliding window via @fastify/rate-limit)
rl:ip:{endpoint}:{ip}               → count                        TTL: 60s
rl:user:{endpoint}:{userId}         → count                        TTL: 60s
rl:email:{endpoint}:{email_hash}    → count                        TTL: 3600s (hour-window endpoints)

# Usage metering (SV-003: atomic INCR)
usage:{ownerId}:{YYYY-MM}           → integer count                TTL: seconds to period end

# Subscription cache (avoid DB hit on every request)
subscription:{userId}               → { tier, status }             TTL: 60s

# BullMQ internal (managed by BullMQ library — do not read/write manually)
bull:{queue}:*
```

### BullMQ Queue Configuration

```typescript
// Queue definitions in packages/server/src/lib/queues.ts
import { Queue, Worker } from 'bullmq'

const QUEUE_CONFIGS = {
  'telemetry-flush': {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail:     50,
      attempts:         3,
      backoff: { type: 'exponential', delay: 1000 },
    },
    // Worker: batch-write up to 500 events to ClickHouse. Runs every 60s.
    // Trigger: POST /telemetry/events enqueues; also time-based flush via repeat job.
  },
  'email': {
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail:     100,      // keep failed for debugging
      attempts:         3,
      backoff: { type: 'exponential', delay: 2000 },
    },
    // Worker: send via Resend SDK. Concurrency: 5.
  },
  'gdpr-purge': {
    defaultJobOptions: {
      removeOnComplete: 500,       // keep audit trail
      removeOnFail:     500,
      attempts:         5,
      backoff: { type: 'exponential', delay: 60000 },  // 1 min, 2 min, 4 min...
      // Delayed by 30 days from account deletion (timestamp passed as job option delay)
    },
    // Worker: delete identity rows, cancel subscriptions, purge tokens, log completion.
    // On final failure: alert ops@codemind.dev — GDPR purge failure is a legal incident.
  },
}
```

Dead-letter handling:
  - telemetry-flush fails: events are lost (acceptable — telemetry is aggregate)
  - email fails after 3 retries: move to DLQ, alert ops, SLA: fix within 1 business day
  - gdpr-purge fails after 5 retries: P0 incident — legal liability. Alert immediately.

================================================================================
## PostgreSQL Infrastructure
================================================================================

### Connection Pool

```typescript
// packages/server/src/lib/db.ts (ONLY Prisma import in server package)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: process.env.NODE_ENV === 'production'
    ? ['error']
    : ['query', 'warn', 'error'],
})
// DATABASE_URL format: postgresql://user:password@host:5432/codemind?schema=identity
// For billing schema: separate BILLING_DATABASE_URL or use Prisma datasource aliases
```

Connection pool sizing (Prisma default: 5 connections):
  Development: 2 connections (laptop constraint)
  Staging:     5 connections (default)
  Production:  10 connections (db.t4g.medium: 170 max connections ÷ 3 instances = 56 per instance; 10 is safe)

AWS RDS configuration:
  Instance:       db.t4g.medium (2 vCPU, 4 GB RAM) — adequate for 500K MAU at current query volume
  Multi-AZ:       enabled (automatic failover ~30s)
  Storage:        gp3, 100 GB, auto-scaling enabled (max 500 GB)
  Backup:         7-day automated backups, daily snapshots
  Encryption:     at-rest encryption enabled (AES-256 via AWS KMS)
  Upgrade trigger: db.t4g.large when p99 query time exceeds 100ms for 3 consecutive days

Prisma multi-schema setup:
```prisma
// packages/server/prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["identity", "billing", "public"]
}
```

================================================================================
## ClickHouse Infrastructure
================================================================================

### Client Configuration

```typescript
// packages/server/src/lib/clickhouse.ts (ONLY @clickhouse/client import)
import { createClient } from '@clickhouse/client'

const ch = createClient({
  host:     process.env.CLICKHOUSE_HOST,          // https://xxx.clickhouse.cloud:8443
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: 'telemetry',
  compression: { request: true, response: true }, // gzip — reduces bandwidth ~5x
  clickhouse_settings: {
    async_insert: 1,                              // ClickHouse buffers before writing
    wait_for_async_insert: 0,                     // don't block on insert (fire-and-forget batch)
  },
})
```

Batch write strategy (telemetry-flush BullMQ worker):
```typescript
// Write pattern: batch insert, not row-by-row
await ch.insert({
  table: 'telemetry.events',
  values: events,    // array of up to 500 events
  format: 'JSONEachRow',
})
```

ClickHouse Cloud sizing:
  Launch:    1 node, 2 vCPU, 4 GB RAM  (~$80/month)
  At 500K MAU: 1 node, 4 vCPU, 16 GB RAM (~$200/month)
  Upgrade trigger: query p99 > 5s on 7-day dashboard queries

Partition management:
  Partition: toYYYYMM(timestamp) — automatic, one partition per month
  Hot tier:  last 90 days (NVMe SSD on ClickHouse Cloud)
  Cold tier: 90+ days — TTL MOVE to S3 (configured via TTL policy in CREATE TABLE)
  Retention: 2 years total. After 2 years: DROP PARTITION.

================================================================================
## Cost Model (Infrastructure Only)
================================================================================

### Monthly Infrastructure Costs at 500K MAU

| Component | Service | Spec | Cost/month |
|---|---|---|---|
| PostgreSQL | AWS RDS Multi-AZ | db.t4g.medium, 100GB gp3 | ~$220 |
| Redis | AWS ElastiCache | cache.t4g.medium, Multi-AZ | ~$120 |
| API Server | AWS ECS Fargate | 3 × 0.5 vCPU / 1 GB (HA) | ~$90 |
| Web Dashboard | Vercel Pro | Serverless, global CDN | ~$20 |
| ClickHouse | ClickHouse Cloud | 4 vCPU, 16 GB | ~$200 |
| Email | Resend | 100K emails/month | ~$20 |
| DNS + SSL | AWS Route 53 + ACM | Managed certificates | ~$5 |
| Bandwidth | AWS CloudFront | ~100 GB/month | ~$15 |
| Monitoring | Sentry (errors) | Team plan | ~$26 |
| **Total** | | | **~$716/month** |

### AI Cost (User-Borne — Not CodeMind's Spend)

Per-user cost estimates (with prompt caching active):
  `codemind check --think` per call: ~$0.16  (Opus 4.7 with cached system prompt)
  `codemind see` per call:           ~$0.11  (Opus 4.7 vision + Haiku entity resolution)
  `codemind trace` full analysis:    ~$0.16  (Haiku triage + Opus narrative)

Average developer using CodeMind 50×/month (mix of features):
  Estimated Anthropic spend: ~$3–8/month

This is the user's cost. CodeMind has zero AI cost in the CLI model.
IMPORTANT: Document this clearly in pricing page and README.

### Revenue vs Infrastructure at Scale

At 500K MAU with 2% paid conversion (10K paying users), avg $25/user/month:
  Monthly revenue:       ~$250,000
  Monthly infra costs:   ~$716
  Infrastructure COGS:   0.29% (exceptional — software product economics)
  Primary cost driver:   Engineering salaries (not infrastructure)

================================================================================
## Environment Variables (complete registry)
================================================================================

All variables validated at server startup by scripts/validate-env.ts.
Missing or invalid → startup fails with clear error. No silent defaults in production.

### Server (packages/server/.env.example)

```bash
# Runtime
NODE_ENV=production
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/codemind?schema=identity
BILLING_DATABASE_URL=postgresql://user:pass@host:5432/codemind?schema=billing

# Redis
REDIS_HOST=xxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=

# ClickHouse
CLICKHOUSE_HOST=https://xxx.clickhouse.cloud:8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Auth
APP_JWT_SECRET=<min 32 random bytes — generate: openssl rand -hex 32>
APP_JWT_ISSUER=api.codemind.dev

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_TEAM_MONTHLY=price_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@codemind.dev

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Feature flags
ENABLE_TEAM_FEATURES=true
ENABLE_ENTERPRISE_SSO=false

# Observability
SENTRY_DSN=https://...
LOG_LEVEL=info
```

### CLI (user-created: ~/.codemind/config.yaml — NOT .env)

```yaml
# ~/.codemind/config.yaml — chmod 600 enforced at write time
api_key: ant_...          # Anthropic API key (user's own)
telemetry: true           # opt-in; set to false to disable
monthly_token_budget: 50  # optional: warn at 80%, block at 100% (USD)
codemind_api_key: cm_live_...  # CodeMind cloud API key (for team features)
thresholds:               # optional: override risk classification
  critical_min_direct: 50
  high_min_direct: 30
  medium_min_direct: 10
```

File permissions enforced on write: `fs.chmod(configPath, 0o600)` (SENTINEL requirement).

================================================================================
## Cloud Abstraction Interfaces (complete)
================================================================================

Per ARCHITECTURE.md DL-006/DL-010: no provider SDK outside these files.

```
packages/server/src/lib/db.ts          → Prisma only (PostgreSQL)
packages/server/src/lib/cache.ts       → ioredis only (Redis)
packages/server/src/lib/clickhouse.ts  → @clickhouse/client only (ClickHouse)
packages/server/src/lib/stripe.ts      → stripe only
packages/server/src/lib/email.ts       → resend only
packages/cli/src/lib/ai.ts             → @anthropic-ai/sdk only
```

Provider swap = change one file + env vars. No application code changes.

================================================================================
## Real-Time Infrastructure
================================================================================

v1: No real-time requirements. All dashboard data is REST-polled.
  Dashboard refresh: client polls GET /api/v1/billing/usage every 60 seconds.
  No WebSocket. No SSE. No long-polling.

DEFERRED (trigger: team graph sync feature addition):
  Evaluate: SSE for graph sync notifications (simpler than WebSocket for one-directional push).
  Evaluate: Ably or Pusher for managed WebSocket (avoid self-managing WebSocket at scale).
  Revisit: when first user requests "live" team graph updates.

================================================================================
## Multi-Tenancy Infrastructure
================================================================================

Tenant isolation implemented at multiple layers (defence in depth):

  Layer 1 — Database: schema separation (identity vs billing — no cross-schema FKs)
  Layer 2 — Repository: every query includes `WHERE team_id = :teamId` or `WHERE user_id = :userId`
  Layer 3 — Redis: all keys namespaced with userId or teamId (no shared counters)
  Layer 4 — ClickHouse: install_id provides anonymous isolation (not linked to user identity)
  Layer 5 — Application: JWT claims validated on every request; team membership checked per resource

Cross-tenant test suite (mandatory in CI — per SENTINEL requirement):
  Location: packages/server/tests/integration/cross-tenant.test.ts
  Runs on: every PR touching any repository or service file
  Tests: user from team A cannot read/write any resource of team B → expect 404

================================================================================
## Data Portability Scripts
================================================================================

Required by GDPR (Article 20) and disaster recovery plan.

```
scripts/export-data.ts
  Purpose: Export all user data as a JSON file (GDPR portability)
  Input: userId or --all (ops use only)
  Output: user-{id}-export.json with all PA-01..PA-05 data
  Timing: called by POST /api/v1/auth/data-export route (queue async job)

scripts/verify-export.ts
  Purpose: Verify export is complete and not corrupted
  Input: export JSON file path
  Output: verification report (row counts, field presence, schema validation)
  Timing: called after export-data.ts completes

scripts/validate-env.ts
  Purpose: Validate all required environment variables at startup
  Input: process.env
  Output: exit 1 with clear error list if any required var missing/invalid
  Timing: FIRST import in server.ts (before any other module loads)
```

================================================================================
## Local Development Setup
================================================================================

```yaml
# infrastructure/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: codemind
      POSTGRES_USER: codemind
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  clickhouse:
    image: clickhouse/clickhouse-server:24-alpine
    ports: ["8123:8123", "9000:9000"]
    volumes: [clickhouse_data:/var/lib/clickhouse]
```

First-time setup (from ONBOARDING.md):
```bash
docker compose up -d
pnpm install
pnpm --filter server prisma migrate dev
pnpm --filter server prisma db seed
pnpm dev   # starts all packages via Turborepo
```

Time to productive dev environment: < 5 minutes.

================================================================================
# END OF INFRASTRUCTURE.md
# Gate: INFRA-DESIGN complete.
# Next gate: SLO-DESIGN (TITAN) → SLO.md
================================================================================
