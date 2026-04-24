# GREENFIELD-PIPELINE.md — Mode Orchestration Reference
# Load: Read(".claude/modes/GREENFIELD-PIPELINE.md") when entering any greenfield mode
# Referenced from: CLAUDE.md PIPELINE REFERENCE
# Author: Ashish Khandelwal, Arup Kolay | Apex Runtime v1.4
================================================================================
# THIS FILE IS ORCHESTRATION, NOT EXECUTION.
# It defines: sequence, gates, agent assignments, entry conditions, output artifacts.
# Execution detail (checklists, formats, protocols) lives in the agent file.
# When a mode is entered: read this file for the gate, then read the agent file for the how.
================================================================================

## PIPELINE SEQUENCE — PRODUCTION profile (full system, going to production)

EVENT-STORM → SPEC → CRITIC → ARCHITECT → ADR → API-DESIGN → SECURITY
→ INFRA-DESIGN → SLO-DESIGN → OBSERVABILITY → BUSINESS-METRICS
→ ESCALATION-TREE → COMPLIANCE-LEGAL → DESIGNER → CONTENT → RUNBOOK
→ IaC → SCAFFOLD → PLANNER → TDD → BUILDER → DESIGN-REVIEW → ACCESSIBILITY
→ REVIEW → VERIFY → PERF → DRY-AUDIT → INTEGRATION → QA → COMPATIBILITY
→ DRIFT-AUDIT → COMPLIANCE-CHECK → LAUNCH-READY

Notes on parallelism (only where explicitly stated):
  DESIGNER runs in parallel with SECURITY / INFRA-DESIGN (post-CRITIC)
  ADR runs alongside and after ARCHITECT (not a blocker on its own)
  DESIGN-REVIEW and ACCESSIBILITY run per UI file during the implementation loop,
    not as a single phase — they gate each UI component before REVIEW proceeds
  COMPLIANCE-CHECK runs as both: (1) a pre-LAUNCH-READY pipeline gate (below)
    and (2) a monthly periodic audit (periodic section)

Skipping a gate = documented risk acceptance logged in CONTEXT.md. Own the consequence.
For non-full-pipeline work: Read(".claude/modes/PIPELINE-PROFILES.md")

================================================================================
## PIPELINE HEADER END
# Everything above this marker is the PIPELINE HEADER — load at session startup (~1K tokens).
# Everything below (33 mode entries) is loaded on demand: one MODE: section per mode entry.
# Load instruction: Read(".claude/modes/GREENFIELD-PIPELINE.md") → MODE: [name] section
================================================================================

================================================================================
## PIPELINE RESUME
When a session ends mid-pipeline (context exhaustion, interruption, or abrupt stop),
the next session follows this protocol before doing any other work:

1. Read CONTEXT.md LAST SESSION SUMMARY → identify Left mid task and Next action.
2. Check EXECUTION PLAN → find the last DONE task. Verify its output file exists
   and is Tier 2 green. Do not trust the status field without checking the file.
3. If the interrupted task's output is partial or suspect:
   Restart that mode from the beginning. Do not attempt to resume mid-mode.
   Re-running a complete mode is faster and safer than debugging a partial output.
4. If the interrupted task left a DEPENDENCY LOCK open:
   Check whether the locked file is in a consistent state (Tier 2 green).
   - If yes: release the lock, mark the task DONE, continue to the next task.
   - If no: discard the partial work, release the lock, restart the task.
5. Declare in CONTEXT.md before resuming:
   `PIPELINE RESUME [ISO date]: last completed [mode/task] — restarting from [mode/task]`
6. Update LAST SESSION SUMMARY with the current session's agent and next action
   at the end of this session, so the pattern continues cleanly.

Rule: never silently continue from where the last session left off without completing
steps 1–5. Unverified intermediate state is the most common source of subtle bugs
in multi-session builds.
================================================================================

================================================================================
## GATE SKIP FORMAT
Every skipped gate must be logged in CONTEXT.md → GATE SKIPS using this exact format.
Free-text skip notes are not accepted — they are undetectable by step 4.8 and by LAUNCH-READY.

```
GATE SKIP: [mode name] | [ISO date]
  Reason:   [specific reason — not "too early" or "not applicable"]
  Type:     [PERMANENT: gate genuinely does not apply to this project |
             DEFERRED: must be completed before specific trigger fires]
  Trigger:  [DEFERRED only: the exact condition that re-activates this gate —
             "before first production user" | "before connecting real data" |
             "before LAUNCH-READY" | "before adding [specific feature]"]
  Owner:    [agent who must sign off when trigger fires]
  Risk:     [what could go wrong by skipping — one sentence]
```

PERMANENT skip: the gate genuinely does not apply (e.g. DESIGNER for an API-only product).
  No trigger needed. Owner signs off once at skip time. Never surfaces again.

DEFERRED skip: the gate is temporarily bypassed. Trigger fires → gate must run before
  any other work that session. See CLAUDE.md SESSION STARTUP step 4.8.

Gates that cannot be skipped or deferred under any circumstances:
  SPEC | CRITIC | ARCHITECT | SECURITY (any route touching auth/payments/PII) |
  TDD | BUILDER | VERIFY | LAUNCH-READY

