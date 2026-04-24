# LEGAL-REVIEW.md — CodeMind Legal + Compliance Review
# Mode: COMPLIANCE-LEGAL | Agent: COUNSEL
# Input: GDPR-REGISTER.md · INFRASTRUCTURE.md · API-DESIGN.md · ANALYTICS-SCHEMA.md · THREAT-MODEL.md
# Last updated: 2026-04-23
# Rule: Any CRITICAL finding blocks LAUNCH-READY until resolved.
# ⚠️  Items marked [HUMAN LAWYER REQUIRED] must be signed off by retained counsel before launch.
================================================================================

## Summary

| Category | Status | Open Findings |
|---|---|---|
| Data Protection + GDPR | CONDITIONAL | 3 open (CV-001, CV-002, CV-003) |
| AI-Specific Legal | CONDITIONAL | 1 open (CV-004) |
| Intellectual Property (License) | DEFERRED | License checker runs at SCAFFOLD |
| Consumer + Subscription Law | PASS | No blocking issues |
| Privacy Policy | REQUIRED BEFORE LAUNCH | Draft required |
| Terms of Service | REQUIRED BEFORE LAUNCH | Draft required |
| Data Processing Agreements | REQUIRED BEFORE LAUNCH | 5 DPAs unsigned |

Gate status: CONDITIONAL PASS — 4 COUNSEL findings open. Pipeline may continue to
DESIGNER/CONTENT/RUNBOOK/IaC. CRITICAL findings (CV-001, CV-003) block LAUNCH-READY.

================================================================================
## SECTION 1: Data Protection + GDPR Assessment
================================================================================

### Checklist Results

[x] Every category of personal data collected is documented in GDPR-REGISTER.md (PA-01..PA-06)
    → PASS: 6 processing activities documented with data type, legal basis, retention, processor.

[x] Legal basis for each data processing activity is identified and defensible
    → PASS: Contract (PA-01..04), Consent (PA-05), Legal Obligation (PA-06)
    Note: PA-05 (Telemetry) uses Consent — opt-in design confirmed in ANALYTICS-SCHEMA.md.

