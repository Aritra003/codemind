# Apex — AI-First Engineering Team
Authors: Ashish Khandelwal, Arup Kolay | MIT License
Current version: v1.5
================================================================================

Apex is a Claude-native engineering system that replaces the single-agent coding
assistant model with a structured team of 13 specialist agents, each with defined
authority, modes, and verification protocols. It is designed for VS Code + Claude
Code but is LLM-provider agnostic — every agent spec is plain markdown with no
provider-specific dependencies.

The core problem it solves: a single-agent Claude session consumes ~100K tokens
at startup (v1.1 had a 7,177-line CLAUDE.md), loses context mid-session, ignores
incremental feedback, and has no structured quality gates. Apex reduces startup
cost to ~5K tokens by loading agent specs on demand, enforces requirement tracking
via a CHANGELOG protocol, and runs tiered verification at file-write, commit, and
merge boundaries.

---

## Version history

| Aspect | v1.1 | v1.2 | v1.3 | v1.4 | v1.5 |
|---|---|---|---|---|---|
| CLAUDE.md size | 7,177 lines (~60K tokens) | ~200 lines | ~190 lines | ~248 lines | ~270 lines |
| Session startup cost | ~100K tokens | ~5K + load on demand | ~5K + load on demand | Same + context budget awareness | ~8K (lazy-load pipeline recovers ~9K tokens/session) |
| Incremental feedback | Ignored, reverts to PRD | REQUIREMENT CHANGELOG | Enforced in BUILDER pre-flight | Same | Same + gate skip mechanism with DEFERRED/PERMANENT classification |
| Stack support | TypeScript only | QUALITY_GATES variable | Same | Same + TOOL-CONFIG.md per-stack native configs | Same |
| Legal + compliance | Not addressed | Not addressed | COUNSEL agent added | Full COMPLIANCE-LEGAL mode | Same |
| Analytics | Not addressed | Not addressed | ANALYTICS-PROTOCOL.md standard | Same | Same |
| Greenfield pipeline | Partial | Extended | 29-mode pipeline | 33-mode pipeline, lazy-load | Named PRODUCTION profile + lazy-load implemented |
| Brownfield pipeline | Not addressed | Not addressed | Not addressed | 6 modes with full protocols | Same + graduation path to APEX-BUILT |
| Apex-built pipeline | Not addressed | Not addressed | Not addressed | Not addressed | NEW: APEX-BUILT.md with FEATURE + HOTFIX profiles |
| Pipeline profiles | Not addressed | Not addressed | Not addressed | Not addressed | PIPELINE-PROFILES.md lifecycle overview + 5 named profiles |
| Document templates | None | None | TEMPLATES.md — 7 output templates | 11 templates + location rule | Same |
| Output document coverage | None | None | None | All 25 named output documents | Same |
| Agent completeness | Partial | Most modes declared | All modes declared | All modes + full execution protocols | Same + lazy-load orchestration in all 13 agent files |
| Verification scripts | Aspirational references | Same | 4-script spec | 2 real scripts + 3 script bugs fixed | Same + CI-TEMPLATE.md (GitHub Actions + GitLab CI) |
| Cloud abstraction interfaces | None | None | None | 4 typed interfaces | Same |
| Agent hand-offs | None | None | None | 6 veto resolution protocols + 4 handoff payloads | Same + quality metrics circuit breaker |
| System observability | None | None | None | Token budget + quality metrics + health check | Same + context budget auto-update at session start |
| Multi-developer support | None | None | One sentence | Branch isolation + merge algorithm | Same |
| Knowledge base | Template only | Template only | Template + tag taxonomy | 11 seed entries | Working reference (max 200 lines) + KNOWLEDGE-ARCHIVE.md (permanent record, no cap) |
| CONTEXT.md management | No cap enforcement | Same | Same | 200-line cap + compression | 250-line cap + comment strip + DECISIONS LOCKED externalised to ARCHITECTURE.md |
| Accessibility | Not addressed | Not addressed | Empty gate | Full WCAG 2.1 AA protocol | Same |
| Content duplication | Systemic | Same | Same | Eliminated | Same |

---

## What changed in v1.4

### Script architecture — replaced pseudocode specs with real implementations

The v1.3 `SCRIPTS.md` specified four scripts. Two were retired:

**`grounding-check.ts` retired.** Its library-function check duplicated `tsc --noEmit`.
Its schema-field check is already handled by Prisma-generated typed client code —
accessing a nonexistent field is a compile error, not a runtime surprise. The remaining
behavioural grounding gap is covered by BUILDER's G1–G5 protocol, which works across
all stacks. A TypeScript-only custom script is the wrong tool for a multi-stack system.

**`coverage-ratchet.js` retired.** vitest, pytest-cov, and Go's test runner all enforce
coverage thresholds natively. A wrapper script that duplicates this adds a bootstrapping
requirement before first use with no benefit.

**What replaced them:** `TOOL-CONFIG.md` — a new reference file with copy-paste native
coverage threshold configs for TypeScript (vitest), Python (pytest-cov), and Go, plus
ESLint rules covering the hygiene-check overlap. Ready to use immediately on install.