================================================================================
## FAST-START SKIP SET
For early exploratory or time-constrained builds. Each gate below still requires a
formal GATE SKIP entry in CONTEXT.md — use DEFERRED type with trigger stated explicitly.
Skipping without a logged entry is a protocol violation detectable at LAUNCH-READY.

Gates commonly DEFERRED (trigger: "before first production user"):
  EVENT-STORM      — if single bounded context (see Skip if: condition on the mode)
  INFRA-DESIGN     — defer full cloud abstraction until architecture stabilises
  SLO-DESIGN       — no SLOs until you know what you are optimising
  OBSERVABILITY    — minimal logging acceptable until feature shape is known
  BUSINESS-METRICS — skip only if no analytics requirement yet confirmed
  COMPLIANCE-LEGAL — defer if no user data collected in early build
  ESCALATION-TREE  — defer until production owner is named
  RUNBOOK          — defer until SLO tiers are assigned to services
  IaC              — defer if using temporary infrastructure for exploration

Gates commonly PERMANENT (with justification required):
  DESIGNER / DESIGN-REVIEW / ACCESSIBILITY / COMPATIBILITY / CONTENT
  → for API-only products with no user-facing UI (state this explicitly in the skip entry)
  QUILL → if no user-facing copy exists in v1

================================================================================
## PHASE 1 — DOMAIN + PRODUCT
================================================================================

### MODE: EVENT-STORM [AGENT: ORACLE + TITAN]
Entry condition: system has >3 bounded contexts, complex business rules, or
                 event-driven architecture.
Skip if:         simple CRUD product with a single bounded context — document skip
                 reason in CONTEXT.md and proceed directly to SPEC.
Gate:            EVENT-STORM.md exists with: domain events (past tense), commands,
                 aggregates, bounded contexts, context map.
Output:          EVENT-STORM.md → feeds directly into ARCHITECT mode.
Detail:          Read(".claude/agents/ORACLE.md") → EVENT-STORM section.

---

### MODE: SPEC [AGENT: ORACLE]
Entry condition: EVENT-STORM complete or skipped with documented reason.
Gate:            SPEC.md exists with all required sections — problem statement,
                 user types (max 4), user flows (GIVEN/WHEN/THEN), INVARIANTS,
                 success metrics, non-functional requirements, out-of-scope list,
                 riskiest assumptions with validation plans.
Hard block:      no ARCHITECT mode until SPEC passes CRITIC.
Output:          SPEC.md
Detail:          Read(".claude/agents/ORACLE.md") → SPEC section.

---

### MODE: CRITIC [AGENT: ORACLE]
Entry condition: SPEC.md complete.
Gate:            CRITIC verdict is PASS. Every BLOCKING finding resolved.
                 No contradictions. All user type conflicts resolved.
Hard block:      no ARCHITECT, no ADR, no code until CRITIC PASS is logged
                 in CONTEXT.md.
Output:          CRITIC verdict in CONTEXT.md. SPEC.md updated with any deltas.
Detail:          Read(".claude/agents/ORACLE.md") → CRITIC section.

================================================================================
## PHASE 2 — ARCHITECTURE
================================================================================

### MODE: ARCHITECT [AGENT: TITAN]
Entry condition: CRITIC PASS on SPEC.md.
Gate:            ARCHITECTURE.md exists with: architecture style decision,
                 C4 Level 1 + Level 2, layer architecture (Route→Service→Repo→DB),
                 file structure reference, monorepo/polyrepo decision.
Hard block:      no IaC, no SCAFFOLD, no BUILDER until ARCHITECTURE.md complete.
Output:          ARCHITECTURE.md
Detail:          Read(".claude/agents/TITAN.md") → ARCHITECT MODE section.

---

### MODE: ADR [AGENT: TITAN]
Entry condition: runs alongside and after ARCHITECT. One ADR per major decision.
Gate:            every major decision in ARCHITECTURE.md has a corresponding ADR
                 in docs/adr/. Minimum ADRs: architecture style, monorepo/polyrepo,
                 primary database, auth approach.
Output:          docs/adr/[NNN]-[slug].md (one per decision)
Format:          Read(".claude/agents/TITAN.md") → ADR FORMAT section.
Template:        Read(".claude/reference/FILE-TREE.md") → ADR TEMPLATE section.

---

### MODE: API-DESIGN [AGENT: TITAN]
Entry condition: ARCHITECT complete. Before any route implementation.
Gate:            API-DESIGN.md exists. Every endpoint defined before BUILDER
                 writes a single route.
Hard block:      BUILDER cannot implement any route without a matching entry
                 in API-DESIGN.md.

API-DESIGN.md entry format (one block per endpoint):
```
[METHOD] /api/v[N]/[resource]
Auth:        [public | bearer | role:x | service-to-service]
Request:     { field: type, constraint, max_length }
Response:    { field: type } | [error shape]
Errors:      [every status code and its trigger condition]
Rate limit:  [req/min per user | per IP | per tenant]
Idempotent:  [yes: Idempotency-Key header required | no]
AI usage:    [yes: cacheable? estimated tokens per call | no]
SLO tier:    [CRITICAL | STANDARD | BACKGROUND]
Perf target: [p50 target | p99 target — contractual, not aspirational]
Breaking:    [yes: requires major version bump | no]
```

