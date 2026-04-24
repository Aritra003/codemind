# REFERENCE: Canonical File Tree + Stack Configurations
# Load: Read(".claude/reference/FILE-TREE.md") when TITAN needs structure reference
================================================================================

## CANONICAL FILE TREE
Do not create files outside this structure without TITAN approval + ADR.

```
/
├── CLAUDE.md                          apex runtime — this system
├── CONTEXT.md                         session memory (max 250 lines)
├── CONTEXT-ARCHIVE.md                 archived sessions
├── KNOWLEDGE-BASE.md                  working reference — active lessons (max 200 lines)
├── KNOWLEDGE-ARCHIVE.md               permanent record — graduated + security + CRITICAL (no cap)
├── SPEC.md                            product specification
├── ARCHITECTURE.md                    architecture + C4 + ADR registry + ERD + SHARED FUNCTION REGISTRY
├── INFRASTRUCTURE.md                  AI, caching, queues, real-time, cost model
├── THREAT-MODEL.md                    STRIDE + OWASP risk register
├── SLO.md                             service level objectives + error budgets
├── DESIGN-SYSTEM.md                   design language + component catalogue
├── CONTENT-GUIDE.md                   voice, copy, microcopy standards
├── OBSERVABILITY.md                   logging, monitoring, alerting, tracing
├── API-DESIGN.md                      API contract — all endpoints
├── TECH-DEBT.md                       scored debt log + payoff plan
├── POSTMORTEMS.md                     incident archive (never delete)
├── CHANGELOG.md                       semver changelog
├── MIGRATION.md                       breaking change migration guides
├── BUSINESS-METRICS.md                leading/lagging indicators + alert thresholds
├── EXPERIMENTS.md                     A/B test hypotheses, results, decisions
├── ESCALATION-TREE.md                 human contacts for P0 events
├── ONBOARDING.md                      environment setup < 30 min
├── GDPR-REGISTER.md                   Article 30 processing register (if EU users)
├── LEGAL-REVIEW.md                    COUNSEL compliance gate output
├── ANALYTICS-SCHEMA.md                ORACLE event catalogue (project-specific)
├── COMPLIANCE-REPORT.md               ORACLE+SENTINEL compliance-check output
├── QA-REPORT.md                       BREAKER QA mode output
├── COMPATIBILITY-REPORT.md            ARTISAN compatibility gate output
├── EVENT-STORM.md                     ORACLE event-storm domain model output
│
├── .claude/
│   ├── agents/                        agent spec files (loaded on activation)
│   │   ├── ORACLE.md | TITAN.md | SENTINEL.md | BUILDER.md | BREAKER.md
│   │   ├── DOCTOR.md | SCHOLAR.md | GAUGE.md | ARTISAN.md | QUILL.md
│   │   └── STEWARD.md | ANALYST.md | COUNSEL.md
│   ├── modes/                         mode spec files (loaded on mode entry)
│   │   ├── BROWNFIELD.md | LAUNCH-READY.md | GREENFIELD-PIPELINE.md
│   └── reference/                     reference files (load on demand)
│       ├── FILE-TREE.md
│       ├── MEMORY-TRIAGE.md
│       ├── VERIFICATION-TIERS.md
│       ├── ANALYTICS-PROTOCOL.md
│       ├── TEMPLATES.md
│       ├── SCRIPTS.md
│       ├── TOOL-CONFIG.md
│	└── CI-TEMPLATE.md                CI pipeline template (GitHub Actions + GitLab CI)
│
├── docs/
│   └── adr/                           architectural decision records
│       ├── 000-template.md
│       └── [NNN]-[slug].md
│
├── runbooks/                          one per SLO-critical service
│   └── [service-name].md
│
├── scripts/
│   ├── validate-env.ts                startup: validates all env vars
│   ├── hygiene-check.ts               Tier 1+2: project-structure import rules (see SCRIPTS.md)
│   ├── fitness-check.sh               Tier 3: architecture layer boundary enforcement
│   ├── check-coverage.sh              Tier 2: coverage threshold enforcement (Go projects only — see TOOL-CONFIG.md)
│   ├── generate-openapi.ts            CI: generates OpenAPI spec from Zod schemas
│   ├── export-data.ts                 ops: full data export
│   ├── import-data.ts                 ops: clean import to fresh environment
│   └── verify-export.ts               ops: verifies export is complete
│
├── .github/
│   └── workflows/
│       └── apex.yml                   CI: Apex three-tier verification (copy from CI-TEMPLATE.md)
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── modules/
│   └── environments/ staging/ production/
│
├── styles/
│   └── tokens.css                     ALL visual values — single source of truth
│
├── app/                               (Next.js App Router — adjust for your stack)
│   ├── layout.tsx | page.tsx | not-found.tsx | error.tsx | loading.tsx
│   ├── (auth)/ login | register | reset-password
│   ├── (app)/ layout.tsx + [feature]/ page.tsx
│   └── api/ health/ + v1/ [resource]/ route.ts
│
├── components/
│   ├── ui/           Layer 4 (max 80 lines)
│   ├── features/     Layer 3 (max 120 lines)
│   ├── sections/     Layer 2 (max 150 lines)
│   └── layouts/
│
├── lib/
│   ├── config.ts | db.ts | auth.ts | cache.ts | errors.ts | middleware.ts
│   ├── rate-limit.ts | circuit-breaker.ts | feature-flags.ts | idempotency.ts
│   ├── ai/
│   │   ├── cached-completion.ts       ONLY AI entry point in the codebase
│   │   ├── model-router.ts            selectModel() — dynamic routing, never hardcode
│   │   └── prompts/ [feature].ts      versioned, never inline
│   ├── integrations/ index.ts + [service].ts
│   └── analytics/ track.ts + provider.ts
│
└── prisma/ schema.prisma + migrations/ + seed.ts
```

