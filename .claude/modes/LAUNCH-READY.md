# LAUNCH-READY MODE — Pre-Production Gate
# Load: Read(".claude/modes/LAUNCH-READY.md") when entering LAUNCH-READY
================================================================================
All agents must sign off. Any FAIL blocks launch. No exceptions. No "we'll fix it later."

## ORACLE Sign-off
[ ] SPEC.md complete and CRITIC-approved (including all REQUIREMENT CHANGELOG entries applied)
[ ] Every user flow has GIVEN/WHEN/THEN acceptance criteria
[ ] Every INVARIANT has a corresponding automated test
[ ] Success metrics defined, baseline measured, tracking verified active
[ ] Riskiest assumptions acknowledged with validation plans
[ ] All incremental requirement changes reflected in final spec

## TITAN Sign-off
[ ] ARCHITECTURE.md reflects actual implementation (not plan)
[ ] All major decisions have ADRs with status ACCEPTED (including monorepo/polyrepo decision)
[ ] No PROPOSED ADRs blocking any shipped feature
[ ] INFRASTRUCTURE.md complete — AI strategy, cost model, observability defined
[ ] SLO.md complete — tiers assigned, error budgets set, alerts configured
[ ] Zero-downtime deploy plan documented
[ ] Cloud abstraction interfaces implemented (DB/Storage/Cache/AI)
[ ] Data portability scripts exist and tested (export/import/verify)
[ ] CI/CD pipeline fully defined and tested end-to-end
[ ] Git branching strategy documented in ADR

## SENTINEL Sign-off
[ ] THREAT-MODEL.md complete — STRIDE per component + OWASP checklist
[ ] Zero CRITICAL/HIGH unmitigated security findings
[ ] Auth hardening standards met (JWT timeouts, httpOnly cookies, brute force protection)
[ ] Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
[ ] npm audit: zero CRITICAL/HIGH in production dependencies
[ ] PII: encryption at rest plan documented and implemented
[ ] AI features: prompt injection analysis complete
[ ] GDPR-REGISTER.md complete (if handling EU user data)

## BUILDER Sign-off
[ ] Self-healing loop GREEN on all files (QUALITY_GATES from CONTEXT.md)
[ ] No file >200 lines, no function >30 lines, cognitive complexity ≤10
[ ] All acceptance criteria implemented and verified
[ ] Zero hallucinated APIs — tsc --noEmit passes, BUILDER G1–G5 grounding protocol followed
[ ] Zero console.* in src/, zero debugger, all TODOs have ticket refs
[ ] Feature flags: all new features behind evaluateFlag() with expiry dates set
[ ] validate-env.ts: all required env vars validated at startup

## BREAKER Sign-off
[ ] VERIFY passed on all CRITICAL-tier services, auth paths, payment paths
[ ] All adversarial attack vectors documented (not just passed — documented)
[ ] QA-REPORT.md complete — all user flows tested including edge cases
[ ] Property-based tests passing for all invariant-heavy logic
[ ] All REQUIREMENT CHANGELOG entries tested (not just original spec)

## GAUGE Sign-off
[ ] p99 baselines measured and within SLO targets
[ ] LCP ≤2.5s on target device/connection (if web UI)
[ ] No DB query >100ms without index explanation
[ ] Bundle size within defined budget (if web UI)
[ ] AI cost estimate per user/month calculated and within budget
[ ] Load test run against staging for CRITICAL/STANDARD endpoints

## ARTISAN Sign-off (if UI exists)
[ ] DESIGN-SYSTEM.md complete — all tokens defined in tokens.css
[ ] All components have all 7 interactive states implemented
[ ] WCAG 2.1 AA accessibility: automated scan (axe/pa11y) passing
[ ] No hardcoded visual values outside tokens.css
[ ] Accessibility automated check configured in CI

## QUILL Sign-off (if user-facing copy exists)
[ ] CONTENT-GUIDE.md complete — brand voice defined
[ ] Zero placeholder text anywhere in the product
[ ] All error messages: explain what + why + what to do (never blame user)
[ ] All button labels: verb + specific outcome (no single-word labels)
[ ] CHANGELOG.md entry written in user-facing language

## STEWARD Sign-off
[ ] ESCALATION-TREE.md complete — all contacts verified reachable
[ ] Rollback procedure documented and tested on staging
[ ] Rollback command documented with exact syntax: [command]
[ ] Health check endpoint active and monitored
[ ] Smoke test suite passes on staging
[ ] Canary deploy plan: 5% traffic, 30-min observation, auto-rollback triggers defined
[ ] Production owner declared in CONTEXT.md
[ ] All agents have signed off:
    ORACLE | TITAN | SENTINEL | BUILDER | BREAKER | DOCTOR | SCHOLAR |
    GAUGE | ARTISAN | QUILL | ANALYST | COUNSEL | STEWARD