**`hygiene-check.ts` promoted** from pseudocode spec to a complete, runnable TypeScript
implementation covering six structural checks including `no-direct-provider-import` and
`no-direct-analytics-import` — the two checks ESLint cannot handle without a custom plugin.

**`fitness-check.sh` retained** unchanged. Layer boundary enforcement across directories
genuinely requires a custom script.

### Critical gaps closed

**ARTISAN ACCESSIBILITY Gate** — was a section header with zero content. Now contains:
full WCAG 2.1 AA checklist, required ARIA patterns for 6 common components, CI integration
spec (axe-core + pa11y + Lighthouse CI).

**COUNSEL COMPLIANCE-LEGAL mode** — COUNSEL.md existed but had no execution content.
Now contains a complete checklist across five domains: data protection + privacy (GDPR),
AI-specific legal review, IP and license audit, consumer law, dependency license scan.

**STEWARD sign-off list** — was missing 7 of 13 agents. Now lists all 13.

**SENTINEL COMPLIANCE-CHECK** — engineering half was declared but had no content.
Full checklist now covers code discipline scan, security headers, dependency audit,
PRIME DIRECTIVES compliance.

### Agent protocol depth

Agents that previously had mode declarations but no execution content now have full
mode sections: BUILDER (TDD, SCAFFOLD, INTEGRATION), DOCTOR (POST-MORTEM investigation
protocol with 5-Whys structure), GAUGE (k6 template, baseline protocol, PERF report
format, regression justification ADR standard), TITAN (cloud abstraction interface
contracts, DRIFT-AUDIT), STEWARD (PRODUCTION-OWNERSHIP, BACKUP-VERIFY, ESCALATION-REVIEW
periodic modes), SENTINEL (COMPLIANCE-CHECK engineering half, DEPENDENCY-REVIEW periodic mode).

### Document templates

`TEMPLATES.md` added to `.claude/reference/`. Seven pipeline modes mandate output
documents but provided no structure. Templates now exist for: ANALYTICS-SCHEMA,
LEGAL-REVIEW, GDPR-REGISTER, SLO, THREAT-MODEL, QA-REPORT, COMPLIANCE-REPORT.

### Knowledge base seeded

11 canonical seed entries added to `KNOWLEDGE-BASE.md` covering the failure modes that
recur across projects regardless of product type.

### Post-v1.4 audit fixes (resolved after initial release)

A full cross-system audit surfaced 7 defects and 1 design inconsistency, all resolved:

**D1 — CLAUDE.md agent roster out of sync.** DOCTOR (missing CHAOS), SCHOLAR (missing
DRIFT-AUDIT, KB-COMPRESSION), and STEWARD (missing BACKUP-VERIFY, ESCALATION-REVIEW)
all had modes in their agent files that were absent from the CLAUDE.md roster. Fixed.

**D2 — LAUNCH-READY.md missing 3 sign-off sections.** STEWARD's gate required all 13
agents but the gate file only had 10 sign-off sections. DOCTOR, SCHOLAR, and COUNSEL
sign-off checklists added.

**D3 — Stale grounding-check reference in LAUNCH-READY.md BUILDER sign-off.** Replaced
with `tsc --noEmit passes, BUILDER G1–G5 grounding protocol followed`.

**D4 — GREENFIELD-PIPELINE.md RUNBOOK mode detail pointer wrong.** Pointed to
`DISASTER-RECOVERY MODE section` in DOCTOR.md — that section doesn't exist. Fixed to
`MODE: RUNBOOK section`.

**D5 — BROWNFIELD.md missing two modes.** CLAUDE.md declared `ARCHAEOLOGY` and
`BROWNFIELD-DEBT` in the brownfield pipeline sequence. Neither existed in BROWNFIELD.md.
Both now have full mode sections with protocols.

**D6 — README.md stated incorrect mode count.** Claimed 29 modes; actual count in
GREENFIELD-PIPELINE.md is 33. Fixed.

**D7 — TOOL-CONFIG.md `check-coverage.sh` absent from FILE-TREE.md.** The Go coverage
script defined in TOOL-CONFIG.md was not listed in the canonical scripts tree. Added
with a Go-only annotation.

**Q1 — ORACLE and COUNSEL declared LAUNCH-READY as a mode.** Inconsistent with all
other agents, which participate in LAUNCH-READY via their sign-off section in
LAUNCH-READY.md rather than as a declared pipeline mode. Removed from both Modes lines
(same treatment applied to ANALYST in an earlier pass).

---

### Structural improvements (post-audit)

A structural review of co-owned modes and content placement produced the following
changes. Nothing added — content reorganised to eliminate duplication and put each
piece of information in its natural home.

**Duplications eliminated**

*ADR FORMAT* was defined in both TITAN.md and FILE-TREE.md with diverged content.
FILE-TREE.md is now the single source. TITAN.md points to it.

