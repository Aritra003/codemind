# REFERENCE: Pipeline Output Document Templates
# Load: Read(".claude/reference/TEMPLATES.md") → [TEMPLATE-NAME] when producing a mandated document.
# Purpose: Prevents per-project structure drift. Every agent producing a named output document
#          starts from the template here. Add sections — never remove required ones.
# Owner: ORACLE (product docs) | SENTINEL/COUNSEL (compliance docs) | TITAN (arch docs)
# Version: Apex Runtime v1.4
================================================================================

## LOCATION RULE — where output document formats live

Three locations are used. The choice is determined by the nature of the document:

1. AGENT FILE — format lives with the agent that produces it, when:
   the document is produced by one agent in one mode and the format is integral to
   understanding how to run that mode. One file load gives protocol + format together.
   Examples: SPEC.md (ORACLE), CHAOS-REPORT.md (DOCTOR), PERF-REPORT.md (GAUGE).

2. PIPELINE FILE (GREENFIELD-PIPELINE.md or BROWNFIELD.md) — format lives with the
   trigger, when: the document is populated incrementally one block at a time as a
   pipeline stage executes, and the format and the trigger appear at the same moment.
   Examples: OBSERVABILITY.md per-feature block, API-DESIGN.md per-endpoint block.

3. THIS FILE (TEMPLATES.md) — when: the document is a standalone deliverable that is
   gate-blocking, cross-agent, structurally stable, and potentially read by humans
   outside the system. These are documents that must exist before a gate passes and
   where structural drift across projects causes real quality problems.
   Examples: LEGAL-REVIEW.md, ARCHITECTURE.md, THREAT-MODEL.md.

When adding a new pipeline output document, apply this rule to choose its format location.
Do not use gut feel or convenience — the rule prevents the format from being unfindable.

================================================================================

## [ANALYTICS-SCHEMA]
Owner: ORACLE. Written during SPEC mode. Referenced by: BUILDER, BREAKER, ANALYST.
No analytics event may be implemented without a matching entry here.

```markdown
# ANALYTICS-SCHEMA.md — Event Catalogue
# Produced by: ORACLE → SPEC mode | Read(".claude/reference/ANALYTICS-PROTOCOL.md") → Section A first
# Naming algorithm: ANALYTICS-PROTOCOL.md Section A2
================================================================================

Provider:       [GA4 | Amplitude | Mixpanel | PostHog | other]
Schema version: [semver — increment on any breaking change to event structure]
Last updated:   [ISO date] | Updated by: [agent]

## Mandatory Context Fields (present on EVERY event — see ANALYTICS-PROTOCOL.md Section B)
session_id:     [description]
user_id:        [authenticated | anonymous_[uuid]]
app_version:    [sourced from appConfig — never hardcoded]
platform:       [web | ios | android]
consent_state:  [granted | denied | pending]

## Key Events (conversion + retention signals — reviewed by ANALYST before designation)
# Rule: scroll, generic_click, page_view are NEVER Key Events.

| Event name (snake_case) | Category | Trigger | PII risk | Owner | Implemented |
|---|---|---|---|---|---|
| [event_name] | KEY_EVENT | [exact user action] | [none\|low\|HIGH] | [agent] | [ ] |

## Engagement Events
| Event name | Category | Trigger | PII risk | Owner | Implemented |
|---|---|---|---|---|---|
| [event_name] | ENGAGEMENT | [trigger] | [none\|low\|HIGH] | [agent] | [ ] |

## Diagnostic Events (never tagged as Key Events in provider config)
| Event name | Category | Trigger | PII risk | Owner | Implemented |
|---|---|---|---|---|---|
| [event_name] | DIAGNOSTIC | [trigger] | [none\|low\|HIGH] | [agent] | [ ] |

## PII Review Log
# Every HIGH PII-risk event requires SENTINEL sign-off before BUILDER implements.
| Event name | PII fields | SENTINEL sign-off | Date |
|---|---|---|---|
```

---

## [LEGAL-REVIEW]
Owner: COUNSEL. Written during COMPLIANCE-LEGAL mode. Blocks LAUNCH-READY if CRITICAL findings unresolved.

