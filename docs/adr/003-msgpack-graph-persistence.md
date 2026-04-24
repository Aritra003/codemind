# ADR-003: MessagePack for local graph persistence
Date: 2026-04-23 | Status: ACCEPTED | Author: TITAN

## Context
The code graph (CodeNode + CodeEdge + GitHistory metadata) must be persisted locally
across CLI invocations. A 50K-node TypeScript repo produces approximately:
- Nodes: 50,000 × avg 200 bytes = ~10 MB of node data
- Edges: 150,000 × avg 80 bytes = ~12 MB of edge data
- Git history: 50,000 × avg 150 bytes = ~7.5 MB
Total: ~30 MB of raw structured data before serialization.

The persistence format determines: (a) file size on disk, (b) time to load on each CLI
invocation, (c) time to save after indexing. Load time directly impacts the < 2s check
target — any format slower than ~200ms to deserialize at 50K nodes blocks the guarantee.

## Decision
**MessagePack** (`@msgpack/msgpack` npm package) for all local graph persistence.
File: `.codemind/graph.msgpack`. No fallback formats.

## Alternatives Rejected
1. **JSON** — rejected because: at 50K nodes, JSON produces a 50-100MB file.
   `JSON.parse` on 100MB takes 800ms-2s on developer hardware. Unacceptable for < 2s check.
   Additionally, JSON has no schema enforcement — type drift is invisible at runtime.
2. **SQLite** — rejected because: while SQLite is excellent for persistent query-heavy
   workloads, it adds 3-5MB binary dependency, requires a schema migration system from
   day one, and offers no meaningful benefit over msgpack for a read-mostly blob that is
   loaded entirely into memory. SQLite is the right answer at 200K+ nodes. ADR-003
   explicitly plans this as a REVIEW TRIGGER.
3. **Protocol Buffers (protobuf)** — rejected because: requires a schema definition step
   and a code-generation build step. msgpack requires neither — it serializes TypeScript
   objects natively. Protobuf would be preferable if the graph needed to be shared
   across language boundaries (e.g., a Python consumer). Not needed for v1.
4. **FlatBuffers** — rejected because: zero-copy deserialization is compelling at
   500MB+, but adds compilation complexity. Premature for the current size target.

## Consequences
Positive:
- 50K-node graph: ~8MB msgpack file (vs ~80MB JSON) — 10x size reduction
- Deserialization at 50K nodes: ~50ms (vs 800ms+ JSON) — fits comfortably in 2s budget
- Native TypeScript object support — no manual field mapping
- Zero schema definition overhead

Negative (tradeoffs accepted):
- Binary format: not human-readable. `cat .codemind/graph.msgpack` is not useful.
  (Mitigation: `codemind graph --export json` always available for inspection)
- msgpack does not self-describe: schema changes require a version field + migration logic
  (Mitigation: graph.msgpack includes a `version` field; on version mismatch, re-index)

Blast radius: `packages/cli/src/graph/persist.ts` only. All other modules read the
in-memory graph — they never touch the file. Changing serialization format = one file.

## Review trigger
`graph.msgpack` exceeds 150MB for the p99 repo in the user base, OR CLI startup
(including deserialization) exceeds 3 seconds. Either condition triggers SQLite migration.