*LAUNCH-READY sign-off checklists* existed in both LAUNCH-READY.md and inside four
agent files (TITAN, STEWARD, SENTINEL, COUNSEL). The agent-file versions had diverged.
LAUNCH-READY.md is now the single source — any items unique to agent files were merged
in first. Agent files now carry `Read(".claude/modes/LAUNCH-READY.md")` pointers only.
SENTINEL's sign-off block was also extracted from inside its COMPLIANCE-CHECK mode
section (wrong structural home) and placed as a standalone section at the end of the file.

*QUALITY_GATES templates* appeared in FILE-TREE.md, VERIFICATION-TIERS.md, and
TOOL-CONFIG.md with subtly different command strings. TOOL-CONFIG.md is now the single
source. FILE-TREE.md and VERIFICATION-TIERS.md point to it.

**Content placed correctly**

*STEWARD DISASTER-RECOVERY* was a 4-line thin wrapper that restated content fully owned
by DOCTOR.md. Replaced with a proper STEWARD incident protocol: numbered steps,
explicit STEWARD-does-NOT / DOCTOR-does-NOT division of responsibility, pointer to DOCTOR
for technical response. The communication/technical split is now unambiguous.

*Co-owned modes missing agent sections* — three modes were declared co-owned but had
execution content in only one agent file or only in the pipeline file:
- PLANNER (TITAN + BUILDER): both agent files now have `## MODE: PLANNER` sections with
  their respective roles — TITAN approves the execution graph, BUILDER produces it.
  Both cross-reference each other.
- COMPATIBILITY (ARTISAN + BUILDER): BUILDER.md now has `## MODE: COMPATIBILITY` covering
  functional correctness across environments (ARTISAN already had visual correctness).
- EVENT-STORM (ORACLE + TITAN): TITAN.md now has `## MODE: EVENT-STORM` covering TITAN's
  consumer role — mapping bounded contexts to architectural components, flagging integration
  event seams, confirming the context map before ORACLE moves to SPEC.

*SHARED FUNCTION REGISTRY* was referenced in 8 locations but had no template and no
defined home. Template added to TEMPLATES.md as `[SHARED-FUNCTION-REGISTRY]`. BUILDER.md
pre-flight checklist now points to it. FILE-TREE.md ARCHITECTURE.md entry updated to
surface that the registry lives there.

**Brownfield co-owned mode clarity**

Three of the five brownfield co-owned modes had no stated division of responsibility.
Each was treated differently based on its actual nature:

*CHARACTERIZE (BREAKER + BUILDER)* — explicit division added. BUILDER produces
characterization tests (Steps 1–4, commits baseline, declares ready). BREAKER
adversarially validates (hunts uncaptured edge cases, writes gap tests, issues a formal
PASS or GAPS FOUND verdict). The DO-NOT-TOUCH zone gate now attributes each item to
its owner with named sign-off.

*COMPLIANCE-GAP (SCHOLAR + SENTINEL)* — per-tier ownership added, not strict division.
SENTINEL owns TIER 0 and TIER 1 (security-critical items — injection, secrets, missing
auth, CVEs). SCHOLAR owns TIER 2 and TIER 3 (standards adoption — coverage ratchet,
circular dependencies, TypeScript strict mode). SCHOLAR produces COMPLIANCE-GAP.md;
SENTINEL reviews and can escalate any TIER 0/1 finding to non-negotiable. Document
ownership was previously unspecified — now explicit.

*ARCHAEOLOGY (TITAN + SCHOLAR)* — dual perspective note added rather than a formal split.
The investigation is continuous with no natural handoff point. Both agents run the full
6-step protocol together: TITAN observes for architectural implications (layer violations,
missing abstractions, C4 updates); SCHOLAR observes for code health signals (complexity,
coupling, safe seam reliability). Imposing a formal split would create artificial
mid-investigation handoffs that lose context in a brownfield session.

**Pipeline Detail pointer audit**

A full check of all 33 greenfield pipeline modes found 6 Detail pointers that were
wrong, incomplete, or missing — leaving an agent entering a mode without a reliable
read instruction for the execution content. All fixed in GREENFIELD-PIPELINE.md:

| Mode | Was | Now |
|---|---|---|
| ACCESSIBILITY | `→ Will Never + Escalate If sections` (wrong — no protocol there) | `→ ACCESSIBILITY Gate section` |
| COMPATIBILITY | `for visual correctness standards` (vague, no section name, only ARTISAN referenced) | `→ VISUAL COMPATIBILITY Gate section` + `→ MODE: COMPATIBILITY section` (BUILDER) |
| DRIFT-AUDIT | `Read(TITAN.md)` (no section specified) | `→ MODE: DRIFT-AUDIT section` + `→ DRIFT-AUDIT Mode section` (SCHOLAR) |
| SCAFFOLD | No Detail pointer | `→ MODE: SCAFFOLD section` |
| INTEGRATION | No Detail pointer | `→ MODE: INTEGRATION section` |
| TDD | `→ PRE-FLIGHT CHECKLIST section` (wrong — general checklist, not TDD protocol) | `→ MODE: TDD section` |

**Output document format coverage**

An audit of all 25 named output documents across all agent files found that 6 had no
format defined anywhere — agents would produce them with no structure to follow, causing
per-project drift. Each was assigned to the correct location based on an explicit rule
(also added to TEMPLATES.md header):