```markdown
# LEGAL-REVIEW.md
# Produced by: COUNSEL → COMPLIANCE-LEGAL mode
# Status: [IN PROGRESS | COMPLETE | BLOCKED — describe blocker]
================================================================================

Date:           [ISO date]
Product:        [product name + version]
Reviewed by:    COUNSEL agent | Human lawyer consulted: [name | none]

## Data Protection Assessment
GDPR applicable:    [yes — EU users | no — confirm basis]
CCPA applicable:    [yes — CA users | no]
HIPAA applicable:   [yes — health data | no]
Legal basis:
  [data type]: [consent | contract | legitimate interests | legal obligation]

Status: [PASS | FAIL — list findings]

## AI Feature Assessment (complete if product has AI features)
AI output disclosed to users:     [yes | no — describe]
Consequential AI decisions:       [none | describe + human review mechanism]
Provider ToS reviewed:            [yes — list providers | no — BLOCK]
Training data sourcing:           [licensed | public domain | N/A]

Status: [PASS | FAIL | N/A]

## Intellectual Property
License audit run:        [yes — date | no — BLOCK]
GPL/AGPL found:           [none | list — BLOCK until resolved]
Third-party content:      [licensed | public domain | none]
Contributor agreements:   [in place | missing — list]

Status: [PASS | FAIL]

## Consumer Law (complete if B2C product)
Auto-renewal disclosed:   [yes | no | N/A]
Cancellation accessible:  [yes | no | N/A]
Claims reviewed:          [yes — list claims checked | N/A]

Status: [PASS | FAIL | N/A]

## Open Findings
# Format: [CRITICAL|HIGH|MED|LOW] | [finding] | [owner] | [resolution]
[severity] | [finding] | [owner] | [status]

## Sign-off
COUNSEL: [APPROVED — all CRITICAL/HIGH findings resolved | BLOCKED — list open findings]
Date:    [ISO date]
```

---

## [GDPR-REGISTER]
Owner: COUNSEL/SENTINEL. Article 30 processing register. Required before first EU user data collected.

```markdown
# GDPR-REGISTER.md — Article 30 Record of Processing Activities
# Produced by: COUNSEL → COMPLIANCE-LEGAL mode
# Legal requirement: GDPR Article 30 — must be maintained and available to supervisory authority.
================================================================================

Organisation:       [company name]
Data Controller:    [name + contact]
DPO (if required):  [name + contact | not required — basis: <250 employees + no high-risk processing]
Last updated:       [ISO date]

## Processing Activities

### Activity: [descriptive name — e.g. "User Account Management"]
Purpose:            [specific, explicit purpose — no vague "service improvement"]
Legal basis:        [consent Art.6(1)(a) | contract Art.6(1)(b) | legitimate interests Art.6(1)(f)]
  If legitimate interests: [describe the interest + confirm not overridden by data subject rights]
Data categories:    [list: name | email | payment info | usage data | etc.]
Data subjects:      [registered users | visitors | employees | etc.]
Recipients:         [internal teams | list third-party processors below]
Third-party processors:
  [Processor name] | [country] | [what they receive] | [DPA signed: yes | no — BLOCK]
Retention period:   [duration + deletion/anonymisation mechanism]
Security measures:  [encryption at rest | in transit | access controls | audit logs]
Cross-border transfer: [yes — country + safeguard mechanism (SCCs/adequacy) | no]
Right-to-erasure:   [deletion endpoint | automation | manual process — describe]

### Activity: [next processing activity]
[repeat structure above]

## Consent Records (if consent is legal basis for any activity)
Consent mechanism:  [describe — checkbox | explicit opt-in | etc.]
Consent withdrawal: [describe how users can withdraw + what happens]
Consent log:        [stored in: table/field | third-party tool]
```

---

## [SLO]
Owner: TITAN. Written during SLO-DESIGN mode. Required before any RUNBOOK or IaC.

