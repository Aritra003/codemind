# BROWNFIELD MODES — Intake, Reverse-Spec, Archaeology, Characterize, Compliance-Gap, Brownfield-Debt
# Load: Read(".claude/modes/BROWNFIELD.md") when entering any brownfield mode
================================================================================

## BROWNFIELD PRIME DIRECTIVES (override greenfield when in conflict)
1. MAP BEFORE TOUCH. Never modify existing code before understanding what it does.
2. CHARACTERIZE BEFORE REFACTOR. Write tests describing current behaviour first.
3. NEVER MAKE IT WORSE. Leave test coverage higher, complexity same or lower, security same or better.
4. INCREMENTAL ADOPTION. Standards in priority order: security → correctness → quality → style.
5. PRODUCTION IS SACRED. Every change to existing behaviour requires explicit reasoning about production impact.

---

## MODE: INTAKE [AGENT: TITAN + SCHOLAR]
Job: First session on an existing codebase. Map everything. Touch nothing.
Output: INTAKE-REPORT.md — foundation for every decision that follows.
Duration: 1–3 sessions depending on size. Non-negotiable. No other work begins until complete.

### Phase 1: Inventory (SCHOLAR leads)
```bash
find src/ -name "*.ts" | wc -l                    # total files
find src/ -name "*.test.ts" | wc -l               # test files
wc -l src/**/*.ts | sort -rn | head -20            # largest files
git log --oneline -20                              # recent history
vitest run --coverage 2>/dev/null                  # coverage baseline (COVERAGE FLOOR — never go below)
cat package.json | jq '.dependencies'              # dependency inventory
npm audit --json | jq '.metadata'                  # security posture
grep -r "fetch\|axios\|got" src/ -l                # external API discovery
```
Record: EXTERNAL-APIS-DISCOVERED.md for every external service found.

### Phase 2: Architecture Mapping (TITAN leads)
```bash
npx madge --circular src/                          # circular dependency inventory
```
Generate C4 Level 1 + Level 2 from ACTUAL imports. Label each: UNDERSTOOD / PARTIALLY-UNDERSTOOD / UNKNOWN.

### Phase 3: Health Scoring (SCHOLAR produces)
Score 1–10 per dimension. Record in INTAKE-REPORT.md.
- Test coverage: 10=>80% | 5=>40% | 1=<10%
- Architecture clarity: 10=clear layers | 5=some structure | 1=ball of mud
- Security posture: 10=no audit vulns | 5=medium vulns | 1=critical vulns
- Type safety: 10=strict TS | 5=partial | 1=all any/js
- Dependency health: 10=all current | 5=some outdated | 1=critical vulns

DO-NOT-TOUCH ZONES: Identify files with 0% coverage + financial/auth logic, or >10 importers + no tests.
Format in INTAKE-REPORT.md: Zone | Risk | Required before touching.
Rule: BUILDER must not modify a DO-NOT-TOUCH zone without TITAN + BREAKER sign-off.

### INTAKE-REPORT.md REQUIRED STRUCTURE

```markdown
# INTAKE-REPORT.md
# Produced by: TITAN + SCHOLAR → INTAKE mode
# Status: [IN PROGRESS | COMPLETE — must be complete before any feature work begins]
================================================================================

## Inventory Summary (Phase 1 — SCHOLAR)
Total source files:   [n]
Total test files:     [n] ([coverage]% coverage baseline — COVERAGE FLOOR, never decrease)
Largest files:        [top 5 by line count — filename | lines]
Recent git activity:  [summary of last 20 commits — active areas vs stale areas]
Dependency count:     [n direct] | [n dev]
Security posture:     [npm audit summary — CRITICAL: n | HIGH: n | MEDIUM: n]
External APIs found:  [list — detail in EXTERNAL-APIS-DISCOVERED.md]

## Architecture Map (Phase 2 — TITAN)
C4 Level 1 — System context:
  [external actors and systems — name | direction | what data]
C4 Level 2 — Containers:
  [deployable units — name | tech | status: UNDERSTOOD/PARTIALLY-UNDERSTOOD/UNKNOWN]
Circular dependencies: [n clusters — list top 3 by impact]
Layer violations found: [describe | none]

## Health Scores (Phase 3 — SCHOLAR)
| Dimension | Score (1–10) | Evidence |
|---|---|---|
| Test coverage | [n] | [coverage]% overall |
| Architecture clarity | [n] | [clear layers / some structure / ball of mud] |
| Security posture | [n] | [CRITICAL/HIGH vuln count] |
| Type safety | [n] | [strict TS / partial / all any] |
| Dependency health | [n] | [all current / some outdated / critical vulns] |
Overall health: [n]/10 | Recommended first priority: [what to address first]

## DO-NOT-TOUCH Zones
| Zone (file/module) | Risk | Coverage | Importers | Required before touching |
|---|---|---|---|---|
| [path] | [financial/auth/core] | [n]% | [n] | [what must be in place first] |

## ARCHAEOLOGY Findings
[Populated during ARCHAEOLOGY mode — one block per investigated component]
Component:    [name]
Status:       UNDERSTOOD | PARTIALLY-UNDERSTOOD | STILL-UNKNOWN
Behaviour:    [what it actually does — specific, not vague]
Assumptions:  [what callers depend on that isn't written down]
Risk:         [what could break if this is touched]
Safe seams:   [where BUILDER can safely make changes with low blast radius]
Blockers:     [what must be resolved before this can be changed]
```

