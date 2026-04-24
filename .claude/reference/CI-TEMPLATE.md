# CI-TEMPLATE.md — Apex Three-Tier Verification Pipeline
# Location: .claude/reference/CI-TEMPLATE.md
# Usage: copy the relevant sections to .github/workflows/apex.yml (or equivalent).
#        Each job maps directly to an Apex verification tier (VERIFICATION-TIERS.md).
#        Customise stack-specific commands using QUALITY_GATES from CONTEXT.md / TOOL-CONFIG.md.
# Author: Ashish Khandelwal, Arup Kolay | Apex Runtime v1.5
================================================================================

## GitHub Actions (primary)

```yaml
# .github/workflows/apex.yml
# Apex three-tier verification pipeline
# Customise: replace [stack-tier1], [stack-tier2] with commands from TOOL-CONFIG.md
# Customise: set DEFAULT_BRANCH to your main branch name

name: Apex Verification

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']

env:
  NODE_VERSION: '20'

jobs:

  # ─────────────────────────────────────────────────────────────────────────
  # TIER 1 — Fast feedback (Apex VERIFICATION-TIERS.md Tier 1)
  # Runs on every push to any branch. ~5 seconds.
  # Catches: lint errors, hygiene violations, import rule breaches.
  # ─────────────────────────────────────────────────────────────────────────
  fast-feedback:
    name: Tier 1 — Fast feedback
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # TypeScript stack — replace with ruff/golangci-lint for Python/Go (see TOOL-CONFIG.md)
      - name: ESLint (mirrors Tier 1 QUALITY_GATES)
        run: npx eslint src/ --max-warnings 0

      - name: Hygiene check (structural import rules — see SCRIPTS.md)
        run: npx tsx scripts/hygiene-check.ts $(git diff --name-only HEAD~1 HEAD | grep '\.ts$' | tr '\n' ' ')
        # On first push or when diff is empty, check all files:
        # run: npx tsx scripts/hygiene-check.ts $(find src -name "*.ts" | tr '\n' ' ')

  # ─────────────────────────────────────────────────────────────────────────
  # TIER 2 — Pre-merge gate (Apex VERIFICATION-TIERS.md Tier 2)
  # Runs on every pull request. ~60 seconds.
  # Catches: type errors, failing tests, coverage regressions, complexity.
  # ─────────────────────────────────────────────────────────────────────────
  pre-merge:
    name: Tier 2 — Pre-merge gate
    runs-on: ubuntu-latest
    needs: fast-feedback
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # TypeScript — for Python: mypy + pytest; for Go: go vet + go test (see TOOL-CONFIG.md)
      - name: Type check
        run: npx tsc --noEmit

      - name: Tests + coverage (thresholds enforced by vitest.config.ts — see TOOL-CONFIG.md)
        run: npx vitest run --coverage

      - name: Cognitive complexity (sonarjs)
        run: npx eslint src/ --rulesdir node_modules/eslint-plugin-sonarjs/lib/rules --max-warnings 0
        continue-on-error: false

      - name: Hygiene check (full src/)
        run: npx tsx scripts/hygiene-check.ts $(find src -name "*.ts" | tr '\n' ' ')

  # ─────────────────────────────────────────────────────────────────────────
  # TIER 3 — Merge gate (Apex VERIFICATION-TIERS.md Tier 3)
  # Runs before merge to main/trunk. ~3–10 minutes.
  # Required status check — PR cannot merge if this fails.
  # Catches: architecture violations, duplication, security, contract regressions.
  # ─────────────────────────────────────────────────────────────────────────
  merge-gate:
    name: Tier 3 — Merge gate
    runs-on: ubuntu-latest
    needs: pre-merge
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Architecture fitness check (layer boundary enforcement — see SCRIPTS.md)
        run: bash scripts/fitness-check.sh

      - name: Full test suite + coverage (project-wide, not just domain)
        run: npx vitest run --coverage

      - name: Duplication check (jscpd)
        run: npx jscpd src/ --min-lines 5 --min-tokens 50

      - name: Security audit (npm audit)
        run: npm audit --audit-level=high

      # OpenAPI contract verification — uncomment if project has external API consumers
      # and scripts/generate-openapi.ts is implemented (see SCRIPTS.md for spec):
      # - name: OpenAPI contract check
      #   run: npx tsx scripts/generate-openapi.ts --verify
```

================================================================================
## GitLab CI (secondary)

```yaml
# .gitlab-ci.yml
# Apex three-tier verification — GitLab CI equivalent

stages:
  - fast-feedback
  - pre-merge
  - merge-gate

variables:
  NODE_VERSION: "20"

.node-setup: &node-setup
  image: node:${NODE_VERSION}
  before_script:
    - npm ci

tier1-fast-feedback:
  <<: *node-setup
  stage: fast-feedback
  script:
    - npx eslint src/ --max-warnings 0
    - npx tsx scripts/hygiene-check.ts $(find src -name "*.ts" | tr '\n' ' ')

tier2-pre-merge:
  <<: *node-setup
  stage: pre-merge
  only: [merge_requests]
  script:
    - npx tsc --noEmit
    - npx vitest run --coverage
    - npx tsx scripts/hygiene-check.ts $(find src -name "*.ts" | tr '\n' ' ')

tier3-merge-gate:
  <<: *node-setup
  stage: merge-gate
  only: [merge_requests]
  script:
    - bash scripts/fitness-check.sh
    - npx vitest run --coverage
    - npx jscpd src/ --min-lines 5 --min-tokens 50
    - npm audit --audit-level=high
```

================================================================================
## Customisation guide

**Stack-specific commands:** copy Tier 1/2/3 commands from TOOL-CONFIG.md per stack.
  TypeScript: eslint + tsc + vitest + sonarjs (shown above)
  Python:     ruff + mypy + pytest --cov (replace above commands)
  Go:         golangci-lint + go vet + go test + check-coverage.sh (replace above)

**Coverage thresholds:** enforced by native tool config — no CI override needed.
  TypeScript: vitest.config.ts thresholds block (global 80%, per-file 60%)
  Python:     pyproject.toml --cov-fail-under=80
  Go:         scripts/check-coverage.sh THRESHOLD=80

**SRC_DIR override for non-standard layouts:**
  fitness-check.sh accepts SRC_DIR env var: `SRC_DIR=app bash scripts/fitness-check.sh`

**Monorepo:** add matrix strategy to run tier2/tier3 per service.

**Secrets:** never commit API keys or env vars. Use GitHub Actions secrets or GitLab CI variables.