```markdown
# SLO.md — Service Level Objectives + Error Budgets
# Produced by: TITAN → SLO-DESIGN mode
# Tiers: CRITICAL (99.9%) | STANDARD (99.5%) | BACKGROUND (99%)
================================================================================

Last updated:  [ISO date]
Environment:   [production | staging]

## Services

### Service: [service name — e.g. "Authentication API"]
Tier:               CRITICAL | STANDARD | BACKGROUND
SLO target:         [99.9% | 99.5% | 99%] availability
Error budget/month: [43 min | 3.6 hr | 7.3 hr]
SLI definition:     [what is measured — e.g. "% of auth requests returning 2xx in <500ms"]
Measurement tool:   [Datadog | Prometheus | CloudWatch | other]
Alert threshold:    [burn rate alert — e.g. "5% budget consumed in 1h = page"]

Error budget policy:
  GREEN  (>50% remaining):  deploy freely
  YELLOW (20–50%):          canary required for all deploys
  RED    (<20%):            feature freeze — fixes only
  EXHAUSTED:                full freeze + incident declared

Current status:     [GREEN | YELLOW | RED] | Budget remaining: [%]
Runbook:            runbooks/[service-name].md

### Service: [next service]
[repeat structure above]

## SLO Review Cadence
Monthly:   GAUGE + ANALYST review error budget consumption trends
Quarterly: TITAN reviews tier assignments — are they still appropriate?
On breach: DOCTOR leads post-mortem + TITAN reviews architectural cause
```

---

## [THREAT-MODEL]
Owner: SENTINEL. Written during SECURITY mode. Must be updated before any new external service.

```markdown
# THREAT-MODEL.md — STRIDE Risk Register
# Produced by: SENTINEL → SECURITY mode
# Update trigger: new external service | new data type | new auth flow | quarterly review
================================================================================

Last updated:  [ISO date] | Updated by: SENTINEL
Review trigger: [what event next requires update]

## System Components

### Component: [component name — e.g. "User Authentication Service"]
Description:   [what it does, what data it handles]
Trust boundary: [internal | external-facing | admin-only]

STRIDE Analysis:
[Copy per-threat format from SENTINEL.md for each S/T/R/I/D/E dimension]

### Component: [next component]
[repeat]

## Risk Register (consolidated — all HIGH/CRITICAL threats across all components)
| Component | Threat type | Risk level | Mitigation | Residual risk | Status |
|---|---|---|---|---|---|
| [name] | [S/T/R/I/D/E] | [CRIT/HIGH/MED/LOW] | [control] | [remaining] | [MITIGATED/OPEN] |

## OWASP Top 10 Coverage
[Run OWASP checklist from SENTINEL.md — record PASS/FAIL per item]
| OWASP item | Status | Notes |
|---|---|---|
| A01 Broken Access Control | [PASS/FAIL/N/A] | |

## Open Threats (unmitigated CRITICAL/HIGH)
# Each must have: owner | target resolution date | interim mitigation
[threat] | [owner] | [target date] | [interim control]
```

---

## [QA-REPORT]
Owner: BREAKER. Written during QA mode. Required before LAUNCH-READY.

```markdown
# QA-REPORT.md
# Produced by: BREAKER → QA mode
================================================================================

Date:           [ISO date]
Build/commit:   [SHA]
Environment:    [staging | feature branch]
Scope:          [features tested — list or "full regression"]

## Coverage Summary
Test coverage:       [n]% | Delta from last run: [+n% | -n% | unchanged]
Mutation score:      [n]% (target: ≥80% for CRITICAL paths)
Coverage ratchet:    [PASS — did not decrease | FAIL — decreased from [n]% to [n]%]

## Findings by Severity
CRITICAL: [n] — [list: description | file | status: OPEN|RESOLVED]
HIGH:     [n] — [list]
MED:      [n] — [list]
LOW:      [n] — [list]

## User Flows Tested
| Flow (from SPEC.md) | Happy path | Edge cases | Invariant tests | Status |
|---|---|---|---|---|
| [flow name] | [PASS/FAIL] | [PASS/FAIL] | [PASS/FAIL] | [PASS/FAIL] |

## Accessibility (if UI)
Automated scan: [axe/pa11y] | Violations: [n] | Severity: [list CRITICAL/HIGH]

## Verdict
[ ] PASS — all CRITICAL/HIGH findings resolved. Ready for LAUNCH-READY gate.
[ ] FAIL — [n] blocking findings remain. List: [findings]
```

---

## [COMPLIANCE-REPORT]
Owner: ORACLE (product half) + SENTINEL (engineering half). Written during COMPLIANCE-CHECK mode.