- **Agent file** — for documents produced by one agent in one mode where format and
  protocol belong together in a single read.
- **Pipeline file** — for documents populated incrementally one block at a time, where
  format and trigger appear at the same moment.
- **TEMPLATES.md** — for standalone deliverables that are gate-blocking, cross-agent,
  structurally stable, and potentially read outside the system.

The six gaps and how they were resolved:

`ARCHITECTURE.md` — gate-blocking, required by three downstream modes, no structure
existed. Full template added to TEMPLATES.md with 7 sections: style decision, C4 L1/L2/L3,
layer architecture, monorepo decision, file structure reference, SHARED FUNCTION REGISTRY,
DECISIONS LOCKED.

`INFRASTRUCTURE.md` — required before SLO-DESIGN, no structure existed. Full template
added to TEMPLATES.md with 7 sections: AI usage strategy, caching, queues, real-time,
multi-tenancy, cloud abstraction interfaces, cost model.

`EXPERIMENTS.md` — listed in ORACLE and ANALYST `Can write` lists with no format anywhere.
Template added to TEMPLATES.md with active/completed/archived structure, hypothesis format,
decision recording, and learnings routing to KNOWLEDGE-BASE.md.

`EVENT-STORM.md` — gate required five elements but gave no section headings. Format added
directly to ORACLE.md's EVENT-STORM mode section (agent-file placement — format integral
to protocol). Seven named sections: Domain Events, Commands, Aggregates, Bounded Contexts,
Domain Services, Integration Events, Context Map.

`INTAKE-REPORT.md` — structure was scattered across three places in BROWNFIELD.md's
INTAKE mode. Consolidated into a single `### INTAKE-REPORT.md REQUIRED STRUCTURE` block
with five sections (Inventory Summary, Architecture Map, Health Scores, DO-NOT-TOUCH
Zones, ARCHAEOLOGY Findings). The duplicate ARCHAEOLOGY format block in the ARCHAEOLOGY
mode was removed and replaced with a pointer back to this structure.

`COMPLIANCE-GAP.md` — had a one-line format hint. Promoted to a full `### COMPLIANCE-GAP.md
REQUIRED STRUCTURE` block with a table per tier, per-tier ownership (SENTINEL for TIER
0/1, SCHOLAR for TIER 2/3), and an Adoption Progress tracking section.

TEMPLATES.md now has **11 templates** and a `## LOCATION RULE` section at the top
that makes the three-way placement decision explicit for any future additions.

---

### v1.5 changes

A second architecture audit identified nine improvement areas across five categories.
All changes are backwards-compatible — v1.4 projects can adopt v1.5 incrementally.

**CONTEXT.md size fixes**

The 200-line cap was under structural pressure from three directions: ~65 comment instruction
lines that are permanent overhead, DECISIONS LOCKED growing unboundedly (every architectural
decision accumulates permanently), and REQUIREMENT CHANGELOG IMPLEMENTED entries never being
archived. Together these consumed most of the working budget before a single real project entry
was written.

Three targeted changes recover headroom: comment instructions stripped from CONTEXT.md and
replaced with one-line pointers to owning reference files (~55 lines recovered); DECISIONS LOCKED
externalised to ARCHITECTURE.md (CONTEXT.md carries a pointer only — the section can no longer
grow in CONTEXT.md); MEMORY-TRIAGE Step 5 updated so IMPLEMENTED changelog entries archive
immediately to CONTEXT-ARCHIVE.md rather than accumulating. Line cap raised to 250. Compression
trigger updated to 220.

**KNOWLEDGE-BASE.md structural fix**

The compression algorithm had a mathematical convergence problem: ALL security entries and ALL
CRITICAL entries were kept permanently in a file capped at 300 lines. On any security-sensitive
production project, these permanent entries alone exceed the cap within 10 sprints.

KNOWLEDGE-BASE.md is now a **working reference** (max 200 lines) containing only actively
relevant entries. A new `KNOWLEDGE-ARCHIVE.md` (no cap, append-only) holds the permanent record
— all CRITICAL and security entries graduate there after 3 sprints. An ARCHIVE INDEX section
allows targeted section reads without loading the full archive. MEMORY-TRIAGE KB compression
rewritten with a graduation algorithm (Steps A–D) replacing the impossible `<250 line` target.

**Lazy-load pipeline**

GREENFIELD-PIPELINE.md was ~10K tokens and loaded in full on every session, but a typical
session uses only 3–5 of the 33 mode entries. ~81% of the file was loaded and never read.

A `## PIPELINE HEADER END` marker was added at line 33 of GREENFIELD-PIPELINE.md, separating
the ~1K-token header (sequence, PIPELINE RESUME, parallelism notes) from the 33 mode entries.
CLAUDE.md PIPELINE REFERENCE updated to a two-step lazy load: header at session startup,
`MODE: [name] section` on each mode entry. All 13 agent files updated with per-agent mode
section pointers replacing the former single full-file read instruction.
Token savings: ~9K tokens per session recovered.

**Gate skip mechanism (replaces dropped PROTOTYPE profile)**