## ANALYST Sign-off
[ ] Pre-launch business metrics baseline captured
[ ] Success metrics tracking verified live in analytics tool
[ ] Guardrail metric alerts configured (retention, support volume)
[ ] Feature rollback trigger defined (specific metric threshold)
[ ] ANALYTICS-SCHEMA.md complete — all tracked events comply with ANALYTICS-PROTOCOL.md naming convention
[ ] Consent Mode v2 implemented and verified — SENTINEL sign-off on GDPR-REGISTER.md analytics entries
[ ] GATE SKIPS reviewed: all DEFERRED skips in CONTEXT.md either completed (archived from
    GATE SKIPS section) or formally reclassified as PERMANENT with owner agent sign-off.
    Any open DEFERRED skip without completion or permanent exception = LAUNCH-READY blocked.

## DOCTOR Sign-off
[ ] RUNBOOK exists for every service assigned SLO tier CRITICAL
[ ] Each runbook has been walked through at least once — not just written
[ ] Rollback procedure is documented in each runbook with exact commands
[ ] On-call escalation path tested — all contacts in ESCALATION-TREE.md reachable
[ ] Post-mortem process defined — P0/P1 trigger and 24-hour completion SLA confirmed

## SCHOLAR Sign-off
[ ] No file >200 lines in src/ (drift check: `find src -name "*.ts" | xargs wc -l | sort -rn | head -5`)
[ ] Cognitive complexity ≤10 across all files (sonarjs / radon / gocognit passing in CI)
[ ] TECH-DEBT.md exists — all known debt scored and prioritised
[ ] No unresolved CRITICAL or HIGH debt items that block safe operation
[ ] DRY-AUDIT run — no accidental duplications shipping in this release

## COUNSEL Sign-off
[ ] LEGAL-REVIEW.md complete — all checklist items PASS or risk-accepted with documentation
[ ] GDPR-REGISTER.md complete (if product processes EU personal data)
[ ] No unresolved CRITICAL compliance findings in CONTEXT.md ISSUES OPEN
[ ] Privacy policy live and accurate before any user data collected
[ ] License audit clean — no GPL/AGPL in commercial production dependencies

---

## POST-LAUNCH MONITORING PROTOCOL
1h after deploy: check error rate vs baseline, p99 vs baseline, business metrics normal
24h after deploy: check day-1 retention signal, support ticket volume
7 days after deploy: check primary metric vs target, guardrail metrics vs baseline
Rollback trigger: error rate >2x baseline | p99 >2x baseline | health check fail | smoke fail

---

## HOTFIX Compressed Sign-off
For HOTFIX profile (APEX-BUILT.md) only. Replaces standard LAUNCH-READY for P0/P1 fixes.
Full LAUNCH-READY gate runs on the follow-up FEATURE PR within the next sprint.

### Pre-deploy sign-offs (mandatory — block deploy until all three confirmed)

**STEWARD:**
[ ] Rollback command documented with exact syntax and tested on staging
[ ] On-call engineer notified and standing by during deploy window
[ ] Incident record updated with fix description and expected resolution
Log: `HOTFIX PRE-DEPLOY: STEWARD — [ISO date] — rollback ready, on-call notified`

**SENTINEL:**
[ ] Changed files reviewed — no new attack surface opened by this fix
[ ] OWASP Top 10 checklist run on any file touching auth/payments/PII
[ ] No new dependency introduced; no secrets added to source
Log: `HOTFIX PRE-DEPLOY: SENTINEL — [ISO date] — no new security surface`

**BUILDER:**
[ ] Reproduction test passes (confirms bug existed before fix)
[ ] Fix test passes (confirms bug is resolved)
[ ] Regression suite green on changed files (Tier 2 green)
[ ] Blast radius confirmed ≤3 files
Log: `HOTFIX PRE-DEPLOY: BUILDER — [ISO date] — tests green, blast radius [N] files`

### Post-deploy sign-offs (within 24h of deploy — flag to STEWARD if missed)

All remaining agents sign off within 24h or raise a blocking finding:
ORACLE | TITAN | BREAKER | DOCTOR | SCHOLAR | GAUGE | ARTISAN | QUILL | ANALYST | COUNSEL

If a post-deploy agent finds a blocking issue → incident declared immediately.
DOCTOR takes technical lead. STEWARD owns communication. Do not wait for 24h window.

Post-deploy sign-off format (each agent writes to CONTEXT.md):
`HOTFIX POST-DEPLOY: [AGENT] — [ISO date] — [PASS: no issues | FINDING: description]`

### Mandatory follow-up (non-negotiable)
- DOCTOR writes POST-MORTEM entry within 24h regardless of P-level. Cannot be skipped.
- Follow-up FEATURE PR opened within next sprint covering adjacent improvements.
- KNOWLEDGE-BASE.md entry written for any root cause that could recur.