```markdown
# COMPLIANCE-REPORT.md
# Produced by: ORACLE + SENTINEL → COMPLIANCE-CHECK mode (co-owned)
# Cadence: pre-LAUNCH-READY + monthly periodic
================================================================================

Date:       [ISO date]
Period:     [date range covered]
Scope:      [greenfield pre-launch | monthly review | triggered by: describe]

## ORACLE — Product Half
[Copy ORACLE COMPLIANCE CHECKLIST results from ORACLE.md → COMPLIANCE-CHECK section]
| Check | Status | Notes |
|---|---|---|
| SPEC reflects latest REQUIREMENT CHANGELOG | [PASS/FAIL] | |
| All INVARIANTs covered by passing tests | [PASS/FAIL] | |
| Success metrics tracking live | [PASS/FAIL] | |
| No unspecced routes/schemas/UI added | [PASS/FAIL] | |
| Out-of-scope items remain out of scope | [PASS/FAIL] | |

## SENTINEL — Engineering Half
[Copy SENTINEL COMPLIANCE CHECKLIST results]
| Check | Status | Notes |
|---|---|---|
| No file >200 lines | [PASS/FAIL] | |
| No function complexity >10 | [PASS/FAIL] | |
| No hardcoded secrets | [PASS/FAIL] | |
| Cloud abstraction intact | [PASS/FAIL] | |
| HITL MATRIX followed | [PASS/FAIL] | |
| Security headers present | [PASS/FAIL] | |
| Dependency audit clean | [PASS/FAIL] | |

## Open Findings
| Severity | Finding | Owner | Target date |
|---|---|---|---|
| [CRIT/HIGH/MED/LOW] | [description] | [agent] | [date] |

## Verdict
CRITICAL findings: [n] — blocks LAUNCH-READY if >0
HIGH findings:     [n] — must have resolution plan before LAUNCH-READY
Overall:           [PASS | CONDITIONAL PASS — describe | FAIL — list blockers]
```

---

## [SHARED-FUNCTION-REGISTRY]
Owner: BUILDER (maintained) | TITAN (reviews additions crossing service boundaries).
Location: section inside ARCHITECTURE.md — not a standalone file.
Written during: SCAFFOLD mode (seeded). Updated every time a shared function is added or removed.
Referenced by: BUILDER (pre-flight scan), SCHOLAR (DRY-AUDIT), GREENFIELD-PIPELINE (PLANNER mode).

```markdown
## SHARED FUNCTION REGISTRY
# Single source of truth for functions used by more than one file.
# BUILDER must scan this before writing any function — prevent duplication at source.
# Update this registry whenever a new shared function is created or an existing one is removed.
# Format: [function name] | [file] | [signature summary] | [consumers]

### Auth + Session
| Function | File | Signature | Consumers |
|---|---|---|---|
| `getCurrentUser` | lib/auth.ts | `(req) → User \| null` | [list files] |
| `requireAuth` | lib/middleware.ts | `(req, res, next) → void` | [list routes] |

### Data Access
| Function | File | Signature | Consumers |
|---|---|---|---|
| `paginatedQuery` | lib/db.ts | `(model, page, limit) → Page<T>` | [list files] |

### Error Handling
| Function | File | Signature | Consumers |
|---|---|---|---|
| `AppError` | lib/errors.ts | `(code, message, status) → AppError` | [all service files] |

### AI + Cache
| Function | File | Signature | Consumers |
|---|---|---|---|
| `cachedCompletion` | lib/ai/cached-completion.ts | `(params) → Promise<string>` | [list files] |
| `selectModel` | lib/ai/model-router.ts | `(task: AITask) → ModelConfig` | [list files] |

### Analytics
| Function | File | Signature | Consumers |
|---|---|---|---|
| `trackEvent` | lib/analytics/track.ts | `(name, params) → void` | [all feature files] |

# Add new sections as the project grows (Payments, Notifications, etc.)
# Remove entries when functions are deleted — stale entries cause false confidence
```

**Registry discipline:**
- BUILDER pre-flight: scan registry before writing any function (prevents accidental duplication)
- BUILDER post-write: update registry immediately after creating a new shared function
- SCHOLAR DRY-AUDIT: cross-reference registry against codebase — any shared function not registered is a gap
- TITAN PLANNER: list "Shared functions to create" and "Shared functions to reuse" from registry in every execution graph

