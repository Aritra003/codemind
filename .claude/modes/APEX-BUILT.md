# APEX-BUILT.md — Lifecycle Profiles for Apex-Built Systems
# Load: Read(".claude/modes/APEX-BUILT.md") → [FEATURE|HOTFIX] section when entering that profile
# Codebase state: src/ exists AND was built by Apex (ARCHITECTURE.md + .claude/ folder present)
# Author: Ashish Khandelwal, Arup Kolay | Apex Runtime v1.5
================================================================================

## WHAT IS APEX-BUILT

An APEX-BUILT codebase is one where:
- `src/` exists (code is already written)
- `ARCHITECTURE.md` exists and is current
- `.claude/` folder is present with agent and mode files
- The system was built using Apex — structure, conventions, and output documents are known

Contrast with BROWNFIELD: a non-Apex codebase requires INTAKE to map unknown territory.
An APEX-BUILT system is known territory — no INTAKE needed, no ARCHAEOLOGY required.

Pre-condition check (run at session start before activating any APEX-BUILT profile):
[ ] ARCHITECTURE.md exists and reflects current implementation
[ ] SPEC.md exists (may need a SPEC DELTA for the current feature)
[ ] THREAT-MODEL.md exists and is current
[ ] DESIGN-SYSTEM.md exists (if product has UI)
If any pre-condition is missing: run the relevant greenfield mode to produce it, then proceed.

================================================================================
## PROFILE: FEATURE
When to use: adding an incremental feature to a running Apex-built system.
             Architecture exists. Conventions are established. Team knows the codebase.

### Pre-conditions
[ ] ARCHITECTURE.md current — TITAN confirmed no structural changes required for this feature
[ ] DESIGN-SYSTEM.md current — ARTISAN confirmed design tokens cover this feature (if UI)
[ ] THREAT-MODEL.md current — SENTINEL confirmed no new attack surface without assessment

### SPEC DELTA (replaces SPEC mode for FEATURE profile)
Do not create a new SPEC.md. Amend the existing one.
ORACLE adds a `## DELTA: [feature name] [ISO date]` section to SPEC.md containing:
  - What this feature adds (user flows in GIVEN/WHEN/THEN format)
  - New INVARIANTS introduced (INV-xxx)
  - New data types or external services (triggers THREAT-MODEL.md update)
  - Updated success metrics
  - What explicitly remains out of scope for this delta

### Mandatory gate sequence
SPEC DELTA → CRITIC → PLANNER → TDD → BUILDER
→ DESIGN-REVIEW (if UI) → ACCESSIBILITY (if UI)
→ REVIEW → VERIFY → PERF → DRY-AUDIT → INTEGRATION → QA
→ DRIFT-AUDIT → LAUNCH-READY

### Gates skipped (PERMANENT — log in CONTEXT.md GATE SKIPS)
EVENT-STORM     — domain is already mapped; run only if new bounded context is introduced
ARCHITECT       — architecture exists; run only if feature requires structural change (→ ADR)
ADR             — only if architecture changes; otherwise not needed
API-DESIGN      — only if new endpoints are added; update API-DESIGN.md for those only
SECURITY (full STRIDE) — SENTINEL runs security dimension of VERIFY instead
INFRA-DESIGN    — only if new infrastructure is required for this feature
SLO-DESIGN      — only if new SLO tiers are introduced; update SLO.md for those only
OBSERVABILITY   — update OBSERVABILITY.md for the new feature only (not full mode)
BUSINESS-METRICS — update BUSINESS-METRICS.md for new metrics only (not full mode)
ESCALATION-TREE — already exists; update only if ownership changes
COMPLIANCE-LEGAL — run only if feature introduces new data types, markets, or AI usage
DESIGNER        — update DESIGN-SYSTEM.md for new patterns only (not full mode)
CONTENT         — update CONTENT-GUIDE.md for new copy only (not full mode)
RUNBOOK         — run only if feature changes SLO tiers on a CRITICAL service
IaC             — run only if feature requires infrastructure changes
SCAFFOLD        — codebase already scaffolded; add new files only where needed

### Load instruction
  Read(".claude/modes/APEX-BUILT.md") → PROFILE: FEATURE section on profile activation.
  Then load agent files and pipeline mode sections as normal per gate.

================================================================================
## PROFILE: HOTFIX
When to use: urgent production issue requiring an immediate, tightly scoped fix.
             P0 or P1 severity only. Active production incident or critical bug.

### Hard constraints (non-negotiable)
- Max blast radius: 3 files changed. More than 3 files = not a hotfix, escalate to FEATURE.
- Max implementation window: 2 hours from first BUILDER file write to deploy.
- No new dependencies. No schema changes without explicit TITAN approval.
- Reproduction case required before any code is written. No fix without a failing test.
- Pipeline profile in CONTEXT.md must be set to HOTFIX before session starts.

### Mandatory gate sequence
VERIFY (reproduce) → BUILDER → VERIFY → SENTINEL (security dimension only)
→ COMPRESSED-LAUNCH-READY

**VERIFY (reproduce):** BREAKER must produce a failing test that demonstrates the bug
before BUILDER writes a single line. No reproduction = no fix. This is the hard gate.
The test becomes the regression guard.

**BUILDER:** Minimal change only. Fix the specific failure the test exposes.
Do not refactor, improve, or extend while fixing. Separate PR if improvements are needed.

**VERIFY (post-fix):** BREAKER reruns full attack checklist on changed files only.
SENTINEL runs OWASP Top 10 on any changed file touching auth/payments/PII.

**COMPRESSED-LAUNCH-READY:** see LAUNCH-READY.md → HOTFIX Compressed Sign-off section.

### Gates skipped (all others — PERMANENT for HOTFIX profile)
All greenfield pipeline modes not listed above are skipped for HOTFIX.
Log one entry in CONTEXT.md GATE SKIPS covering all skipped modes:
```
GATE SKIP: ALL non-HOTFIX gates | [ISO date]
  Reason:  Active production incident — HOTFIX profile active
  Type:    PERMANENT for this session
  Trigger: N/A — post-deploy follow-up PR runs full FEATURE pipeline on related changes
  Owner:   STEWARD confirms HOTFIX scope before session starts
  Risk:    Narrow scope enforced by 3-file blast radius limit
```

### Post-deploy follow-up (within 24h)
After HOTFIX deploy: open a follow-up PR running the full FEATURE pipeline on any
adjacent code that could benefit from the context of the fix.
DOCTOR writes a POST-MORTEM entry regardless of P-level. Cannot be skipped.

### Load instruction
  Read(".claude/modes/APEX-BUILT.md") → PROFILE: HOTFIX section on profile activation.