[ ] Right-to-erasure workflow exists for all PII data stores
    → CONDITIONAL: GDPR purge BullMQ job exists (INFRASTRUCTURE.md). 30-day SLA defined (SLO-B03).
      FAIL point: POST /auth/data-export and DELETE /auth/account are MISSING from API-DESIGN.md
      (ISSUES OPEN #5). Without these endpoints the right-to-erasure and data-portability
      obligations under GDPR Articles 17 and 20 cannot be fulfilled.
      → Filed as: CV-001 (see Findings below). BLOCKS LAUNCH-READY.

[ ] Privacy Policy accurately reflects what data is collected and why
    → FAIL: No Privacy Policy drafted. Required before any user can create an account.
    → Filed as action item (not a veto — must be completed before LAUNCH-READY, not before SCAFFOLD).

[ ] Cookie consent (if EU users): consent collected before any non-essential cookies set
    → PASS (v1): API uses JWT Bearer tokens, not cookies for auth. Dashboard (Next.js) uses
      first-party session only. No analytics cookies. No third-party tracking pixels.
      Strictly necessary cookies exemption applies for the session cookie.
      If marketing pixels or GA4 are added in v2: re-run this check before launch.

[x] Data retention: automated deletion or anonymisation at stated retention period
    → PASS: PostgreSQL TTL enforced by GDPR purge job (30 days post-deletion).
      ClickHouse TTL: 2-year cold → deletion (INFRASTRUCTURE.md).
      Billing invoices: 7-year retention (legal obligation per GDPR-REGISTER.md PA-04).
      Note: backups must also be subject to purge on GDPR deletion request.
      → Filed as reminder item: GDPR purge runbook must explicitly include backup purge step.

[ ] Data Processing Agreements (DPAs) signed with every third-party processor
    → FAIL: No DPAs signed yet (pre-production). All 5 required. Filed as CV-002 (see below).

---

### COUNSEL FINDING CV-001 — Right-to-Erasure Endpoints Missing [CRITICAL]
```
Finding:    GDPR Articles 17 (right to erasure) and 20 (right to portability) require
            user-facing mechanisms to request account deletion and data export.
            API-DESIGN.md currently has no DELETE /auth/account or POST /auth/data-export
            endpoints (ISSUES OPEN #5).
Risk:       Without these endpoints: (1) no GDPR Article 17 compliance path;
            (2) no self-service for users — manual process is not scalable and is not
            a legally acceptable long-term solution for > 500K MAU.
Resolution: TITAN adds DELETE /auth/account and POST /auth/data-export to API-DESIGN.md
            before SCAFFOLD. BUILDER implements both before LAUNCH-READY.
            Data export must include: account data, subscription history, API key metadata.
            Data export must NOT include: other users' data, raw telemetry (anonymous), Stripe payment instruments.
Blocks:     LAUNCH-READY. Does not block DESIGNER/CONTENT/RUNBOOK/IaC.
Severity:   CRITICAL
Status:     OPEN
```

---

### COUNSEL FINDING CV-002 — DPAs Required with All Data Processors [HIGH]
```
Finding:    GDPR Article 28 requires a Data Processing Agreement with every third-party
            processor that handles EU personal data on CodeMind's behalf.

Required DPAs:
  1. AWS (Amazon Web Services)
     Data processed: all personal data (RDS PostgreSQL, ElastiCache, ECS, S3)
     DPA status:     AWS standard DPA available at aws.amazon.com/agreement/data-processing
                     → SIGN before first EU user data stored in production.
     EU mechanism:   AWS EU Standard Contractual Clauses (SCCs) — available in DPA.

  2. ClickHouse Cloud
     Data processed: anonymous telemetry (install_id = UUID, no personal identity)
     DPA status:     ClickHouse Cloud DPA available — sign before LAUNCH-READY.
     GDPR adequacy:  [UNCERTAIN — verify ClickHouse Cloud EU region availability]
                     If EU region unavailable: SCCs with ClickHouse required.
                     Action: confirm ClickHouse Cloud EU region status before LAUNCH-READY.
     Note:           Telemetry data is anonymous (ANALYTICS-SCHEMA.md PII risk: none).
                     DPA still required as a precaution — confirm with human lawyer.

  3. Anthropic (Claude API)
     Data processed: STRUCTURAL data only — function names, call graph structure.
                     Code content is NEVER sent (INV-005). No personal data sent.
     DPA status:     [UNCERTAIN — Anthropic DPA availability for EU customers]
                     Anthropic ToS review: outputs cannot be used to train competing models.
     EU mechanism:   If function names (e.g. "processPayment") are considered personal data
                     under a strict reading of GDPR: SCCs required with Anthropic.
                     → [HUMAN LAWYER REQUIRED]: confirm whether structural function names
                     constitute personal data under GDPR. This is unresolved.
     Action:         File as CV-003 below. COUNSEL flags this for human lawyer review.

  4. Stripe
     Data processed: subscription state, payment method references (no raw card data —
                     Stripe tokenises), billing history
     DPA status:     Stripe DPA available at stripe.com/legal/dpa → SIGN before billing launch.
     EU mechanism:   Stripe EU Standard Contractual Clauses included in DPA.

  5. Resend (email delivery)
     Data processed: user email address (for transactional email: invite, receipt, reset)
     DPA status:     Resend DPA available — sign before any transactional email sent.
     EU mechanism:   Confirm Resend SCCs availability before LAUNCH-READY.

Resolution: All 5 DPAs must be signed before LAUNCH-READY. No EU user data may
            be processed by any third-party processor without a signed DPA.
Blocks:     LAUNCH-READY.
Severity:   HIGH
Status:     OPEN — pending pre-launch DPA execution
```

---

### COUNSEL FINDING CV-003 — Anthropic Function Name GDPR Classification [UNRESOLVED]
```
Finding:    It is UNCERTAIN whether sending function names (e.g., "handlePayment",
            "deleteUserAccount") to the Anthropic API constitutes processing of
            personal data under GDPR Article 4(1).
            Arguments for personal data: function names may identify a specific developer's
            code and thus indirectly identify a natural person in a small team.
            Arguments against: function names are technical metadata, not identity data.
            Current Apex assumption (from LAST SESSION SUMMARY): structural data, not PII.
Risk:       If function names are personal data and are sent to Anthropic (a US company)
            without SCCs: GDPR Article 46 violation (transfer to third country without
            adequate safeguards).
Mitigation in place: INV-005 — code CONTENT never sent. Only structural graph data.
Resolution: [HUMAN LAWYER REQUIRED] — a qualified data protection lawyer must confirm
            whether function names in call graphs constitute personal data under GDPR.
            Interim measure: treat as personal data. Require SCCs with Anthropic before
            EU users are onboarded. Revisit if human lawyer confirms otherwise.
Blocks:     EU user onboarding until resolved. Does not block beta (non-EU users).
Severity:   HIGH — AWAITING HUMAN LAWYER
Status:     OPEN
Log:        COUNSEL VETO: AWAITING HUMAN LAWYER — CV-003 Anthropic function name GDPR — 2026-04-23
```

================================================================================
## SECTION 2: AI-Specific Legal Review
================================================================================

### Checklist Results

[x] Training data sourcing: no custom model trained — using Anthropic Claude API only.
    → PASS: CodeMind does not train models. Uses Anthropic Claude API exclusively.

[ ] AI output disclaimer: is it clear to users when content is AI-generated?
    → CONDITIONAL: CLI outputs from `codemind check --think` and `codemind trace` are
      AI-enriched. Users must be informed which parts of the output are AI-generated.
    → Filed as CV-004 below.

[x] AI decisions affecting users: no consequential automated decisions.
    → PASS: CodeMind analysis is advisory only. Pre-commit hook exits 0 always (INV-001).
      No automated blocking decisions. Confidence capped at 80% (INV-004). No GDPR
      Article 22 automated decision-making obligation applies.

[x] Anthropic ToS reviewed:
    → KEY RESTRICTION: Outputs from Claude API cannot be used to train a competing AI model.
      CodeMind does not train models — PASS.
    → USAGE RESTRICTION: Anthropic ToS prohibits use cases that could harm people or
      violate laws. CodeMind's use case (code analysis, diagram comparison) is clearly
      within permitted use.
    → CONFIRMED: No Anthropic ToS violation in current product design.

---

### COUNSEL FINDING CV-004 — AI Output Attribution Required [MEDIUM]
```
Finding:    SPEC.md and API-DESIGN.md do not specify that AI-generated content in CLI
            output is labeled as AI-generated. This creates potential liability if a
            user relies on an AI-generated blast radius assessment and it is wrong.
            Regulatory context: EU AI Act (applies from 2025-2026) requires transparency
            about AI-generated content in certain contexts.
Risk:       Liability if AI-generated risk assessment is materially wrong and user relied
            on it without knowing it was AI-generated.
            Note: confidence capped at 80% (INV-004) is a good mitigation — but only if
            the user knows the output is AI-enhanced.
Resolution: QUILL (CONTENT gate) must specify exact copy for all AI-generated output.
            Minimum: every AI-enriched CLI output section must be prefixed with a visual
            marker (e.g., "✦ AI-enhanced analysis" or "Generated by Claude claude-opus-4-7").
            BUILDER must implement this marker before LAUNCH-READY.
Blocks:     LAUNCH-READY.
Severity:   MEDIUM
Status:     OPEN — route to QUILL CONTENT gate for copy + BUILDER for implementation
```

================================================================================
## SECTION 3: Intellectual Property + License Audit
================================================================================

### Planned Dependency Stack (pre-SCAFFOLD — to be verified at SCAFFOLD time)

Audit command to run at SCAFFOLD:
```bash
cd packages/server && npx license-checker --production \
  --failOn 'GPL-2.0;GPL-3.0;AGPL-1.0;AGPL-3.0;SSPL-1.0;Commons-Clause' \
  --json > license-report.json
```
Run separately for: packages/cli, packages/server, packages/web.
Output must be stored in: docs/license-audit-[date].json
BREAKER runs this check in VERIFY mode on every dependency addition.

### Pre-SCAFFOLD License Assessment (planned dependencies only)

| Dependency | License | Risk | Notes |
|---|---|---|---|
| fastify | MIT | GREEN | Permissive |
| prisma + @prisma/client | Apache-2.0 | GREEN | Permissive |
| ioredis | MIT | GREEN | Permissive |
| bullmq | MIT | GREEN | Permissive |
| pino | MIT | GREEN | Permissive |
| zod | MIT | GREEN | Permissive |
| jose | MIT | GREEN | JWT library |
| @node-rs/argon2 or bcrypt | MIT | GREEN | Password hashing |
| stripe | MIT | GREEN | Official Stripe SDK |
| @anthropic-ai/sdk | MIT | GREEN | Official Anthropic SDK |
| tree-sitter | MIT | GREEN | Core CLI dependency |
| msgpackr | MIT | GREEN | Graph serialization |
| commander | MIT | GREEN | CLI argument parsing |
| ink | MIT | GREEN | CLI rendering (React for terminals) |
| next.js | MIT | GREEN | Dashboard framework |
| react / react-dom | MIT | GREEN | UI library |
| tailwindcss | MIT | GREEN | CSS utility framework |
| @clickhouse/client | Apache-2.0 | GREEN | ClickHouse SDK |
| vitest | MIT | GREEN | Test framework |
| turborepo | MIT | GREEN | Monorepo tooling |
| eslint | MIT | GREEN | Linting |
| typescript | Apache-2.0 | GREEN | Language |

PRELIMINARY RESULT: No GPL/AGPL dependencies identified in planned stack.
All planned dependencies are MIT or Apache-2.0 — both permissive, commercial use permitted.

⚠️  DEFERRED to SCAFFOLD: Actual installed dependency tree may introduce transitive
    dependencies not listed above. License checker MUST pass before LAUNCH-READY.

### Content + Fonts + Icons
```
Icons:      Use Lucide React (ISC License — permissive, commercial use OK) or
            Heroicons (MIT). Do NOT use Font Awesome free tier (mixed licensing).
Fonts:      Use system font stack or Inter (Open Font License — permissive, commercial OK).
            Do NOT use any font without confirming commercial license.
Images:     All images must be owned by CodeMind or licensed for commercial use.
            No stock images without a commercial stock license verified.
```

### Company IP Ownership
```
Requirement: All contributors (employees and contractors) must sign IP assignment
             agreements before committing code.
Action:      [HUMAN LAWYER REQUIRED] — provide standard IP assignment agreement
             template to all contributors before SCAFFOLD.
Status:      OPEN — must be resolved before SCAFFOLD starts.
```

================================================================================
## SECTION 4: Consumer + Subscription Law
================================================================================

### Auto-Renewal Compliance
```
Requirement: Auto-renewal subscriptions must clearly disclose:
             - That subscription auto-renews
             - The price after any trial period
             - How to cancel before renewal
Compliance:  SPEC requires cancellation to be self-service (DELETE /billing/subscription).
             UI must display renewal date and price prominently on the billing page.
             Cancellation path must be max 2 clicks from the billing page.
             Confirmation email on signup must include renewal terms.
Status:      PASS (design intent). BUILDER must implement per these requirements.
             ARTISAN DESIGNER must ensure cancellation path is not buried in settings.
```

### Free Trial Terms
```
If a free trial is offered:
  - Duration must be explicitly stated (e.g., "14-day free trial")
  - Credit card required upfront: must state "You will be charged $X on [date] unless cancelled"
  - Cancellation must be available before trial ends without charge
  - Automatic conversion email required 3 days before trial ends (Resend email template)
Status:      Not yet decided whether v1 has a free trial. ORACLE to confirm at CONTENT gate.
             If yes: above requirements are mandatory.
```

### Jurisdiction + Governing Law
```
Recommendation: Govern by the laws of [FILL BEFORE LAUNCH — founder's state/country of
                incorporation]. Standard for B2B SaaS.
EU users:       GDPR compliance required regardless of governing law choice.
US users:       CCPA compliance required for California residents.
                CCPA obligation threshold: > $25M revenue OR > 100K consumers' data annually.
                At 500K MAU: CCPA compliance required.
                CCPA additions needed: "Do Not Sell My Personal Information" link (even if
                CodeMind does not sell data — the link is required).
Status:         [HUMAN LAWYER REQUIRED] for jurisdiction selection and CCPA readiness review.
```

================================================================================
## SECTION 5: Documents Required Before Launch
================================================================================

### Privacy Policy
```
Status:     REQUIRED — not drafted yet.
Deadline:   Must exist before any user creates an account in production.
Content requirements (GDPR Article 13):
  - Identity of data controller (CodeMind, Inc. / [legal entity])
  - Categories of personal data collected
  - Legal basis for each processing activity (from GDPR-REGISTER.md)
  - Retention periods for each data category
  - Third-party processors and their roles (AWS, Stripe, Resend, ClickHouse, Anthropic)
  - Data subject rights (access, erasure, portability, objection, restriction)
  - Right to lodge a complaint with supervisory authority
  - Contact details for data subject requests (DPO email or privacy@ alias)
  - International transfer mechanisms (SCCs where applicable)
CCPA additions:
  - Categories of personal information collected
  - Right to know, right to delete, right to opt-out of sale
  - "Do Not Sell or Share My Personal Information" section
Owner:      QUILL writes the user-facing copy. COUNSEL reviews for legal completeness.
```

### Terms of Service
```
Status:     REQUIRED — not drafted yet.
Deadline:   Must exist and be accepted (checkbox) before account creation.
Key clauses:
  - Acceptable use policy (no abuse of the API, no credential stuffing via CLI)
  - AI output disclaimer (CV-004 — content is AI-assisted, not professional advice)
  - Limitation of liability for CLI analysis results
  - Subscription terms (auto-renewal, cancellation, refund policy)
  - IP ownership: user owns their code; CodeMind owns the analysis tool
  - Data usage: CodeMind may use anonymous telemetry (opt-in) for product improvement
  - No training on user code content: explicit commitment (INV-005)
  - DMCA / notice and takedown procedure
  - Governing law and dispute resolution
Owner:      [HUMAN LAWYER REQUIRED] — ToS has material liability implications.
            COUNSEL provides requirements; human lawyer drafts final text.
```

### Data Processing Agreement (Customer-Facing)
```
Status:     REQUIRED for any enterprise/team customer who is an EU data controller.
            At v1 (individual developers): may not be immediately required.
            At Team/Enterprise tier: B2B customers processing their employees' data
            through CodeMind → CodeMind acts as a processor → DPA required.
Deadline:   Before any Team/Enterprise customer onboarded who is an EU business.
Owner:      [HUMAN LAWYER REQUIRED] — standard DPA template needed.
```

================================================================================
## SECTION 6: GDPR-REGISTER.md Additions Required
================================================================================

The following items were identified during this review that require additions to GDPR-REGISTER.md:

1. **PA-07 (new)**: Right-to-Erasure Request Processing
   - Data: request records, erasure confirmation logs
   - Legal basis: Legal obligation (GDPR Article 17)
   - Processor: internal (BullMQ gdpr-purge job)
   - Note: logs of erasure must themselves be purged after GDPR-specified retention

2. **PA-08 (new)**: Right-to-Access / Data Portability Export
   - Data: all user account data, subscription history, API key metadata
   - Legal basis: Legal obligation (GDPR Article 20)
   - Note: requires POST /auth/data-export endpoint (CV-001 resolution)

3. **Backup retention**: GDPR-REGISTER.md must note that GDPR erasure requests
   extend to database backups. Backup purge procedure needed in runbooks/gdpr-purge.md.

================================================================================
## SECTION 7: Open Findings Summary
================================================================================

| ID | Finding | Severity | Blocks | Status |
|---|---|---|---|---|
| CV-001 | Right-to-erasure endpoints missing from API-DESIGN | CRITICAL | LAUNCH-READY | OPEN |
| CV-002 | DPAs not signed with AWS/ClickHouse/Anthropic/Stripe/Resend | HIGH | LAUNCH-READY | OPEN (pre-launch) |
| CV-003 | Anthropic function name GDPR classification unresolved | HIGH | EU onboarding | AWAITING HUMAN LAWYER |
| CV-004 | AI output attribution not specified in CLI output | MEDIUM | LAUNCH-READY | OPEN → route to QUILL |
| IP-001 | IP assignment agreements for contributors | HIGH | SCAFFOLD | OPEN → HUMAN LAWYER |
| PRIV-001 | Privacy Policy not drafted | CRITICAL | LAUNCH-READY | OPEN → QUILL + COUNSEL |
| TOS-001 | Terms of Service not drafted | CRITICAL | LAUNCH-READY | OPEN → HUMAN LAWYER |
| DPA-001 | Customer-facing DPA for EU team customers | MEDIUM | Enterprise onboarding | DEFERRED |
| CCPA-001 | CCPA compliance review (California, 500K MAU threshold met) | HIGH | LAUNCH-READY | OPEN → HUMAN LAWYER |

### Pipeline Unblock Decision
COUNSEL CONDITIONAL PASS: The above findings do not block DESIGNER, CONTENT, RUNBOOK, or IaC.
They block LAUNCH-READY. BUILDER may proceed on non-blocking features.
CV-001 must be in API-DESIGN.md before SCAFFOLD — TITAN action required.
IP-001 must be resolved before SCAFFOLD — human lawyer required.

================================================================================
## SECTION 8: Action Plan (Before LAUNCH-READY)
================================================================================

```
Before SCAFFOLD:
  [ ] TITAN: add DELETE /auth/account + POST /auth/data-export to API-DESIGN.md (CV-001)
  [ ] Human lawyer: IP assignment agreements for all contributors (IP-001)

During implementation (BUILDER gates):
  [ ] BUILDER implements DELETE /auth/account + POST /auth/data-export (CV-001)
  [ ] BUILDER adds AI output attribution markers in CLI output (CV-004)
  [ ] BUILDER adds "Do Not Sell My Personal Information" link in web dashboard (CCPA-001)

Before LAUNCH-READY:
  [ ] Sign DPAs: AWS, ClickHouse Cloud, Anthropic, Stripe, Resend (CV-002)
  [ ] Human lawyer: Privacy Policy drafted, reviewed, published (PRIV-001)
  [ ] Human lawyer: Terms of Service drafted, reviewed, published (TOS-001)
  [ ] Human lawyer: CCPA compliance review (CCPA-001)
  [ ] Human lawyer: CV-003 (Anthropic function name GDPR classification) resolved
  [ ] GDPR-REGISTER.md: add PA-07 + PA-08 entries
  [ ] License-checker: run on full installed dependency tree, pass with zero RED licenses
  [ ] Confirm ClickHouse Cloud EU region availability
```

================================================================================
# END OF LEGAL-REVIEW.md
# Gate: COMPLIANCE-LEGAL complete. Conditional pass — 9 findings open.
# Critical items (CV-001, PRIV-001, TOS-001) block LAUNCH-READY.
# CV-001 blocks SCAFFOLD (TITAN must add endpoints to API-DESIGN.md first).
# Next gate: DESIGNER (ARTISAN) → DESIGN-SYSTEM.md
================================================================================