Pagination contract (all list endpoints):
  Cursor-based: { data: T[], next_cursor: string | null, has_more: boolean }
  Never offset-based on large datasets (>10K rows). Document strategy per endpoint.

API versioning rule:
  All routes prefixed /api/v[N]/. Breaking change = new version, old deprecated
  with sunset date in API-DESIGN.md and Deprecation header in responses.

Output: API-DESIGN.md — approved by TITAN before any BUILDER session begins.

================================================================================
## PHASE 3 — SECURITY + INFRASTRUCTURE
================================================================================

### MODE: SECURITY [AGENT: SENTINEL]
Entry condition: ARCHITECT + API-DESIGN complete.
Gate:            THREAT-MODEL.md complete. STRIDE assessed per component.
                 All HIGH residual risks mitigated or formally accepted with
                 documented justification. OWASP Top 10 checklist run.
Hard block:      no new external service, no auth code, no AI feature, no payment
                 code without SENTINEL sign-off. SENTINEL veto pauses all agents.
Output:          THREAT-MODEL.md
Detail:          Read(".claude/agents/SENTINEL.md") → STRIDE + OWASP sections.

---

### MODE: INFRA-DESIGN [AGENT: TITAN]
Entry condition: SECURITY complete.
Gate:            INFRASTRUCTURE.md exists with: AI usage strategy per feature,
                 cost model, real-time infrastructure plan (if applicable),
                 multi-tenancy infrastructure (if applicable), cloud abstraction
                 interfaces defined, data portability scripts planned.
Output:          INFRASTRUCTURE.md
Detail:          Read(".claude/agents/TITAN.md") → CLOUD AGNOSTIC STRATEGY
                 and OBSERVABILITY-DRIVEN DEVELOPMENT sections.

---

### MODE: SLO-DESIGN [AGENT: TITAN]
Entry condition: INFRA-DESIGN complete.
Gate:            SLO.md exists. Every endpoint in API-DESIGN.md has an assigned
                 SLO tier. Error budgets defined. Alert thresholds set.
Output:          SLO.md
Detail:          Read(".claude/agents/TITAN.md") → SLO-DESIGN MODE section.

---

### MODE: OBSERVABILITY [AGENT: TITAN]
Entry condition: SLO-DESIGN complete. Runs before any BUILDER session.
Gate:            OBSERVABILITY.md exists. For every feature: trace spans, metrics
                 (business + technical + cost), log events, alert thresholds, and
                 on-call dashboard defined.
Rule:            If you cannot define observability for a feature, you do not
                 understand it well enough to build it.
                 BUILDER cannot start a feature without its observability spec.
Output:          OBSERVABILITY.md

OBSERVABILITY.md entry format (one block per feature):
```
Feature:  [name]
Trace:    [parent span] → [child spans] | Attributes: [key fields to tag]
Metric:
  Business:  [e.g. orders_placed_total] | Alert: [threshold + response]
  Technical: [e.g. api_latency_p99]     | Alert: [SLO breach threshold]
  Cost:      [e.g. ai_tokens_consumed]  | Alert: [80% of monthly budget]
Log:      [events that produce log lines] | Level: [INFO|WARN|ERROR] | Fields: [list]
Dashboard: [what on-call engineer sees first when this feature is broken]
```

================================================================================
## PHASE 4 — BUSINESS + LEGAL + DESIGN
================================================================================

### MODE: BUSINESS-METRICS [AGENT: ANALYST]
Entry condition: SLO-DESIGN complete.
Gate:            BUSINESS-METRICS.md exists with leading/lagging indicators,
                 baselines, alert thresholds, and guardrail metrics defined
                 before the first line of code is written.
Output:          BUSINESS-METRICS.md
Detail:          Read(".claude/agents/ANALYST.md") → BUSINESS-METRICS.md Register. Read(".claude/reference/ANALYTICS-PROTOCOL.md") → Section A for greenfield event schema standard

---

### MODE: ESCALATION-TREE [AGENT: STEWARD]
Entry condition: INFRA-DESIGN complete. Before any IaC or production infrastructure.
Gate:            ESCALATION-TREE.md complete. Every P0 category has a named primary
                 and backup human with verified contact details and response SLA.
Rule:            Production cannot be unowned. STEWARD blocks all IaC and BUILDER
                 work until ESCALATION-TREE.md exists.
Output:          ESCALATION-TREE.md
Detail:          Read(".claude/agents/STEWARD.md") → ESCALATION-TREE.md section.

---

### MODE: COMPLIANCE-LEGAL [AGENT: COUNSEL]
Entry condition: SPEC.md and INFRASTRUCTURE.md complete.
Gate:            LEGAL-REVIEW.md exists. GDPR-REGISTER.md complete (if EU user data).
                 License audit passed — no GPL/copyleft in production dependencies.
