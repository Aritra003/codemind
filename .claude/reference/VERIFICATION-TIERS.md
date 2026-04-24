# VERIFICATION-TIERS.md — Tiered Self-Healing Protocol
# Load: Read(".claude/reference/VERIFICATION-TIERS.md") when BUILDER needs verification detail
# Referenced from: CLAUDE.md PRIME DIRECTIVES → SELF-HEALING
================================================================================

## Why Tiers Exist

The original single-loop ran tsc + eslint + vitest + sonarjs + hygiene after every file.
On a mid-size project this takes 45–90 seconds per file. For a 10-file feature, that is
15 minutes of waiting before getting feedback on a typo. The result is the exact
"brownfield paralysis" the system warns against — developers skip the loop, ship dirty
code, and the "zero tolerance" standard becomes aspirational rather than enforced.

Tiered verification solves this by matching check cost to check timing. Fast checks run
constantly. Slow checks run at natural commit boundaries where waiting 60 seconds is
acceptable and expected.

---

## TIER 1 — Instant Feedback (after every file write, ~5 seconds)

**Trigger:** immediately after saving any file
**Purpose:** catch hygiene and lint violations before they compound across files

```bash
# TypeScript
eslint [file] --max-warnings 0
tsx scripts/hygiene-check.ts [file]

# Python
ruff check [file]
mypy [file] --strict

# Go
golangci-lint run [file]

# Rust
cargo clippy -- -D warnings
```

**What Tier 1 catches:**
- console.* in src/ files (ESLint no-console + hygiene-check)
- debugger statements (ESLint no-debugger)
- TODOs without ticket references (hygiene-check)
- Possible hardcoded secrets (hygiene-check pattern match)
- Direct provider or analytics SDK imports outside lib/ abstraction (hygiene-check)
- Unused imports and style violations (ESLint / ruff / golangci-lint)

**Tier 1 failure behaviour:**
Fix the file before writing the next file. Do not accumulate Tier 1 failures across files.
State in CONTEXT.md: "Tier 1 open: [filename] — [issue]" if moving on temporarily.

---

## TIER 2 — Pre-Commit Gate (~60 seconds)

**Trigger:** before every `git commit`
**Purpose:** zero-tolerance gate. Nothing that fails Tier 2 enters version control.

```bash
# TypeScript (full suite)
tsc --noEmit \
  && eslint src/ --max-warnings 0 \
  && vitest run [domain] --coverage \
  && npx sonarjs src/[file] \
  && tsx scripts/hygiene-check.ts [file]

# Python (full suite)
mypy [module] --strict \
  && ruff check [module] \
  && pytest tests/[domain]/ -x --cov=[module] --cov-fail-under=80 \
  && radon cc [file] -n B

# Go (full suite)
go vet ./... \
  && golangci-lint run \
  && go test ./[domain]/... -coverprofile=coverage.out \
  && bash scripts/check-coverage.sh \
  && gocognit [file] -over 10

# Rust
cargo clippy -- -D warnings \
  && cargo test [domain]
```

**What Tier 2 catches (beyond Tier 1):**
- Type errors across the full project (`tsc --noEmit` catches cross-file type mismatches
  including hallucinated library calls and schema field access — Prisma-generated types
  make field mismatches compile errors, not runtime surprises)
- Failing tests (regression detection)
- Cognitive complexity violations (sonarjs / radon / gocognit)
- Coverage regressions (vitest/pytest --cov-fail-under / check-coverage.sh)
- Circular dependency violations (fitness-check for changed file in Tier 3)

**Grounding note:**
`grounding-check.ts` was removed in v1.4. Its library-function check duplicated `tsc --noEmit`.
Its schema-field check is now handled by Prisma-generated typed client code — `tsc --noEmit`
catches field access errors. Remaining behavioural grounding is enforced by BUILDER G1–G5
protocol (BUILDER.md), which is stack-agnostic.

**Tier 2 failure behaviour:**
Commit is blocked. No "I'll fix in the next commit."
Exception for WIP commits on personal branches only: prefix with `wip:` and document the
open Tier 2 failure in the commit message body. Must be resolved before PR.

**Tier 2 and the "project is runnable" rule:**
After Tier 2 passes, `npm run dev` (or equivalent) must start without errors.
Verified as part of the commit checklist in BUILDER.md, not by an automated script.

---

## TIER 3 — Pre-Merge Gate (before PR merge, ~3–10 minutes)

**Trigger:** before merging any PR to main/trunk
**Purpose:** architecture fitness + cross-file correctness + integration confidence
**Run by:** CI pipeline automatically on every PR.

```bash
# Full Tier 2 suite across all changed files
# PLUS:
bash scripts/fitness-check.sh                  # architecture fitness functions
vitest run --coverage                          # full project, not just domain
npx jscpd src/ --min-lines 5 --min-tokens 50   # duplication check
npm audit --audit-level=high                   # security gate

# OpenAPI contract verification — only include if project has external API consumers
# and scripts/generate-openapi.ts is implemented (see SCRIPTS.md for spec):
# tsx scripts/generate-openapi.ts --verify
```

**What Tier 3 catches (beyond Tier 2):**
- Cross-file architectural violations (layer rule breaches, SDK encapsulation failures)
- New code duplicating existing logic in another file
- New dependency with HIGH/CRITICAL vulnerability
- API contract regressions (breaking change without version bump)
- Coverage regression at project level (not just domain level)

**Tier 3 failure behaviour:**
PR is blocked from merging. Failure logged in CONTEXT.md as open issue.
Must be resolved before any other work on this feature is merged.

---

## Quick Reference: What Runs When

| Check | Tier 1 (after file) | Tier 2 (before commit) | Tier 3 (before merge) |
|---|:---:|:---:|:---:|
| eslint / ruff / golangci | ✅ | ✅ | ✅ |
| hygiene-check.ts | ✅ | ✅ | ✅ |
| tsc / mypy / go vet | ❌ | ✅ | ✅ |
| vitest / pytest / go test | ❌ | ✅ (domain) | ✅ (full) |
| sonarjs / radon / gocognit | ❌ | ✅ | ✅ |
| coverage threshold | ❌ | ✅ (native config) | ✅ (full project) |
| fitness-check.sh | ❌ | ❌ | ✅ |
| jscpd (duplication) | ❌ | ❌ | ✅ |
| npm audit | ❌ | ❌ | ✅ |
| OpenAPI contract diff | ❌ | ❌ | ✅ (if external API consumers) |

---

## Configuring QUALITY_GATES in CONTEXT.md

Set at project start. Copy the per-stack template from TOOL-CONFIG.md:
  Read(".claude/reference/TOOL-CONFIG.md") → QUALITY_GATES templates section.

TOOL-CONFIG.md is the single source for per-stack command strings and coverage threshold
configuration. It covers TypeScript, Python, Go, Rust, and polyglot projects.

The tier structure is fixed for all stacks:
```
QUALITY_GATES:
  tier1: "[stack-specific fast checks — from TOOL-CONFIG.md]"
  tier2: "[stack-specific full suite with coverage — from TOOL-CONFIG.md]"
  tier3: "ci"
```