---

## MODE: CHARACTERIZE [AGENT: BREAKER + BUILDER]
Job: Write characterization (golden master) tests for existing code BEFORE any changes.
Rule: you cannot safely change what you cannot observe.

Division of labour:
  BUILDER: produces the characterization tests — finds entry points, constructs realistic
           inputs, records current outputs as golden masters. Owns Steps 1–4 below.
  BREAKER: adversarially validates the test suite — challenges completeness, attempts to
           find behaviours BUILDER didn't capture, and formally signs off that the baseline
           is trustworthy enough to be relied on. Owns the DO-NOT-TOUCH gate verdict.

Neither agent may sign off on the other's work. BUILDER does not approve the baseline.
BREAKER does not write the tests.

### BUILDER Protocol (Steps 1–4)
Step 1: Find entry points — every public function, API endpoint, event handler.
Step 2: Write test that calls it with realistic inputs and records current output:
```typescript
it('characterizes: [describe what code does]', async () => {
  const result = await existingFunction(realisticInput)
  expect(result).toMatchSnapshot() // golden master
})
```
Step 3: Run. Should PASS (recording current behaviour). If throws: document in BUGS-DISCOVERED.md. Do NOT fix yet.
Step 4: Commit as baseline: `git commit -m "test(characterize): golden master for [module]"`
        Declare to BREAKER: "Characterization complete for [module] — ready for adversarial review."

COVERAGE RATCHET (mandatory on brownfield):
Add `"test:ratchet"` script — fails if ANY file's coverage decreased vs .coverage-floor.json.
.coverage-floor.json committed to git. Coverage can only increase or stay same. Never decrease.

### BREAKER Adversarial Review
After BUILDER declares characterization complete:
[ ] Run the test suite — confirm 100% pass rate on BUILDER's golden masters
[ ] Identify edge cases BUILDER's inputs did not cover:
    nulls | empty collections | maximum values | concurrent calls | partial failures
[ ] For each gap found: write an additional characterization test (still golden master style,
    not an assertion of correct behaviour — record what actually happens)
[ ] Attempt to find behaviours that would surprise a future developer:
    non-obvious side effects | state mutations | external calls | error swallowing
[ ] Sign off or request additional tests: "BREAKER CHARACTERIZE VERDICT: [PASS | GAPS FOUND: list]"

DO-NOT-TOUCH zone entry requirement (all 4 before touching):
[ ] BUILDER: characterization tests written and committed
[ ] BUILDER: coverage for zone >60%
[ ] TITAN: reviewed and approved seam points
[ ] BREAKER: adversarial review complete — PASS verdict issued

---

## MODE: COMPLIANCE-GAP [AGENT: SCHOLAR + SENTINEL]
Job: Gap between existing code and Apex standards. Prioritized adoption roadmap.
Key insight: applying all standards at once is paralysis. Apply in tiers.

Tier ownership:
  SENTINEL owns TIER 0 + TIER 1 — security and safety items. These are the agent with
  veto power on auth, PII, and vulnerabilities. SENTINEL produces the TIER 0/1 findings.
  SCHOLAR owns TIER 2 + TIER 3 — code quality and standards adoption items. These are
  the agent with authority over technical health and debt. SCHOLAR produces the roadmap.