Output:          LEGAL-REVIEW.md, GDPR-REGISTER.md
Detail:          Read(".claude/agents/COUNSEL.md") → MODE: COMPLIANCE-LEGAL section.
Emergency only:  If COUNSEL.md is missing from agents/ (file system error or first-time setup):
                 SENTINEL covers this gate as a one-session emergency measure only.
                 Log: P1 ISSUES OPEN "COUNSEL.md missing — restore from Apex template immediately."
                 This is not an acceptable standing configuration. Resolve before next session.

---

### MODE: DESIGNER [AGENT: ARTISAN]
Entry condition: SPEC.md CRITIC-approved. Runs in parallel with SECURITY/INFRA.
Gate:            DESIGN-SYSTEM.md complete. tokens.css exists. All component specs
                 defined with all 7 interactive states before BUILDER implements
                 any UI component.
Hard block:      BUILDER cannot write any UI file without DESIGN-SYSTEM.md.
                 ARTISAN veto on UI without a soul pauses BUILDER on UI work.
Output:          DESIGN-SYSTEM.md, tokens.css, component specs
Detail:          Read(".claude/agents/ARTISAN.md") → DESIGNER MODE section.

---

### MODE: CONTENT [AGENT: QUILL]
Entry condition: DESIGNER complete.
Gate:            CONTENT-GUIDE.md exists. Brand voice defined (3 adjectives +
                 3 anti-adjectives). Zero placeholder copy anywhere in specs.
                 All error messages, empty states, loading states, and CTAs
                 specified with final copy.
Rule:            QUILL veto on generic or off-brand copy pauses BUILDER on any
                 user-facing string. Copy is a design constraint, not an afterthought.
Output:          CONTENT-GUIDE.md
Detail:          Read(".claude/agents/QUILL.md") → CONTENT MODE section.

================================================================================
## PHASE 5 — IMPLEMENTATION PREPARATION
================================================================================

### MODE: RUNBOOK [AGENT: DOCTOR]
Entry condition: SLO.md complete. Before IaC.
Gate:            runbooks/[service].md exists for every service assigned SLO
                 tier CRITICAL.
                 Required sections: symptoms | severity assessment | immediate
                 mitigation | root cause investigation | recovery steps |
                 verification | post-mortem trigger.
Hard block:      no LAUNCH-READY without runbooks for all CRITICAL-tier services.
Output:          runbooks/[service-name].md (one per CRITICAL service)
Detail:          Read(".claude/agents/DOCTOR.md") → MODE: RUNBOOK section.

---

### MODE: IaC [AGENT: TITAN]
Entry condition: INFRASTRUCTURE.md + ESCALATION-TREE.md complete.
Gate:            infrastructure/ directory exists with environment-separated configs.
                 scripts/validate-env.ts populated with all required env vars.
                 Data portability scripts exist and tested: export-data, import-data,
                 verify-export.

IaC principles:
  - All secrets via env vars or secrets manager. Zero secrets in IaC files or git.
  - infrastructure/environments/staging/ mirrors production/ at 10-20% capacity.
  - validate-env.ts runs at startup and fails fast on any missing required var.
  - Every new external service dependency declared in validate-env.ts before deploy.
  - Provider swap = change env vars, not IaC code (abstraction layers enforce this).
  - Test quarterly: can this infrastructure be reproduced on a different provider?

Output: infrastructure/[env]/ configs, scripts/validate-env.ts fully populated.

---

### MODE: SCAFFOLD [AGENT: BUILDER]
Entry condition: ARCHITECT + DESIGNER complete. CANONICAL FILE TREE reviewed.
Gate:            all boilerplate files for new domains generated and Tier 2 green.
                 No business logic in scaffold — structure only.
Rule:            scaffold generates the file skeleton: imports, empty function
                 signatures matching architecture contracts, type stubs.
                 BUILDER mode fills the implementation.
                 Scaffold files committed before any TDD session begins.

Scaffold checklist (per new domain):
[ ] Route file created (input parsing + auth stub only — no business logic)
[ ] Service file created (function signatures matching SPEC flows — no implementation)
[ ] Repository file created (query signatures matching data model — no implementation)
[ ] Test file created (describe blocks matching GIVEN/WHEN/THEN from SPEC)
[ ] All imports resolve (tsc --noEmit passes on empty stubs)
[ ] New shared files registered in ARCHITECTURE.md SHARED FUNCTION REGISTRY

Output: skeleton files in canonical structure. Tier 2 green on all scaffold files.
Detail: Read(".claude/agents/BUILDER.md") → MODE: SCAFFOLD section.

---

### MODE: PLANNER [AGENT: TITAN + BUILDER]
Entry condition: SCAFFOLD complete. Mandatory before any multi-file BUILDER session
                 (>3 files). TITAN approves; BUILDER executes.
Gate:            execution graph written and approved by TITAN in CONTEXT.md before
                 BUILDER writes a single implementation line.

Planner output format (logged in CONTEXT.md under EXECUTION PLAN):
```
Feature: [name]
Files (in dependency order — implement in this exact sequence):
  1. [filename] | Layer: [repo|service|route|component] | Depends on: [none|file N]
     Contract: [what this file exports / what functions it must implement]
  2. [filename] | ...
Shared functions to create:  [list — check SHARED FUNCTION REGISTRY first]
Shared functions to reuse:   [list from SHARED FUNCTION REGISTRY]
DB changes required:         [yes: migration needed → SENTINEL + TITAN review | no]
New external service:        [yes: THREAT-MODEL.md update required | no]
Blast radius:                [files affected] | [reversibility]
Estimated sessions:          [n]
```