---

## [ARCHITECTURE]
Owner: TITAN. Written during ARCHITECT mode. Hard block: no IaC, SCAFFOLD, or BUILDER
until this file exists and is approved.
Referenced by: BUILDER (pre-flight), TITAN (DRIFT-AUDIT), GREENFIELD-PIPELINE (ARCHITECT gate).

```markdown
# ARCHITECTURE.md
# Produced by: TITAN → ARCHITECT mode
# Status: [DRAFT | APPROVED | UPDATED — date of last change]
# Last updated: [ISO date]
================================================================================

## Architecture Style Decision
Style:        [Monolith | Modular Monolith | Microservices | Event-Driven]
ADR:          docs/adr/[NNN]-architecture-style.md
Rationale:    [one sentence — why this style for this product at this stage]
Review trigger: [what event would cause reconsideration — e.g. PMF + team >10]

## C4 Model

### Level 1 — System Context
[Describe external actors and external systems. Diagram or structured list.]
Actor:  [user type] → interacts with → [system name] via [channel]
System: [external system name] | [what data flows] | [direction: in | out | both]

### Level 2 — Containers
[Deployable units. Each gets a row.]
| Container | Technology | Responsibility | Exposes |
|---|---|---|---|
| [name] | [Next.js/Python/Go/etc] | [what it does] | [API/queue/none] |

### Level 3 — Key Components (major files only — not exhaustive)
[Inside each container, list only architecturally significant components.]
Container: [name]
  [filename] — [responsibility — one sentence]
  [filename] — [responsibility — one sentence]

## Layer Architecture
```
Route     → [input parsing + auth + response shaping only — no business logic]
Service   → [business logic + orchestration — no direct DB access]
Repository → [data access only — no business logic]
Database  → [schema + migrations]
```
Fitness function: bash scripts/fitness-check.sh — enforces layer boundaries on every PR.

## Monorepo / Polyrepo Decision
Structure: [Monorepo | Polyrepo]
ADR:       docs/adr/[NNN]-repo-structure.md

## File Structure Reference
Canonical file tree: Read(".claude/reference/FILE-TREE.md")
Deviations from canonical tree (each requires an ADR):
  [filename] | [deviation] | ADR: [NNN]

## SHARED FUNCTION REGISTRY
[See TEMPLATES.md → [SHARED-FUNCTION-REGISTRY] for format]
[Populate during SCAFFOLD mode — BUILDER must scan this before writing any function]

## DECISIONS LOCKED
[Auth strategy | DB choice | Architecture style | AI provider | Frontend framework | Stack]
[Promoted here from CONTEXT.md DECISIONS THIS SESSION via MEMORY-TRIAGE.md Step 1]
[Format: ISO date | domain: decision | Rationale: one sentence | ADR: NNN | Reversibility: easy|hard|irreversible]
```

---

## [INFRASTRUCTURE]
Owner: TITAN. Written during INFRA-DESIGN mode. Required before SLO-DESIGN.
Referenced by: BUILDER (AI call patterns), GAUGE (cost model), GREENFIELD-PIPELINE (INFRA-DESIGN gate).

