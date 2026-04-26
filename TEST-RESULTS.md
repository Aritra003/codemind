# StinKit Integration Test Results — Cap Repository
# Date: 2026-04-24 | Tester: automated integration run
# Repo: https://github.com/CapSoftware/Cap (depth=50 shallow clone)
================================================================================

## 1. Summary Table

| Test | Result | Notes |
|------|--------|-------|
| 1 — INDEX | ⚠️ PASS w/ bugs | Completed, 3033 nodes, 40s. Completeness 15% (below 60% threshold). Parser crash fixed during test (TSX grammar + try/catch). |
| 2 — STATUS (no args) | ❌ FAIL | Shows help text instead of status dashboard. Design gap. |
| 3 — GRAPH HOTSPOTS | ✅ PASS | Ranked list, formatted, real Cap files, plausible counts. |
| 4 — GRAPH EXPORT | ⚠️ PARTIAL | JSON export works. `--export mermaid` flag not implemented (flag is `--output`). |
| 5 — CHECK FAST TIER | ⚠️ PARTIAL | Hotspot: 7.6s (budget: 2s). Leaf file: 0.7s ✅. Risk MEDIUM for 0-dependent test file (should be LOW). `--file` flag not implemented (use positional args). |
| 6 — CHECK THINK TIER | ⏭ SKIPPED | No Anthropic API key configured in test environment. |
| 7 — CHECK NO API KEY | ✅ PASS | Clear error "Deep analysis requires an Anthropic API key." No crash, no stack trace. |
| 8 — SEE | ⏭ SKIPPED | No API key. |
| 9 — TRACE | ⏭ SKIPPED | No API key. |
| 10 — MCP SERVER | ✅ PASS | Starts via stdio transport. 5 tools registered. MCP SDK bundling fixed during test. |
| 11 — JSON OUTPUT | ✅ PASS | Both `check --json` and `graph --json` emit valid, parseable JSON after fixes. |
| 12 — EDGE CASES | ⚠️ PARTIAL | Empty dir: 0 nodes (no error). Single file: indexes ✅, check returns MEDIUM not LOW. |

---

## 2. Performance Numbers

| Operation | Observed | Budget |
|-----------|----------|--------|
| Index (3033 nodes, Cap monorepo) | 40s | 120s ✅ |
| Check — hotspot file (290 dependents) | 7.6s | 2s ❌ |
| Check — leaf file (0 dependents) | 0.7s | 2s ✅ |
| Graph hotspots (top 20) | <1s | N/A ✅ |
| MCP server startup | <1s | N/A ✅ |

**Root cause of check latency:** `AnalysisModule.computeBlastRadius` calls `loadNodeHistory` (one `git log` per unique file in the affected set). For a file with 290 affected nodes across ~100+ files, this generates 100+ sequential git subprocesses. Fixed from 32s → 7.6s by scoping to affected nodes only; still exceeds 2s budget for high-blast-radius files.

**Recommended fix (TD-008):** Cache git history during indexing and attach it to the stored graph, eliminating per-check git calls entirely.

---

## 3. Total Estimated API Spend

$0.00 — All API tests skipped (no API key configured in test environment).

Budget: $5.00 remaining.

---

## 4. Bugs Found

### BLOCKER

**BUG-1: check performance exceeds 2s budget for high-blast-radius files**
- Severity: Blocker (core UX promise is "under 2 seconds")
- File: `src/lib/analysis/analysis-module.ts`
- Root cause: Sequential git log calls per affected file in `loadNodeHistory`
- Fix: Cache node history at index time; read from stored graph during check
- Workaround: Fixed from 32s → 7.6s (scope to affected nodes). Acceptable for now.

**BUG-2: Completeness 15% on a real monorepo (expected 60-95%)**
- Severity: Blocker (the product metric is wrong, and every check shows a scary warning)
- Root cause: `computeCompleteness` counts UNRESOLVED edges as incomplete. In a pnpm monorepo, cross-package imports like `from '@stinkit/shared'` resolve to `UNRESOLVED::functionName` because the resolver only matches by name within the current parse, not cross-package. 3033 nodes but only ~15% of call edges resolve.
- Fix: Improve edge resolver to handle workspace package imports; use `LANG_MAP` + package.json parsing to map cross-package imports.

### MAJOR

**BUG-3: `stinkit` with no args shows help, not status dashboard**
- Severity: Major (first-run experience is broken)
- File: `src/index.ts` — needs default action showing graph status
- Fix: Add a default action that calls `runGraph({ hotspots: true })` or a dedicated status view

**BUG-4: Test/leaf files return MEDIUM instead of LOW risk**
- Severity: Major (wrong risk signal for the most common check case)
- Root cause: `detectCoverageGaps` marks any node that isn't in the coverage map as a gap. Files with no coverage data (test files, utilities) always get 1+ gaps → MEDIUM.
- Fix: Treat "no coverage data" as "coverage unknown" (not "uncovered"). Only flag as gap when coverage data EXISTS and the node is missing from it.

**BUG-5: `--file` flag not implemented (positional args required)**
- Severity: Major (test spec and likely user expectation uses `--file`)
- File: `src/commands/check.ts`
- Fix: Add `--file <path>` as an alias for the positional argument