Rather than a named "prototype profile" that legitimises bypassing safety gates, the existing
skip mechanism was strengthened into a structured, auditable, expiry-aware system. A `## GATE
SKIP FORMAT` section in GREENFIELD-PIPELINE.md defines a 5-field structured log entry
(PERMANENT vs DEFERRED types, trigger condition, owner, risk). A `## FAST-START SKIP SET`
section names the 9 gates commonly deferred in early builds and 7 commonly permanent for
API-only products, plus a hard list of gates that cannot be skipped under any circumstances.
`## GATE SKIPS` section added to CONTEXT.md. SESSION STARTUP step 4.8 surfaces DEFERRED skips
when their trigger condition fires. LAUNCH-READY STEWARD sign-off now blocks on any unresolved
DEFERRED skip.

**APEX-BUILT pipeline profiles**

Apex previously had no lifecycle support for systems it built. There was no named path for
adding a feature to a running Apex system (which doesn't need INTAKE, EVENT-STORM, or
ARCHITECT) or for fixing a production incident (which needs speed, not a 33-gate pipeline).

Three new files and taxonomy:
- **Codebase states** are now formally named: GREENFIELD (no src/), BROWNFIELD (src/ exists, not
  built by Apex), APEX-BUILT (src/ exists, ARCHITECTURE.md + .claude/ folder present)
- **APEX-BUILT.md** — two profiles: FEATURE (SPEC DELTA concept, 14-mode mandatory gate sequence,
  named skip justifications) and HOTFIX (3 hard constraints, 4-mode gate sequence, COMPRESSED-
  LAUNCH-READY with pre-deploy mandatory + post-deploy 24h sign-offs)
- **PIPELINE-PROFILES.md** — lifecycle overview: decision tree, 5-profile summary table, graduation
  paths between all three codebase states
- **LAUNCH-READY.md** — HOTFIX Compressed Sign-off section added with three named pre-deploy
  sign-offs and post-deploy 24h window
- CLAUDE.md SESSION STARTUP step 3 updated to four-state detection with Apex artefact definition
- GREENFIELD-PIPELINE.md PIPELINE SEQUENCE renamed to PRODUCTION profile

**Quality metrics circuit breaker**

The VERIFY pass rate metric previously adjusted BUILDER's confidence mode but had no structural
enforcement. A <60% pass rate now triggers a hard circuit breaker: BUILDER must write each
file's plan to CONTEXT.md EXECUTION PLAN and wait for TITAN to write a named confirmation
(`TITAN REVIEWED: [filename] — [ISO date]`) before writing any code. Changes in CLAUDE.md step
4.7 and BUILDER.md PRE-FLIGHT CHECKLIST.

**CI/CD template**