Rule: DB schema change flagged in PLANNER → SENTINEL review + TITAN approval
      required before BUILDER proceeds. BUILDER does not self-approve schema changes.

================================================================================
## PHASE 6 — IMPLEMENTATION
================================================================================

### MODE: TDD [AGENT: BUILDER]
Entry condition: SCAFFOLD + PLANNER complete for the target files.
Gate:            failing tests exist for every acceptance criterion in SPEC.md
                 (including all ACTIVE REQUIREMENT CHANGELOG entries) before
                 any implementation begins.
Rule:            red → green → refactor. No implementation without a failing test.
Detail:          Read(".claude/agents/BUILDER.md") → MODE: TDD section.

---

### MODE: BUILDER [AGENT: BUILDER]
Entry condition: TDD tests written and failing.
Gate:            Tier 1 verification GREEN after every file written.
                 Tier 2 verification GREEN before every commit.
                 Project runnable after every Tier 2 pass.
Rule:            One file per session. Declare file lock in CONTEXT.md before writing.
                 Release lock after Tier 2 green. Never leave a lock stale >24h.
Detail:          Read(".claude/agents/BUILDER.md") → full file.

---

### MODE: DESIGN-REVIEW [AGENT: ARTISAN]
Entry condition: BUILDER completes any UI file (component, page, section).
                 Runs per UI file — not as a single end-of-sprint phase.
                 Non-UI files (services, repos, routes) skip to REVIEW directly.
Gate:            ARTISAN DESIGN-REVIEW gate PASS before BUILDER proceeds to the
                 next UI file and before ACCESSIBILITY mode begins.
Hard block:      ARTISAN veto blocks BUILDER from any further UI work until resolved.

DESIGN-REVIEW gate checklist (all items must PASS):
[ ] Component has all 7 interactive states implemented:
    default | hover | active | focus | disabled | loading | error
[ ] Colour contrast passes WCAG 2.1 AA for all text elements
[ ] Touch targets >= 44x44px on mobile viewports
[ ] Loading, empty, and error states are designed — not defaulted or omitted
[ ] All visual values sourced from tokens.css — zero hardcoded hex/px/rem/ms
[ ] Anti-reference check: does this look like the anti-reference products?
    If yes → redesign before proceeding
[ ] Component is consistent with DESIGN-SYSTEM.md personality direction

Output: PASS verdict logged in CONTEXT.md per component.
        FAIL blocks next file and triggers ARTISAN veto.
Detail: Read(".claude/agents/ARTISAN.md") → DESIGN-REVIEW Gate section.

---

### MODE: ACCESSIBILITY [AGENT: ARTISAN]
Entry condition: DESIGN-REVIEW PASS on the current UI component or section.
                 Runs per UI section — not as a single end-of-sprint phase.
                 Non-UI files skip this mode entirely.
Gate:            WCAG 2.1 AA automated scan passing. Keyboard navigation verified.
                 Screen reader landmarks correct. No regressions from this component.
Rule:            Accessibility retrofitted after shipping costs 10x. Run per
                 component before REVIEW, never batched to end of sprint.

Accessibility checklist:
[ ] Automated scan passing: axe-core / pa11y / Lighthouse CI — zero errors
[ ] Keyboard navigation: all interactive elements reachable and operable via Tab
[ ] Focus indicators visible on all interactive elements (not suppressed)
[ ] ARIA roles, labels, and landmarks correct and complete
[ ] Images have meaningful alt text (or alt="" for purely decorative images)
[ ] Form inputs have associated <label> elements (not placeholder-as-label)
[ ] Error messages announced to screen readers (aria-live or role="alert")
[ ] No content relies solely on colour to convey meaning
[ ] axe / pa11y integration active in CI — not a manual-only check

Output: PASS verdict per section logged in CONTEXT.md.
        FAIL blocks REVIEW on this component.
Detail: Read(".claude/agents/ARTISAN.md") → ACCESSIBILITY Gate section.

---

### MODE: REVIEW [AGENT: BUILDER]
Entry condition: BUILDER complete on file.
                 For UI files: DESIGN-REVIEW and ACCESSIBILITY both PASS.
                 For non-UI files: proceed directly from BUILDER.
Gate:            cooperative self-review passes. Every POST-WRITE CHECKLIST item
                 checked and confirmed. REQUIREMENT CHANGELOG ACTIVE entries
                 verified as reflected in this file.
Note:            REVIEW is cooperative (BUILDER reviews own output).
                 VERIFY is adversarial (BREAKER attacks it). Both are required.
                 One does not substitute for the other.
Detail:          Read(".claude/agents/BUILDER.md") → POST-WRITE CHECKLIST section.

---

### MODE: VERIFY [AGENT: BREAKER + SENTINEL (security dimension)]
Entry condition: REVIEW complete on file.
Gate:            BREAKER issues PASS verdict. All attack vectors documented —
                 not just passed, but written up so future sessions know what
                 was tested.