Document ownership:
  SCHOLAR produces COMPLIANCE-GAP.md (it is a debt and standards document).
  SENTINEL reviews the TIER 0 and TIER 1 sections before the document is finalised —
  any security finding SENTINEL marks CRITICAL is non-negotiable and cannot be
  deferred to a later tier regardless of effort estimate.

### TIER 0 — IMMEDIATE [SENTINEL leads] (blocking — fix before any new feature work)
[ ] SQL injection vectors in any user-input path
[ ] Exposed secrets in source code or git history
[ ] Missing auth on routes handling user data
[ ] CRITICAL npm audit vulnerabilities
[ ] Cross-tenant data access possible

### TIER 1 — WITHIN 30 DAYS [SENTINEL leads, SCHOLAR supports] (parallel with feature work)
[ ] HIGH npm audit vulnerabilities resolved
[ ] Coverage floor established and committed (.coverage-floor.json)
[ ] DO-NOT-TOUCH zones documented in INTAKE-REPORT.md
[ ] ESCALATION-TREE.md created
[ ] Basic error logging active — no silent failures in production paths

### TIER 2 — WITHIN 90 DAYS [SCHOLAR leads]
[ ] REVERSE-SPEC complete
[ ] ARCHAEOLOGY complete for all DO-NOT-TOUCH zones that must be entered
[ ] Characterization tests >50% of critical paths
[ ] Coverage ratchet configured
[ ] Circular dependency clusters <5

### TIER 3 — WITHIN 6 MONTHS [SCHOLAR leads]
[ ] TypeScript strict mode on all new files
[ ] All new code meets full Apex greenfield standards
[ ] COMPLIANCE-GAP.md adoption roadmap actively tracked sprint by sprint

Output: COMPLIANCE-GAP.md — tiered roadmap with effort estimates.

### COMPLIANCE-GAP.md REQUIRED STRUCTURE

```markdown
# COMPLIANCE-GAP.md — Brownfield Standards Adoption Roadmap
# Produced by: SCHOLAR (document owner) + SENTINEL (TIER 0/1 findings)
# Status: [IN PROGRESS | APPROVED — approved before feature work begins on brownfield project]
# Last updated: [ISO date]
================================================================================

## TIER 0 — IMMEDIATE BLOCKERS [SENTINEL owns]
[Fix before any new feature work. Each item is a production safety risk.]
| Gap | Severity | Owner | Status | Due |
|---|---|---|---|---|
| [description] | CRITICAL | SENTINEL | [OPEN/IN PROGRESS/RESOLVED] | [date] |

## TIER 1 — WITHIN 30 DAYS [SENTINEL leads, SCHOLAR supports]
| Gap | Severity | Owner | Status | Due |
|---|---|---|---|---|
| [description] | HIGH | [SENTINEL/SCHOLAR] | [OPEN/IN PROGRESS/RESOLVED] | [date] |

## TIER 2 — WITHIN 90 DAYS [SCHOLAR leads]
| Gap | Area | Effort (days) | Owner | Status |
|---|---|---|---|---|
| [description] | [coverage/architecture/spec] | [n] | SCHOLAR | [OPEN/IN PROGRESS/RESOLVED] |

## TIER 3 — WITHIN 6 MONTHS [SCHOLAR leads]
| Gap | Area | Effort (days) | Owner | Status |
|---|---|---|---|---|
| [description] | [quality/standards] | [n] | SCHOLAR | [OPEN/IN PROGRESS/RESOLVED] |

## Adoption Progress
As of [ISO date]:
  TIER 0: [n] resolved / [n] total
  TIER 1: [n] resolved / [n] total
  TIER 2: [n] resolved / [n] total
  TIER 3: [n] resolved / [n] total
Next review: [ISO date — sprint boundary]
```

---

## MODE: REVERSE-SPEC [AGENT: ORACLE]
Job: Produce SPEC.md for existing product by inferring intent from behaviour.
Rule: code tells you what the product does. Only users tell you what it should do.

Provenance markers (every behaviour gets one):
- VERIFIED: confirmed intentional by [source]
- INFERRED: assumed intentional (no conflicting evidence)
- SUSPECT: looks like a bug or placeholder — needs human confirmation
- UNKNOWN: documented but intent not determinable

Every SUSPECT entry blocks new work on that code path.
Every UNKNOWN is a risk flagged for human review.
Only VERIFIED and INFERRED become binding spec.