**BUG-6: `--export mermaid` not implemented**
- Severity: Major (test spec and demo use case calls for Mermaid diagram generation)
- File: `src/commands/graph.ts`
- Fix: Add `--export <format>` option with `mermaid` and `json` formats; generate Mermaid from graph edges

**BUG-7: Empty repo produces 0 nodes with no warning**
- Severity: Major (silent failure looks like success)
- Fix: If `files.length === 0` OR `allNodes.length === 0`, exit with a clear message: "No TypeScript/JavaScript files found. Check your working directory."

**BUG-8: MCP SDK runtime resolution failure (FIXED)**
- Severity: Was blocker — fixed during test
- Root cause: `@modelcontextprotocol/sdk` uses `exports` field, incompatible with CJS subpath resolution
- Fix applied: `tsup.config.ts` with `noExternal: ['@modelcontextprotocol/sdk']` to bundle SDK inline

### MINOR

**BUG-9: `--json` output contaminated by completeness warning on stdout (FIXED)**
- Severity: Was minor — fixed during test
- Fix applied: Guard completeness write with `if (!options.json)`

**BUG-10: `--json` global flag not forwarded to subcommand opts (FIXED)**
- Severity: Was minor — fixed during test
- Fix applied: `cmd.parent?.opts()` pattern in check and graph commands

**BUG-11: Parser crash on TSX files / edge case inputs (FIXED)**
- Severity: Was blocker — fixed during test
- Fix applied: TSX grammar for `.tsx`/`.jsx` files; `try/catch` around `parser.parse()`

**BUG-12: `ageMs` can be slightly negative from filesystem mtime jitter (FIXED)**
- Severity: Cosmetic — fixed during test
- Fix applied: `Math.max(0, Date.now() - stat.mtimeMs)` in persist.ts

### COSMETIC

**BUG-13: Node.js punycode deprecation warning on every invocation**
- Every command prints `[DEP0040] DeprecationWarning: The 'punycode' module is deprecated`
- Root cause: One of the bundled dependencies uses `punycode` (likely `uuid` or `pino`)
- Fix: `NODE_OPTIONS=--no-deprecation` in bin/stinkit.js, or upgrade the offending dep

---

## 5. Screenshot-Worthiness

**Rating: 7/10**

What looks great:
- Risk badge symbols (● CRITICAL, ◐ MEDIUM) with chalk colors are visually distinct
- Hotspot ranking with dependent counts is clean and scannable
- Separator lines and consistent indentation give professional CLI feel
- The `stinkit index` success message with node/edge count is satisfying

What needs polish before demo:
- The 15% completeness warning appears on EVERY command output — it dominates the screen and signals "something is wrong" before showing results. For a demo this is a blocker.
- The completeness warning is identical in the header AND footer of check output (shown twice)
- No color on the risk badge count numbers (direct/transitive dependents shown in plain white)
- No progress indicator during the `check` command loading phase

---

## 6. Demo-Readiness

**Status: NOT READY for public demo as-is**

**Blockers for demo:**
1. 15% completeness on a real TypeScript monorepo — every output shows "⚠ some blast radius paths may be missing". Needs to be fixed or suppressed.
2. `check` on the hotspot file takes 7.6s — breaks the "instant results" value proposition.
3. No default status view — first thing a new user sees is the help screen.

**Ready for internal demo (with caveats):**
- The `check` workflow on leaf/mid-tier files works well (0.7–1.5s)
- JSON output is clean and would work for CI integration demos
- MCP server starts and has the right tool definitions
- The terminal formatting is polished once you get past the completeness warning

**What would make it demo-ready in 1 sprint:**
1. Fix completeness calculation for workspace imports (BUG-2)
2. Add `--file` flag (BUG-5)
3. Add `--export mermaid` (BUG-6)
4. Add status dashboard for no-arg invocation (BUG-3)
5. Cache git history at index time to hit 2s check budget (BUG-1)

---

## 7. Fixes Applied During Test Session

All fixes were committed to the codebase as part of this test run:

| Fix | Files Changed |
|-----|---------------|
| TSX parser grammar | `src/graph/parser.ts` |
| Parser crash guard | `src/graph/parser.ts` |
| Indexer per-file crash guard | `src/lib/graph/indexer.ts` |
| Check performance (scoped git calls) | `src/lib/analysis/analysis-module.ts` |
| `--json` global flag propagation | `src/commands/check.ts`, `src/commands/graph.ts` |
| JSON stdout contamination | `src/commands/check-runner.ts`, `src/commands/graph-runner.ts` |
| MCP SDK bundling | `tsup.config.ts`, `package.json` |
| Logger to stderr | `src/lib/logger.ts` |
| Structured logging at key points | parser, indexer, check-runner |
| `ageMs` clamp | `src/graph/persist.ts` |

---

## 8. Recommended Next Sprint (TD-008 additions)

Priority order for hackathon polish:

1. **TD-008** (new) — Cache git node history at index time → fix check latency
2. **BUG-2** — Fix completeness calculation for workspace/cross-package imports
3. **BUG-3** — Default status view for no-arg invocation
4. **BUG-4** — Coverage gap classification (unknown vs uncovered)
5. **BUG-5/6** — `--file` flag + `--export mermaid`

================================================================================
Generated: 2026-04-24 | StinKit v0.1.0 | Cap repo: 3033 nodes / 28718 edges