```markdown
# INFRASTRUCTURE.md
# Produced by: TITAN → INFRA-DESIGN mode
# Status: [DRAFT | APPROVED | UPDATED — date of last change]
# Last updated: [ISO date]
================================================================================

## AI Usage Strategy
[Complete this section for every AI-powered feature. Skip if product has no AI features.]

| Feature | Model tier | Call type | Cache eligible | Est. tokens/call | Est. cost/1k users/day |
|---|---|---|---|---|---|
| [feature name] | [simple/complex/reasoning] | [completion/embedding/structured] | [yes/no] | [n in / n out] | $[n] |

Model routing: lib/ai/model-router.ts — all model strings defined here, none hardcoded in app code.
Cache strategy: cachedCompletion() for all calls with stable prompt prefix — target cache hit rate ≥60%.
Cost cap: $[n]/month hard limit | per-user rate limit: [n] AI calls/day | alert at 80% of cap.

## Caching Strategy
Provider:    [Redis | Upstash | Memcached | in-memory — and why]
Interface:   lib/cache/interface.ts (abstracted — see TITAN.md cloud agnostic strategy)
TTL policy:
  [data type]: [TTL] — [rationale: read frequency vs staleness tolerance]
Invalidation: [event-driven | TTL-only | manual — describe triggers]

## Queue / Async Strategy
Provider:    [BullMQ | SQS | Pub/Sub | none — and why]
Queues:
  [queue name]: [consumer] | [retry policy] | [DLQ: yes/no] | [visibility timeout]
Background jobs: [list recurring jobs and cadence]

## Real-time Strategy (skip if not applicable)
Protocol:   [WebSocket | SSE | long-poll | none]
Provider:   [Pusher | Ably | native — via abstraction layer]
Use cases:  [list features requiring real-time updates]

## Multi-tenancy Infrastructure (skip if single-tenant)
Isolation:  [DB-level RLS | schema-per-tenant | DB-per-tenant]
Tenant ID propagation: [describe how tenant_id flows from auth → service → repository]
Admin access: [how cross-tenant access is controlled and audited]

## Cloud Abstraction Interfaces
All four interfaces must exist before first BUILDER session:
  lib/database/interface.ts  — DB contract (template: TITAN.md)
  lib/storage/interface.ts   — Storage contract
  lib/cache/interface.ts     — Cache contract
  lib/ai/interface.ts        — AI contract
Provider implementations: lib/[domain]/providers/[provider].ts

## Data Portability
  scripts/export-data.ts   — full DB + media + config export
  scripts/import-data.ts   — clean import to fresh environment
  scripts/verify-export.ts — verify export completeness
Status: [planned | implemented | tested]

## Cost Model
| Service | Provider | Unit cost | Est. monthly at [N] users | Alert threshold |
|---|---|---|---|---|
| DB | [provider] | $[n]/[unit] | $[n] | $[n] |
| Storage | [provider] | $[n]/GB | $[n] | $[n] |
| AI | [provider] | $[n]/1M tokens | $[n] | $[n] |
| Queue | [provider] | $[n]/[unit] | $[n] | $[n] |
Total estimated: $[n]/month at [N] users | Break-even: [N] users at $[price]
```

---

## [EXPERIMENTS]
Owner: ANALYST (owns the register) | ORACLE (defines hypotheses from SPEC). Both can write.
Written during: BUSINESS-METRICS mode (baseline) | BUSINESS-REVIEW mode (results added).
Referenced by: ANALYST BUSINESS-REVIEW checklist ("Experiment results reviewed").

```markdown
# EXPERIMENTS.md — A/B Test + Experiment Register
# Produced by: ANALYST → BUSINESS-METRICS mode (initial) | updated in BUSINESS-REVIEW
# Status: living document — updated whenever an experiment starts, completes, or is decided.
================================================================================

## Active Experiments

### Experiment: [short name — e.g. "Onboarding-CTA-v2"]
Hypothesis:       If we [change], then [metric] will [direction] because [rationale].
Primary metric:   [specific measurable metric — e.g. "Day-1 activation rate"]
Guardrail metric: [what must NOT degrade — e.g. "Day-7 retention must not drop >5%"]
Variants:
  Control:        [describe current state]
  Treatment:      [describe what changes]
Start date:       [ISO date]
Audience:         [% of users | segment]
Measurement window: [n days — minimum for statistical significance]
Minimum detectable effect: [n]% change at [80|90|95]% confidence
Status:           RUNNING | PAUSED | COMPLETE | DECIDED
Owner:            [agent: ANALYST | ORACLE]

---

## Completed Experiments

### Experiment: [name]
[Copy structure from Active Experiments above, then add:]
End date:         [ISO date]
Result:
  Primary metric: [baseline] → [result] ([+/-n]%, p=[value])
  Guardrail:      [result — did it hold?]
Statistical significance: [yes — [confidence]% | no — underpowered]
Decision:         [SHIP TREATMENT | REVERT TO CONTROL | ITERATE — describe next variant]
Decision date:    [ISO date]
Decision owner:   [who made the call — route through ORACLE for spec decisions]
Learnings:        [what this tells us about user behaviour — for KNOWLEDGE-BASE.md if significant]

---

## Decided — Archive

[Move COMPLETE + DECIDED experiments here after decision is recorded. Never delete —
 historical experiment results inform future product decisions.]
```