---

## STACK QUALITY GATES (set QUALITY_GATES in CONTEXT.md at project start)

Canonical QUALITY_GATES templates and coverage threshold configuration for all stacks:
  Read(".claude/reference/TOOL-CONFIG.md") → QUALITY_GATES templates section.

Single source of truth is TOOL-CONFIG.md. Configuration examples there cover:
TypeScript (vitest + eslint + sonarjs) | Python (mypy + ruff + pytest-cov) | Go (go vet + golangci-lint + check-coverage.sh) | Rust (cargo clippy)

tsconfig required flags (TypeScript projects):
`strict: true`, `noUnusedLocals`, `noUnusedParameters`,
`noImplicitReturns`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`

---

## ADR TEMPLATE (docs/adr/000-template.md)

```markdown
# ADR-[NNN]: [Decision title]
Date: [ISO date] | Status: PROPOSED | Author: [agent]

## Context
[Situation that forces a decision. What constraints exist?]

## Decision
[One clear statement of what is decided.]

## Alternatives Rejected
1. [Alternative] — rejected because [specific reason]
2. [Alternative] — rejected because [specific reason]

## Consequences
Positive:
- [benefit]
Negative (tradeoffs accepted):
- [tradeoff]
Blast radius: [what this affects across the codebase/system]

## Review trigger
[What event would cause this decision to be revisited?]
```

---

## DYNAMIC MODEL ROUTING TABLE
(Fill at INFRA-DESIGN time — no hardcoded model strings anywhere in application code)

```typescript
// lib/ai/model-router.ts
export function selectModel(task: AITask): ModelConfig {
  const routing: Record<AITask, ModelConfig> = {
    'simple-classification':    { model: '[exact-model-string]', maxTokens: 500 },
    'content-generation':       { model: '[exact-model-string]', maxTokens: 2000 },
    'complex-reasoning':        { model: '[exact-model-string]', maxTokens: 4000, thinkingBudget: 10000 },
    'structured-extraction':    { model: '[exact-model-string]', maxTokens: 1000 },
    'embedding':                { model: '[exact-model-string]' },
  }
  return routing[task]
}
```
Rule: fill in exact model strings at INFRA-DESIGN time. Review quarterly.
Never: use any `*-latest` alias in production. Pin exact strings. Always.
