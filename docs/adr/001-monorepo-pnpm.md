# ADR-001: Monorepo with pnpm workspaces + Turborepo
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
CodeMind has four distinct packages with different deployment targets:
- `shared` — TypeScript types shared by CLI and server (zero runtime, compile-time only)
- `cli` — npm package, runs on developer machines, offline-first
- `server` — cloud API, runs on AWS
- `web` — Next.js dashboard, deployed to Vercel or Lambda@Edge

These packages share type definitions (CodeNode, BlastRadiusResult, API contracts).
Without a shared types package, type drift between CLI and server is inevitable.
The team is small (≤ 5 engineers), working on all packages simultaneously.

## Decision
Single git repository (monorepo) using **pnpm workspaces** for package management and
**Turborepo** for build orchestration. Package layout: `packages/shared`, `packages/cli`,
`packages/server`, `packages/web`.

## Alternatives Rejected
1. **Polyrepo (separate repos per package)** — rejected because: shared types would
   require an npm publish cycle for every type change. At this team size and early stage,
   that overhead slows iteration by 2-4x. Polyrepo is correct when teams need independent
   deploy cadence and size ≥ 10. Neither condition is true.
2. **npm workspaces (without Turborepo)** — rejected because: Turborepo provides
   incremental build caching across packages. Without it, every CI run rebuilds all 4
   packages. At 500K MAU with high commit frequency, CI costs matter.
3. **Yarn workspaces** — rejected because: pnpm's content-addressable store is 40-60%
   smaller disk footprint than Yarn. Node_modules hoisting is more predictable. No
   meaningful feature gap for this use case.

## Consequences
Positive:
- Shared types: zero drift between CLI output contracts and server API contracts
- Atomic commits: a CLI change + server API change in one PR, one review
- Single CI pipeline: one apex.yml builds + tests all packages
- Turborepo remote cache: < 30s CI on warm cache runs

Negative (tradeoffs accepted):
- Repo size grows faster than polyrepo (all package histories together)
- git clone is larger for engineers who only work on one package
- Turborepo adds one build tool to learn

Blast radius: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`. All 4 packages
reference each other via workspace protocol.

## Review trigger
Team size exceeds 10 AND different packages need different release cadences AND a dedicated
platform team owns infra separately from product. All three must be true simultaneously.