Rule:            Max 3 VERIFY → BUILDER → VERIFY loops per file. Still FAIL
                 after 3 loops → escalate to TITAN. 3 loops = architectural
                 fix needed, not an implementation fix.
                 BREAKER must not have been involved in writing the file under review.

SENTINEL security dimension (mandatory for any file touching auth / payments /
PII / multi-tenancy / AI input handling / external data ingestion):
  SENTINEL runs the OWASP Top 10 checklist against the file.
  SENTINEL veto overrides a BREAKER PASS — both must sign off.
  Log SENTINEL involvement: "SENTINEL VERIFY: [file] — [PASS | FAIL: finding]"
  Detail: Read(".claude/agents/SENTINEL.md") → OWASP TOP 10 CHECKLIST section.

Output: PASS verdict in CONTEXT.md. FAIL entry with line, vector, severity, fix direction.
Detail: Read(".claude/agents/BREAKER.md") → VERIFY MODE section.

================================================================================
## PHASE 7 — QUALITY + RELEASE
================================================================================

### MODE: PERF [AGENT: GAUGE]
Entry condition: VERIFY PASS on any SLO-tier CRITICAL or STANDARD endpoint.
Gate:            p99 within SLO target. No DB query >100ms without an index
                 explanation. Load test run against staging for CRITICAL/STANDARD
                 endpoints. AI cost per 1k calls within budget.
Rule:            GAUGE veto on performance regressions blocks deploy. Must be
                 resolved or explicitly accepted with documented trade-off in ADR.
Detail:          Read(".claude/agents/GAUGE.md") → PERF MODE section.

---

### MODE: DRY-AUDIT [AGENT: SCHOLAR]
Entry condition: all VERIFY + PERF passes complete for the current feature set.
                 Runs before INTEGRATION — deduplication before wiring.
Gate:            zero accidental duplication in src/. Every duplication is either
                 intentional (documented in code) or extracted to SHARED FUNCTION
                 REGISTRY before integration proceeds.

Protocol:
  Run: npx jscpd src/ --min-lines 5 --min-tokens 50
  For each duplication found:
    Intentional → add inline comment: // intentional duplication: [reason why extraction is wrong here]
    Accidental  → extract to SHARED FUNCTION REGISTRY, update all callers,
                  add entry to ARCHITECTURE.md registry, separate commit
  DRY-AUDIT changes are a separate commit — never bundled with feature work.

Output: zero open duplication findings, or all findings documented.
        ARCHITECTURE.md SHARED FUNCTION REGISTRY updated.
Detail: Read(".claude/agents/SCHOLAR.md") → DRY-AUDIT Protocol section.

---

### MODE: INTEGRATION [AGENT: BUILDER]
Entry condition: DRY-AUDIT complete. All files for the current feature set
                 have passed VERIFY. No open Tier 1 failures anywhere in scope.
Gate:            full seam check passes. All files wire together correctly across
                 layer boundaries. No integration-only failures.

Integration checklist:
[ ] tsc --noEmit passes on full project (cross-file type correctness)
[ ] All service → repository calls use correct function signatures
[ ] All route → service calls pass correct input types
[ ] All external integrations called through integration gateway (never direct SDK)
[ ] All feature flag evaluations consistent across the call chain
[ ] Auth context flows correctly from route through service to repository layer
[ ] End-to-end happy path passes for every user flow in SPEC.md
[ ] All ACTIVE REQUIREMENT CHANGELOG entries reflected end-to-end
[ ] Tier 3 verification (fitness-check.sh) GREEN on all changed files
[ ] No new circular dependencies introduced (npx madge --circular src/)

Output: integration confirmation logged in CONTEXT.md. Tier 3 green.
Detail: Read(".claude/agents/BUILDER.md") → MODE: INTEGRATION section.

---

### MODE: QA [AGENT: BREAKER]
Entry condition: INTEGRATION complete.
Gate:            QA-REPORT.md complete. All user flows in SPEC.md tested including
                 every EDGE case. All INVARIANTS tested adversarially. All
                 REQUIREMENT CHANGELOG ACTIVE entries tested end-to-end
                 (not just original spec — changelog updates must be verified too).
Detail:          Read(".claude/agents/BREAKER.md") → QA MODE section.

---

### MODE: COMPATIBILITY [AGENT: ARTISAN + BUILDER]
Entry condition: QA complete. Applies to any release with a UI.
                 Skip (with documented reason in CONTEXT.md) for API-only releases.
Gate:            all target breakpoints and platforms tested and passing.
                 ARTISAN signs off on visual correctness. BUILDER signs off on
                 functional correctness across environments.

Compatibility checklist:
[ ] Breakpoints: mobile (375px) | tablet (768px) | desktop (1280px) | wide (1440px)
[ ] Browsers: Chrome latest | Firefox latest | Safari latest | Edge latest
[ ] Mobile OS: iOS Safari | Android Chrome
[ ] Touch interactions work correctly (no hover-only interactions on mobile)
[ ] Dark mode renders correctly (if DESIGN-SYSTEM.md declares dark mode support)
[ ] Reduced motion: animations respect prefers-reduced-motion media query
[ ] High contrast: product usable under Windows High Contrast mode
[ ] Zoom: layout holds at 200% browser zoom without horizontal scroll
[ ] Font scaling: layout holds when user browser font size is increased
[ ] tokens.css values render correctly across all tested environments
[ ] No regressions introduced on any breakpoint or browser not targeted

