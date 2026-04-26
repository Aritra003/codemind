# ADR-002: CLI architecture — Modular Monolith (single binary, bounded-context modules)
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The StinKit CLI has 4 bounded contexts (Graph, Analysis, Vision, Forensics) identified
in EVENT-STORM.md. The key deployment constraint is: the CLI must be a single installable
npm package (`npx stinkit`) with zero-config setup, < 200ms startup, and full offline
operation. The typical alternative — microservices or a plugin architecture — would
require a running daemon, network ports, or subprocess management, all of which add
complexity and fragility on developer machines.

## Decision
The CLI is a **modular monolith**: a single Node.js process with four internal modules
(Graph, Analysis, Vision, Forensics) that communicate only through TypeScript interfaces
defined in each module's `index.ts` (the "port"). No module imports another module's
internals — only its interface. This boundary is enforced by `hygiene-check.ts`.

## Alternatives Rejected
1. **Plugin architecture (dynamic loading)** — rejected because: plugin loading adds
   startup latency (200ms+), requires a plugin registry, and creates security surface
   (arbitrary code execution). Zero benefit at this team size.
2. **Separate processes per command** — rejected because: graph must be shared across
   commands in a session. Loading + deserializing graph.msgpack per process adds 500ms+.
   Shared in-memory graph is the only path to < 2s check.
3. **Rust binary (for performance)** — rejected because: tree-sitter has a mature Node.js
   binding. TypeScript dev velocity is 3-4x higher for this team. Premature optimization.
   Revisit if startup time degrades below targets with > 200K node graphs.

## Consequences
Positive:
- Single `npx stinkit` install, no daemon, no config, < 200ms startup
- Graph loaded once per process → Analysis, Vision, Forensics all query same in-memory graph
- Module boundaries enforced statically by hygiene-check.ts — no runtime overhead
- TypeScript strict mode catches cross-module type violations at compile time

Negative (tradeoffs accepted):
- All modules in the same process: a crash in Vision takes down the whole CLI
  (acceptable — CLI is a dev tool, not a server. Single process is the correct threat model)
- As the graph grows to 200K nodes, memory pressure increases. A single process
  cannot be killed selectively. (Mitigation: msgpack lazy loading; only load on `index`)

Blast radius: `packages/cli/src/` — all 4 bounded-context modules + hygiene-check.ts rule.

## Review trigger
A bounded context's code exceeds 5,000 lines AND its startup contribution exceeds 100ms
AND there is a clear user-facing benefit to isolating it. All three must be true.
