# TECH-DEBT.md — CodeMind
# Owner: SCHOLAR | Updated: 2026-04-24
# All items scored: Priority (P0–P3), Effort (S/M/L), Risk (HIGH/MED/LOW)
================================================================================

## CRITICAL (blocks safe operation)
_None._

## HIGH (degrade quality or safety if left >1 sprint)

### TD-001 — Unicode injection bypass in sanitize.ts
Priority: P1 | Effort: S | Risk: HIGH
The injection detector uses regex patterns that don't cover Unicode homoglyphs or
zero-width-space obfuscation (e.g. `ig​nore previous instructions` with ZWSP).
Impact: A crafted input could bypass sanitization and reach the AI with injection content.
Mitigation in place: The trace command is a local-only developer tool; blast radius is limited.
Fix: Add Unicode normalisation (NFC) before pattern matching; add zero-width char strip.
Ticket: [open after hackathon]

### TD-002 — `computeBlastRadius` is async but has no timeout guard
Priority: P2 | Effort: S | Risk: MED
`AnalysisModule.computeBlastRadius` is declared async for future git integration, but the
current implementation is synchronous. A future async implementation could hang indefinitely
without a timeout.
Fix: Add `Promise.race(computation, timeout)` pattern before adding async git calls.
Ticket: [open after hackathon]

## MEDIUM (degrade developer experience or maintainability)

### TD-003 — No CI/CD pipeline
Priority: P2 | Effort: M | Risk: MED
No GitHub Actions or equivalent workflow defined. Quality gates run locally only.
Fix: Add `.github/workflows/ci.yml` with tsc + vitest + audit.
Ticket: [post-hackathon]

### TD-004 — Runner guard pattern duplicated (4× in commands/)
Priority: P3 | Effort: M | Risk: LOW
The GRAPH_NOT_FOUND / AI_UNAVAILABLE guard pattern is repeated across check-runner.ts,
see-runner.ts, trace-runner.ts, and graph-runner.ts (4.03% duplication per jscpd).
Fix: Extract `withGraph(config, cb)` and `withAI(config, graph, cb)` helpers.
Note: Deliberately not abstracted in v1 — premature abstraction risk outweighed benefit.
Ticket: [v2 cleanup sprint]

### TD-005 — `ForensicsModule.classifyOrigin` uses unique author count, not commit count
Priority: P3 | Effort: S | Risk: LOW
`classifyOrigin` returns SINGLE_COMMIT when all ranked commits have the same author.
This is more accurately "SINGLE_AUTHOR" — multiple commits from one author still get
classified as SINGLE_COMMIT, which is misleading.
Fix: Return MULTI_COMMIT if `ranked.length > 1` regardless of author.
Ticket: [v2 refinement]

## LOW (cosmetic or future-proofing)

### TD-006 — Graph completeness_pct not updated after partial parse
Priority: P3 | Effort: M | Risk: LOW
`completeness_pct` is set at index time and not recalculated if the graph is loaded
and nodes are evicted or filtered. In practice this doesn't occur, but future filtering
logic should recalculate it.

### TD-007 — `pino-pretty` included in production bundle
Priority: P3 | Effort: S | Risk: LOW
`pino-pretty` is in `devDependencies` but the logger imports it unconditionally in dev
mode. Should be lazy-loaded with `await import('pino-pretty')` to avoid bundling in prod.

================================================================================
## RESOLVED DEBT (kept for audit trail)
_None yet._