Output: COMPATIBILITY-REPORT.md or pass/fail per environment logged in CONTEXT.md.
Detail: Read(".claude/agents/ARTISAN.md") → VISUAL COMPATIBILITY Gate section.
        Read(".claude/agents/BUILDER.md") → MODE: COMPATIBILITY section.

---

### MODE: DRIFT-AUDIT [AGENT: TITAN + SCHOLAR]
Entry condition: after any architectural change, or monthly (whichever first).
                 Always required before COMPLIANCE-CHECK and LAUNCH-READY.
Gate:            spec-to-code reconciliation complete. ARCHITECTURE.md reflects
                 actual implementation. No undocumented divergence anywhere.

Drift-audit checklist:
[ ] Every file in src/ is in the CANONICAL FILE TREE (or ADR documents the deviation)
[ ] Every endpoint in API-DESIGN.md is implemented — no phantom or undocumented routes
[ ] Every INVARIANT in SPEC.md has a test that enforces it
[ ] C4 Level 1 + Level 2 diagrams reflect actual imports:
    run npx madge --image architecture-actual.svg src/
[ ] No new circular dependency clusters:
    run npx madge --circular src/ — compare to last audit baseline
[ ] ARCHITECTURE.md SHARED FUNCTION REGISTRY matches actual shared functions in codebase
[ ] Every DECISIONS LOCKED item is reflected in current code (no silent reversals)
[ ] SLO.md tiers match actual implementation (no CRITICAL endpoint without runbook)
[ ] All REQUIREMENT CHANGELOG IMPLEMENTED entries are reflected in SPEC.md DELTA

Drift found: log in CONTEXT.md as ISSUES OPEN.
             Block LAUNCH-READY if any drift is architectural.
Output:      findings in CONTEXT.md. ARCHITECTURE.md updated to reflect reality.
Detail:      Read(".claude/agents/TITAN.md") → MODE: DRIFT-AUDIT section.
             Read(".claude/agents/SCHOLAR.md") → DRIFT-AUDIT Mode section.

---

### MODE: COMPLIANCE-CHECK [AGENT: SENTINEL + ORACLE]
Entry condition: DRIFT-AUDIT complete. Final gate before LAUNCH-READY.
                 Also runs monthly as a periodic audit (see PERIODIC MODES below).
Gate:            codebase and process audited against this Apex system. All findings
                 addressed or formally accepted. LAUNCH-READY blocked until PASS.

SENTINEL audits:
[ ] All PRIME DIRECTIVES followed this sprint — confidence signalling, blast radius,
    file locking, grounding, injection defence — evidence in CONTEXT.md
[ ] All PRODUCT QUALITY GATES met — SPEC, ARCHITECTURE.md, DESIGN-SYSTEM.md,
    THREAT-MODEL.md, RUNBOOK for all CRITICAL services all exist and are current
[ ] CODE DISCIPLINE upheld across all files — no file >200 lines, no function
    >30 lines, no complexity >10, no hardcoded provider strings, no console.* in src/
[ ] HITL matrix respected — all escalation triggers were acted on correctly
    this sprint (review CONTEXT.md for any overrides and verify they were logged)
[ ] Security headers configured and tested (CSP, HSTS, X-Frame-Options, etc.)
[ ] npm audit: zero CRITICAL/HIGH in production dependencies

ORACLE audits:
[ ] SPEC.md reflects the latest REQUIREMENT CHANGELOG — no silent drift from
    ACTIVE entries back to the original PRD
[ ] All INVARIANTS still covered by passing tests (none orphaned by refactoring)
[ ] Success metrics tracking verified live and reporting correctly in analytics tool
[ ] No new user flow or data type added without going through SPEC → CRITIC
[ ] All out-of-scope items from v1 spec remain out of scope (no silent scope creep)

Output: COMPLIANCE-REPORT.md or findings in CONTEXT.md.
        Any CRITICAL finding blocks LAUNCH-READY until resolved.

---

### MODE: LAUNCH-READY [ALL AGENTS]
Entry condition: DRIFT-AUDIT + COMPLIANCE-CHECK complete. All pipeline modes done.
Gate:            all agent sign-off checklists PASS. Any single FAIL blocks launch.
                 No exceptions. No "we'll fix it post-launch."
Detail:          Read(".claude/modes/LAUNCH-READY.md")

================================================================================
## INCIDENT MODES (not pipeline — triggered by active incident declaration)
================================================================================

These modes override all pipeline work when DOCTOR declares an active incident.
DOCTOR takes technical lead. STEWARD owns human communication.

DEBUG              → DOCTOR          | Triggered by active incident.
                                       Protocol: reproduce → isolate → 5-Whys → fix → verify.
                                       Detail: Read(".claude/agents/DOCTOR.md") → DEBUG section.

POST-MORTEM        → DOCTOR          | Triggered after every P0/P1 resolved.
                                       Mandatory KNOWLEDGE-BASE.md entry. Cannot be skipped.
                                       Detail: Read(".claude/agents/DOCTOR.md") → POST-MORTEM FORMAT.

