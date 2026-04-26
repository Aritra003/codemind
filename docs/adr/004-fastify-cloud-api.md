# ADR-004: Fastify 5 for the cloud API server
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The StinKit cloud API serves three concerns: identity/auth, billing management, and
telemetry ingestion. At 500K MAU with 10 opt-in telemetry events per active session,
peak telemetry ingestion is ~1,200 RPS (with burst to ~5,000 RPS during business hours).
Auth endpoints are lower volume (~200 RPS peak) but latency-sensitive (< 200ms p99).

The API is the only cloud component. It must be:
- Stateless (horizontally scalable — no sticky sessions)
- TypeScript-native with full type safety including route schemas
- Fast enough for telemetry batch ingestion without additional gateway

## Decision
**Fastify 5** with `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/helmet`, and
`@fastify/cors`. Schema validation via Fastify's native JSON Schema integration (Zod
schemas converted via `zod-to-json-schema` for the validation layer).

## Alternatives Rejected
1. **Express 5** — rejected because: Express has no built-in schema validation — every
   route requires manual Zod parsing, which is slower and more boilerplate. Fastify's
   schema-first validation is 40% faster per request due to JIT-compiled validators.
   Express still has larger community, but Fastify has first-class TypeScript support that
   Express achieves only through community types.
2. **Hono** — rejected because: Hono is excellent for edge deployments (Cloudflare Workers)
   but our API needs stateful connections to PostgreSQL and Redis. Hono's edge-first design
   adds friction for traditional server deployments. Revisit if we move to edge computing.
3. **NestJS** — rejected because: NestJS adds a heavy DI framework, decorators, and
   ~4x the boilerplate for the same functionality. The additional abstraction layers make
   debugging harder in incidents. For a < 5 person team, NestJS overhead is net negative.
4. **Bun + ElysiaJS** — rejected because: Bun is not yet production-stable on AWS Lambda.
   ElysiaJS ecosystem is young. Risk profile unacceptable for production at 500K MAU.

## Consequences
Positive:
- Fastify serialization: 2-3x faster JSON response serialization vs Express via fast-json-stringify
- Schema-based validation: route input is typed and validated with < 1ms overhead
- Native async/await support throughout — no callback pyramid
- Mature plugin ecosystem: JWT, rate-limit, helmet, CORS all have official Fastify plugins

Negative (tradeoffs accepted):
- Smaller community than Express — some Stack Overflow answers don't apply
- Fastify's plugin system (encapsulation model) requires learning — confusing for engineers
  coming from Express who expect global middleware

Blast radius: `packages/server/src/app.ts` and all `routes/v1/` files.

## Review trigger
Fastify reaches EOL, OR a critical CVE with no patch within 30 days, OR we migrate
the API to edge computing (Cloudflare Workers / Vercel Edge).