Sources (in priority order):
1. Existing tests (assertions = intended behaviour)
2. Git blame + commit messages
3. Human stakeholders
4. Analytics data
5. Support tickets

Output: SPEC.md with provenance markers. Status: DRAFT-REVERSE until stakeholder review.

---

## MODE: ARCHAEOLOGY [AGENT: TITAN + SCHOLAR]
Job: Deep investigation of undocumented or poorly understood code areas identified
     during INTAKE as UNKNOWN or PARTIALLY-UNDERSTOOD. Runs after INTAKE, before or
     during CHARACTERIZE — whenever a code path must be understood before it can be
     safely changed.
Trigger: any DO-NOT-TOUCH zone that must be entered | any UNKNOWN-marked component
         in the C4 diagram that a new feature depends on.

Dual perspective (not a formal split — both agents run the full protocol together):
  TITAN observes for: architectural implications — does this component belong in its
    current layer? Does it cross service boundaries it shouldn't? Does it reveal a
    missing abstraction or an undocumented external dependency? Should the C4 diagram
    be updated to reflect what this component actually does?
  SCHOLAR observes for: code health signals — complexity, coupling, test coverage gaps,
    patterns that will make refactoring risky, debt that must be paid before this can
    be safely changed. Are the safe seams actually safe, or are they entangled in ways
    the file structure doesn't reveal?

The investigation is continuous. There is no handoff point. Both agents contribute to
the same INTAKE-REPORT.md ARCHAEOLOGY section in a single pass.

### Protocol
Step 1: ISOLATE the target — identify exact files and entry points to investigate.
Step 2: READ the git log for the target (`git log --follow -p [file]`).
        Goal: find the original author intent from commit messages and PR descriptions.
        Record: VERIFIED sources directly. Flag gaps.
Step 3: TRACE all callers (`grep -rn "functionName\|ClassName" src/`).
        Map: who depends on this? What contract do they assume?
Step 4: RUN with observation — instrument with temporary logging (not permanent), run
        against staging, capture actual data flow. Remove instrumentation after.
Step 5: DOCUMENT findings in INTAKE-REPORT.md under `ARCHAEOLOGY` section.
        Format: Read(".claude/modes/BROWNFIELD.md") → INTAKE-REPORT.md REQUIRED STRUCTURE → ARCHAEOLOGY Findings.
Step 6: Update C4 diagram labels from PARTIALLY-UNDERSTOOD / UNKNOWN to UNDERSTOOD
        (or document why it remains UNKNOWN and what would resolve it).

Rule: ARCHAEOLOGY output is read-only documentation. No code changes during this mode.
     If a bug is discovered: log in BUGS-DISCOVERED.md, do not fix inline.

---

## MODE: BROWNFIELD-DEBT [AGENT: SCHOLAR + TITAN]
Job: Structured payoff of the highest-risk technical debt identified during INTAKE
     and COMPLIANCE-GAP, executed in parallel with new feature work without derailing it.
Trigger: COMPLIANCE-GAP.md complete + TIER 0 items resolved. Runs as a recurring
         periodic mode throughout brownfield engagement.

### Debt triage protocol
Step 1: Pull all CRITICAL and HIGH items from TECH-DEBT.md and COMPLIANCE-GAP.md.
Step 2: Score each item using the DEBT-AUDIT formula (SCHOLAR.md):
        `(severity × 3) + (effort_inverse × 2) + (risk_to_fix_inverse × 1)`
Step 3: Sort by score descending. The top 3 items are the current payoff queue.
        Work only 1 item at a time. Complete, verify, merge before starting the next.
Step 4: For each item:
        [ ] CHARACTERIZE first — coverage ≥60% on target before touching it
        [ ] One debt type per PR (complexity | duplication | coupling | coverage | security)
        [ ] Tests GREEN before and after every change
        [ ] Complexity DELTA negative or documented reason why not
        [ ] TITAN review if change crosses service boundaries or modifies public API
        [ ] Update TECH-DEBT.md entry: mark RESOLVED with date and PR reference

### Capacity rule
Brownfield-debt work must not consume >30% of sprint capacity.
If debt payoff is blocking feature delivery: escalate to STEWARD for prioritisation.
New features must not be added to files with unresolved CRITICAL debt items — fix debt first.

Output: updated TECH-DEBT.md with RESOLVED items archived. COMPLIANCE-GAP.md adoption
        roadmap percentage updated each sprint.