DISASTER-RECOVERY  → STEWARD+DOCTOR  | Triggered by P0/P1 requiring human escalation.
                                       STEWARD prepares brief before calling human.
                                       Detail: Read(".claude/agents/STEWARD.md")
                                               → Human Briefing Format section.

PRODUCTION-OWNERSHIP → STEWARD       | Triggered if no production owner declared.
                                       Blocks all BUILDER work until owner named.

================================================================================
## ON-DEMAND MODES (triggered by condition, not pipeline sequence position)
================================================================================

REFACTOR  → SCHOLAR  | Triggered: cognitive complexity >10, file >200 lines, or
                        debt score exceeds threshold from most recent DEBT-AUDIT.
                        Rule: write characterization tests first, then refactor.
                        Separate PR always. Never batch with feature work.
                        Detail: Read(".claude/agents/SCHOLAR.md") → REFACTOR section.

================================================================================
## PERIODIC MODES (run on schedule — not in the linear pipeline)
================================================================================

DEBT-AUDIT        → SCHOLAR          | Monthly.
                                       Score + prioritise all tech debt.
                                       Output: TECH-DEBT.md updated with scores.
                                       Detail: Read(".claude/agents/SCHOLAR.md")
                                               → DEBT-AUDIT Format section.

COMPLIANCE-CHECK  → SENTINEL+ORACLE  | Monthly (also a pre-LAUNCH-READY gate above).
                                       Full codebase audit against this Apex system.
                                       Same checklist as pipeline gate version.

CHAOS             → BREAKER+DOCTOR   | Quarterly. Resilience gameday.
                                       Kill DB, cache, AI provider, simulate disk full.
                                       Run escalation drill. Verify runbooks current.
                                       Detail: Read(".claude/agents/BREAKER.md")
                                               → CHAOS MODE section.

CUSTOMER-SIGNAL   → ANALYST          | Weekly.
                                       Support tickets + rage clicks + session
                                       recordings → signal brief routed to ORACLE.
                                       Detail: Read(".claude/agents/ANALYST.md")
                                               → CUSTOMER-SIGNAL section.

BUSINESS-REVIEW   → ANALYST          | Monthly.
                                       Metrics trend + conversion + guardrail
                                       checks + churn signal analysis.
                                       Detail: Read(".claude/agents/ANALYST.md")
                                               → BUSINESS-REVIEW section.

ESCALATION review → STEWARD          | Monthly.
                                       Verify all contacts in ESCALATION-TREE.md
                                       still reachable. Update changed details.

BACKUP-VERIFY     → STEWARD          | Monthly.
                                       Test restore from latest backup.
                                       Record restore time + result in CONTEXT.md.

DEPENDENCY-REVIEW → SENTINEL         | Quarterly.
                                       Full license audit, security freshness,
                                       unused dependency scan.
                                       Run: npm audit + npx depcheck
                                            + npx license-checker --summary

KB-COMPRESSION    → SCHOLAR          | Quarterly or when KNOWLEDGE-BASE.md >300 lines.
                                       Detail: Read(".claude/reference/MEMORY-TRIAGE.md")
                                               → MONTHLY KB COMPRESSION section.

================================================================================
## FEATURE ADDITION CHECKLIST (post-launch — adding a feature to existing product)
================================================================================

Use this instead of the full greenfield pipeline when adding to a shipped product.

ORACLE:   Update SPEC.md → mini-CRITIC on changed section only
TITAN:    Update ARCHITECTURE.md if new files / routes / tables / services
          New ADR if any architectural decision is involved
          Update API-DESIGN.md for new or modified endpoints
          Update INFRASTRUCTURE.md if new AI / cache / queue / realtime
          Update SLO.md if new CRITICAL or STANDARD endpoint added
SENTINEL: SECURITY review if new attack surface, data type, or external service
          Update THREAT-MODEL.md before any new external service is wired
ANALYST:  Define feature primary metric + guardrail metrics + rollback trigger
          before build begins — not after. Log in BUSINESS-METRICS.md.
ARTISAN:  DESIGNER if new visual components
          DESIGN-REVIEW per new UI file
          ACCESSIBILITY per new UI section
QUILL:    CONTENT if new copy, error states, empty states, or onboarding flows
BUILDER:  PLANNER if >3 files → TDD → BUILDER → DESIGN-REVIEW (UI) → ACCESSIBILITY (UI)
          → REVIEW → VERIFY (+ SENTINEL dimension if applicable)
BREAKER:  VERIFY → QA
GAUGE:    PERF on any CRITICAL or STANDARD endpoint changed or added
SCHOLAR:  DRY-AUDIT before INTEGRATION
BUILDER:  INTEGRATION after DRY-AUDIT
ARTISAN+BUILDER: COMPATIBILITY if UI changes affect breakpoints or browser targets
ALL:      DRIFT-AUDIT if any architectural change
ALL:      COMPLIANCE-CHECK before merging to main if sprint included security
          or architecture changes

================================================================================
# GREENFIELD-PIPELINE.md — Apex Runtime v1.4 | Authors: Ashish Khandelwal, Arup Kolay | MIT License
================================================================================