Apex specified verification tiers but left the translation to CI YAML entirely to the developer.
`CI-TEMPLATE.md` added to `.claude/reference/` — ready-to-use GitHub Actions YAML (three jobs
mapping exactly to Apex's three verification tiers), GitLab CI secondary, customisation guide
for all stacks. FILE-TREE.md updated with `.github/workflows/apex.yml` canonical entry.

**SESSION STARTUP gaps closed**

Two minor gaps from v1.4 resolved in a single step 1 edit: branch context file
(`CONTEXT-{feature}.md`) is now explicitly loaded alongside root CONTEXT.md at startup for
multi-developer projects; SESSION CONTEXT BUDGET is updated immediately after loading files
rather than relying on manual update.

---

### Architecture audit (post-structural review)

A Karpathy-style architecture audit of v1.4 across six dimensions identified 19 gaps
(4 critical/high in enforcement, 5 in cloud abstraction, 4 in agent hand-offs, 4 in
system observability, 3 in multi-engineer support, 2 in prototype/production scope).
All gaps rated critical through medium have been resolved. The changes below are
organised by audit section.

**1 — Enforcement infrastructure**

Three real bugs were found and fixed across the verification scripts:

The vitest coverage config in `TOOL-CONFIG.md` had a duplicate `lines` key — JavaScript's
last-value-wins rule meant the effective global coverage floor was silently 60%, not 80%.
Fixed: `perFile` is now a nested object `{ lines: 60, functions: 60, statements: 60 }`
alongside the unchanged global thresholds.

`fitness-check.sh` RULE 3 and RULE 4 passed a full path to `--exclude-dir`, which takes
a basename pattern only. Provider and analytics SDK imports inside `lib/` were being
flagged as violations. Fixed: replaced `grep --exclude-dir` with a `find -prune` approach
that is precise and portable across Linux and macOS.

`hygiene-check.ts` used `relPath.includes(dir)` for exclusion — a substring match that
could silently skip files whose paths happened to contain an excluded directory name as a
substring. Fixed: path-segment-aware prefix check using `startsWith` and `includes('/' + normDir)`.

`generate-openapi.ts` appeared in the Tier 3 CI command block with no spec or
implementation guidance. Fixed: made conditional (commented out) in VERIFICATION-TIERS.md
with a note; full spec added to SCRIPTS.md as an optional script section covering purpose,
input/output, failure modes, and implementation steps.

**2 — Cloud abstraction interfaces**

All four interface contracts in `TITAN.md` were incomplete for production use.

`DatabaseClient` was a raw SQL-only interface — incompatible with ORM-based projects.
Now provides two variants: Variant A (raw SQL with `queryStream` and `batchInsert`) and
Variant B (ORM repository with `PaginatedResult<T>` and cursor-based pagination). TITAN
chooses one at ADR time; the other is not implemented.

`AIClient` returned a buffered `Promise` with no streaming or tool calling. Now exports
`stream()` returning `AsyncIterable`, `completeWithTools()` with `AITool`/`AIToolCall`
types, and `embed()` accepting `string | string[]`. The `ZodSchema` import dependency is
made explicit. Implementation notes cover validation, streaming error handling, tool
input validation, and cost logging.

`StorageClient` was missing `list()` and streaming download. Now exports `list()` with
cursor pagination via `StorageListResult`, `downloadStream()`, and a documented note that
multipart upload is a provider extension requiring an ADR.

`CacheClient` was missing atomic operations. Now exports `increment`, `decrement`,
`setIfNotExists`, `expire`. Redis-protocol specificity is documented explicitly.
`invalidatePattern` is noted as Redis SCAN semantics — not available on all providers.
Rate limiting pattern example added.

The manual quarterly "can this infrastructure be reproduced?" one-liner was replaced by
a formal checklist in TITAN's DRIFT-AUDIT section with a `PROVIDER-SWAP-CHECK` log format.

**3 — Agent hand-offs**

Veto resolution had no protocol for five of the six veto holders. GAUGE already had an
ADR-based override model. The same pattern was applied to all five remaining agents:
SENTINEL (cannot be overridden — security risk acceptance requires human sign-off, 48h
age limit triggers STEWARD escalation), ARTISAN (redesign or ORACLE descope, 3-day age
limit), QUILL (lowest friction — 24h limit, QUILL writes copy directly if unresolved),
COUNSEL (cannot be overridden, human lawyer required for material findings, 24h limit),
BREAKER (3-loop exhaustion format with structured escalation block to TITAN).

Four transitions were identified where structured handoff payloads are needed because
implicit assumptions do not transfer through gate documents:

*TDD → BUILDER*: BUILDER.md MODE: TDD section now ends with a mandatory `TDD HANDOFF`
block written to CONTEXT.md before switching modes — covering failing test count, which
SPEC scenarios are addressed, mocked calls, deliberately excluded edge cases, and baked-in
assumptions.

*BUILDER → VERIFY*: BUILDER.md POST-WRITE CHECKLIST now ends with a `BUILDER → VERIFY
HANDOFF` block — covering what was implemented, which scenarios BUILDER tested, mocked
calls, deferred edge cases, confidence level, and a `Probe here` field directing BREAKER's
attention to where BUILDER was least certain.

*VERIFY PASS → next mode*: BREAKER.md Output section now has a structured PASS format
alongside the existing FAIL format — recording vectors tested, categories covered,
anything notable, skipped items with reasons, and confidence level.

*Any mode → next session*: CONTEXT.md gained a `LAST SESSION SUMMARY` section written
at session end. CLAUDE.md SESSION STARTUP gained steps 4.5 (read last session summary,
verify interrupted tasks, apply next action) and 4.6 (surface BLOCKED tasks before work).
GREENFIELD-PIPELINE.md gained a `## PIPELINE RESUME` section with a 6-step protocol for
re-entering a partially completed pipeline.

**4 — System observability**

Three observability gaps resolved across four files.

Token budget awareness: CONTEXT.md gained a `SESSION CONTEXT BUDGET` field for estimating
load per file type and tracking GREEN/YELLOW/RED status. CLAUDE.md gained a `CONTEXT BUDGET`
prime directive with explicit behaviour at each threshold (YELLOW: complete task + surface
to human; RED: finish current file only, write summary, stop). MEMORY-TRIAGE.md gained
Step 0 — a budget check before the triage algorithm that prevents running compression
when the context is already RED.

Quality metrics feedback loop: CONTEXT.md's AGENT QUALITY METRICS section now has inline
threshold rules (VERIFY pass rate <60% → BUILDER LOW confidence mode; miscalibrations ≥3
→ MED floor; bug escapes ≥2 → DEBT-AUDIT triggered) and a full update protocol naming
which agent updates each metric and when. CLAUDE.md SESSION STARTUP gained step 4.7 to
read these thresholds and apply behavioural adjustments before the first BUILDER task.

Apex health check: SCRIPTS.md gained `## APEX HEALTH CHECK` — a runnable bash diagnostic
that verifies all 27 required files are present, scripts exist, QUALITY_GATES are
configured, and both scripts pass self-tests. Exits 0 regardless (diagnostic, not gate).

**5 — Multi-engineer support**

The previous multi-developer section was four lines. It has been replaced with a
structured two-tier protocol across three files.

CONTEXT.md's role is now explicitly split: in multi-developer projects it holds shared
state only (DECISIONS LOCKED, ISSUES OPEN, AGENT QUALITY METRICS). Branch-specific state
(EXECUTION PLAN, DEPENDENCY LOCKS, REQUIREMENT CHANGELOG, LAST SESSION SUMMARY, and all
current work fields) lives in a `CONTEXT-{feature}.md` file on the feature branch.

CLAUDE.md HUMAN TEAM COORDINATION now covers: solo developer path (explicit no-op
confirmation), shared vs branch-specific section taxonomy, 5-step branch context creation
procedure, three typed conflict protocols with named resolution owners (file lock → surface
to team; DECISIONS LOCKED conflict → TITAN + ADR required; REQUIREMENT CHANGELOG conflict
→ ORACLE resolves), and a 7-step PR merge archival procedure.

MEMORY-TRIAGE.md gained `## STEP 7 — Sprint Boundary Merge (multi-developer only)` — a
deterministic section-by-section merge algorithm covering REQUIREMENT CHANGELOG (merge by
date with conflict flagging to ORACLE), DECISIONS LOCKED (union with PR-blocking conflict
escalation to TITAN), DECISIONS THIS SESSION (Step 1 promotion criteria applied before
touching DECISIONS LOCKED), ISSUES OPEN (merged + re-scored, top 10 kept), AGENT QUALITY
METRICS (aggregated with weighted averages), EXECUTION PLAN (discarded — next PLANNER
writes fresh), DEPENDENCY LOCKS (must be zero before PR allowed), session-scoped sections
(discarded), and branch context archival to CONTEXT-ARCHIVE.md.

```
CLAUDE.md                   ← READ THIS EVERY SESSION (~270 lines)
CONTEXT.md                  ← Session state (max 250 lines, comment-stripped)
                               DECISIONS LOCKED pointer only — content lives in ARCHITECTURE.md
                               Multi-developer: shared state only. Branch state in CONTEXT-{feature}.md.
KNOWLEDGE-BASE.md           ← Working reference — active lessons (max 200 lines)
KNOWLEDGE-ARCHIVE.md        ← Permanent record — graduated + CRITICAL + security entries (no cap)

.claude/
  agents/                   ← Load when activating that agent (all 13 have lazy-load Orchestration)
    ORACLE.md               ← Product Intelligence
    TITAN.md                ← Architecture + Infrastructure (incl. 4 typed cloud abstraction interfaces)
    SENTINEL.md             ← Security (incl. veto resolution protocol)
    BUILDER.md              ← Implementation (incl. TDD→BUILDER and BUILDER→VERIFY handoff formats)
    BREAKER.md              ← Adversarial QA (incl. structured VERIFY PASS format)
    DOCTOR.md               ← Incident + Reliability
    SCHOLAR.md              ← Technical Health
    GAUGE.md                ← Performance + Cost
    ARTISAN.md              ← Design (incl. veto resolution protocol)
    QUILL.md                ← Content + Copy (incl. veto resolution protocol)
    STEWARD.md              ← Production Ownership
    ANALYST.md              ← Business Intelligence
    COUNSEL.md              ← Legal + Compliance (incl. veto resolution protocol)
  modes/
    BROWNFIELD.md           ← Load for any brownfield mode
    LAUNCH-READY.md         ← Load when entering launch gate (incl. HOTFIX Compressed Sign-off)
    GREENFIELD-PIPELINE.md  ← PRODUCTION profile — lazy-load: header at startup, MODE: section per entry
    APEX-BUILT.md           ← NEW: FEATURE + HOTFIX profiles for Apex-built systems
    PIPELINE-PROFILES.md    ← NEW: lifecycle overview — profile selection + graduation paths
  reference/
    FILE-TREE.md            ← Canonical file tree + stack configs + ADR template
    MEMORY-TRIAGE.md        ← Memory compression (Steps 0–7 incl. KB graduation + sprint boundary merge)
    VERIFICATION-TIERS.md   ← Tiered self-healing protocol (Tier 1/2/3)
    ANALYTICS-PROTOCOL.md   ← Analytics engineering standard
    TEMPLATES.md            ← Starter templates for all 11 mandated output documents + location rule
    SCRIPTS.md              ← hygiene-check.ts + fitness-check.sh + Apex health check
    TOOL-CONFIG.md          ← Native coverage + lint config for TypeScript, Python, Go
    CI-TEMPLATE.md          ← NEW: GitHub Actions + GitLab CI pipeline template (three-tier)
```

---

## How to use

### New project (GREENFIELD — no existing codebase)
1. Copy this folder to your project root.
2. Claude reads `CLAUDE.md` at session start.
3. Claude detects no `CONTEXT.md` + no `src/` → GREENFIELD. Activates ORACLE → SPEC mode.
4. **Full PRODUCTION pipeline:** `Read(".claude/modes/GREENFIELD-PIPELINE.md")` → PIPELINE HEADER
   section at startup, then `→ MODE: [name] section` on each mode entry.
5. **Exploratory / time-constrained build:** same pipeline, but log deferred gates in CONTEXT.md
   using the FAST-START SKIP SET format. Read: `GREENFIELD-PIPELINE.md → FAST-START SKIP SET`.
   Set `Pipeline profile: PRODUCTION` in CONTEXT.md regardless — it's the same pipeline with
   documented skips, not a separate mode.

### Existing non-Apex codebase (BROWNFIELD — src/ exists, not built by Apex)
1. Copy this folder to your project root.
2. Claude detects `src/` exists but no `ARCHITECTURE.md` or no `.claude/` folder → BROWNFIELD.
3. Activates TITAN + SCHOLAR → INTAKE mode. Load: `Read(".claude/modes/BROWNFIELD.md")`
4. After INTAKE + COMPLIANCE-GAP TIER 3 complete: codebase graduates to APEX-BUILT.
   TITAN documents graduation in `ARCHITECTURE.md → DECISIONS LOCKED`.
   See: `Read(".claude/modes/PIPELINE-PROFILES.md")` → graduation paths.

### Adding a feature to an Apex-built system (APEX-BUILT / FEATURE)
1. Claude detects `src/` + `ARCHITECTURE.md` + `.claude/` folder → APEX-BUILT.
   Or: CONTEXT.md exists with `Pipeline profile: FEATURE`.
2. Load: `Read(".claude/modes/APEX-BUILT.md")` → PROFILE: FEATURE section.
3. Run SPEC DELTA (amend existing SPEC.md, do not create a new one), then follow the
   FEATURE gate sequence — shorter than PRODUCTION, skips architecture setup modes.
4. Full LAUNCH-READY still required.

### Fixing a production issue (APEX-BUILT / HOTFIX)
1. Set `Pipeline profile: HOTFIX` in CONTEXT.md before starting.
2. Load: `Read(".claude/modes/APEX-BUILT.md")` → PROFILE: HOTFIX section.
3. Hard constraints: max 3 files, max 2h, reproduction test required before any code.
4. COMPRESSED-LAUNCH-READY: 3 agents pre-deploy, remaining 10 within 24h post-deploy.
5. POST-MORTEM mandatory regardless of P-level. Follow-up FEATURE PR within next sprint.

### Incremental feedback mid-session
Claude immediately acknowledges the change, logs it to `CONTEXT.md` under
`## REQUIREMENT CHANGELOG` with status `ACTIVE`, and applies it. ACTIVE entries
override the original PRD. At every subsequent session start, the changelog is
re-read before any work begins. This directly solves the feedback-ignored problem.

### Multi-developer projects
Two CONTEXT files are used — one per concern:
- **Root `CONTEXT.md`** (shared): ISSUES OPEN, AGENT QUALITY METRICS, DECISIONS LOCKED pointer.
- **`CONTEXT-{feature}.md`** (branch): phase, locks, execution plan, requirement changelog.
Create the branch context file at the start of each feature branch. Archive it on PR merge
using MEMORY-TRIAGE Step 7. See `CLAUDE.md → HUMAN TEAM COORDINATION` for the full protocol.

### Session end
At session end Claude runs `MEMORY-TRIAGE.md Steps 0–6`:
- Promotes qualifying decisions to `ARCHITECTURE.md → DECISIONS LOCKED`
- Archives IMPLEMENTED changelog entries to `CONTEXT-ARCHIVE.md`
- Triages ISSUES OPEN (max 10 by score)
- Writes KNOWLEDGE-BASE.md entries for notable learnings
- Writes `LAST SESSION SUMMARY` in CONTEXT.md for the next session
- Compresses CONTEXT.md if it exceeds 220 lines (cap: 250)
- Releases DEPENDENCY LOCKS

Separately, SCHOLAR runs KB COMPRESSION quarterly: stable entries graduate from
`KNOWLEDGE-BASE.md` (working reference, max 200 lines) to `KNOWLEDGE-ARCHIVE.md`
(permanent record, no cap). See `MEMORY-TRIAGE.md → KB COMPRESSION`.

---

## Verification quick reference

| When | Runs | Configured in |
|---|---|---|
| After every file write (Tier 1, ~5s) | eslint + hygiene-check.ts | QUALITY_GATES in CONTEXT.md |
| Before every git commit (Tier 2, ~60s) | tsc --noEmit + tests + coverage + sonarjs | QUALITY_GATES + TOOL-CONFIG.md |
| Before PR merge (Tier 3, CI) | Full suite + fitness-check.sh + npm audit | CI pipeline |

Set up at SCAFFOLD time:
- Copy `hygiene-check.ts` from `SCRIPTS.md` → `scripts/hygiene-check.ts`
- Copy `fitness-check.sh` from `SCRIPTS.md` → `scripts/fitness-check.sh`
- Copy coverage threshold config from `TOOL-CONFIG.md` → `vitest.config.ts` / `pyproject.toml`
- Set QUALITY_GATES in `CONTEXT.md` using templates in `TOOL-CONFIG.md`

---

## Intentional scope exclusions
- **i18n/l10n** — add to CONTEXT.md DECISIONS LOCKED when relevant
- **Mobile/native (React Native, Capacitor)** — add mobile-specific ADR if needed
- **Agent merges** (QUILL→ARTISAN, SCHOLAR→BUILDER) — identified as simplification opportunities; deferred as architectural decisions requiring ADR, not gap fixes
