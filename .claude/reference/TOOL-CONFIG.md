# REFERENCE: Native Tool Configuration
# Location: .claude/reference/TOOL-CONFIG.md
# Purpose: Copy-paste configurations for coverage thresholds and lint rules across
#          all supported stacks. Use these at SCAFFOLD time instead of custom scripts.
#          Replaces: coverage-ratchet.js, grounding-check.ts (both retired in v1.4).
# Owner:   BUILDER configures at SCAFFOLD. TITAN approves thresholds. BREAKER verifies.
# Version: Apex Runtime v1.4 | Authors: Ashish Khandelwal, Arup Kolay | MIT License
================================================================================

## Why native configuration over custom scripts

Custom scripts that wrap existing tool behaviour create maintenance surface and
require bootstrapping before the first verification run. Native tool configuration:
- Works immediately on `npm install` / `pip install` / `go mod tidy`
- Is LLM-provider and OS agnostic
- Produces familiar output that existing docs, CI templates, and developers already know
- Fails fast at configuration time rather than at first script run

Grounding (hallucinated API detection) specifically: TypeScript + Prisma already enforce
this. `tsc --noEmit` catches calls to functions that don't exist in installed types.
Prisma generates typed client code — accessing `user.phoneNumber` when the schema has no
such field is a compile error, not a runtime surprise. The BUILDER G1–G5 protocol
(BUILDER.md) covers the behavioural remainder for all stacks including Python and Go.

---

## TypeScript + Vitest

### Coverage thresholds (`vitest.config.ts`)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider:   'v8',          // or 'istanbul'
      reporter:   ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',

      // Thresholds — set at project start, never lower without deliberate ADR
      // Ratchet effect: if coverage drops below these values, vitest exits with code 1.
      // To accept a deliberate decrease: update these numbers and commit the diff.
      // That makes the acceptance explicit and reviewable in the PR.
      thresholds: {
        // Global floors — project-wide coverage must not drop below these
        lines:      80,
        branches:   70,
        functions:  80,
        statements: 80,

        // Per-file floors — prevents a well-covered average masking untested critical files.
        // Any single file below these values fails the run.
        // Set lower than global: some files are intentionally thin (config, index re-exports).
        perFile: {
          lines:      60,
          functions:  60,
          statements: 60,
        },
      },
    },
  },
})
```

**Run command (Tier 2):**
```bash
vitest run --coverage
# Fails with exit code 1 if any threshold is breached — same behaviour as coverage-ratchet.js
```

**To raise thresholds as coverage improves:**
Update the numbers in `vitest.config.ts`. The change appears in the PR diff — explicit and reviewable.
Never lower them without a comment explaining why.

### ESLint rules covering hygiene-check overlap

These rules handle the checks in `hygiene-check.ts` that are pure style/lint (not structural).
Configure once in `.eslintrc.js` so they run everywhere, not just on explicitly checked files.

```javascript
// .eslintrc.js (or eslint.config.js for flat config)
module.exports = {
  rules: {
    // Mirrors hygiene-check 'no-console'
    // Exception: scripts/ and tests/ — add override block below
    'no-console': 'error',

    // Mirrors hygiene-check 'no-debugger'
    'no-debugger': 'error',

    // Mirrors hygiene-check 'no-any-type'
    '@typescript-eslint/no-explicit-any': 'error',

    // Unused variables — catches dead code hygiene-check misses
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },

  overrides: [
    {
      // Allow console.* in scripts and tests
      files: ['scripts/**/*.ts', 'tests/**/*.ts', '__tests__/**/*.ts', '**/*.test.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}
```

Note: `no-direct-provider-import` and `no-direct-analytics-import` are NOT replicated here.
Those checks are project-structure-aware and live in `scripts/hygiene-check.ts` (see SCRIPTS.md).

---

## Python + pytest

### Coverage thresholds (`pyproject.toml`)

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=term-missing --cov-report=json --cov-fail-under=80"
# --cov-fail-under: pytest exits with code 2 if overall coverage drops below this value.
# To raise: update this number. To lower deliberately: update + commit + explain in PR.

[tool.coverage.run]
source      = ["src"]
omit        = ["src/migrations/*", "tests/*", "scripts/*"]
branch      = true     # measure branch coverage, not just line coverage

[tool.coverage.report]
# Fail if any individual file drops below this floor
fail_under  = 80
show_missing = true
```

**Alternative: `pytest.ini`**
```ini
[pytest]
addopts = --cov=src --cov-report=term-missing --cov-fail-under=80
```

**Run command (Tier 2):**
```bash
pytest tests/[domain]/ -x --cov=src --cov-fail-under=80
# -x stops on first failure. --cov-fail-under enforces the floor.
```

### Ruff + mypy hygiene configuration

```toml
# pyproject.toml (continued)
[tool.ruff]
line-length = 100
select = [
  "E",    # pycodestyle errors
  "W",    # pycodestyle warnings
  "F",    # pyflakes (unused imports, undefined names)
  "I",    # isort
  "N",    # pep8 naming
  "UP",   # pyupgrade
  "B",    # bugbear (common bug patterns)
  "S",    # bandit security checks — catches hardcoded secrets
  "T20",  # flake8-print — mirrors hygiene-check no-console
]
ignore = ["S101"]   # allow assert in tests

[tool.ruff.per-file-ignores]
"tests/*"    = ["S", "T20"]   # allow print and security shortcuts in tests
"scripts/*"  = ["T20"]

[tool.mypy]
strict              = true
disallow_any_generics = true
warn_unused_ignores = true
```

---

## Go

### Coverage thresholds (enforced in CI, not via config file)

Go does not have a native coverage threshold config file (as of Go 1.21).
Enforce via CI command:

```bash
# In CI (Tier 2 and Tier 3):
go test ./[domain]/... -coverprofile=coverage.out -covermode=atomic
go tool cover -func=coverage.out | tail -1

# Parse the total and fail if below threshold:
COVERAGE=$(go tool cover -func=coverage.out | grep "^total" | awk '{print $3}' | tr -d '%')
THRESHOLD=80
if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
  echo "Coverage ${COVERAGE}% is below threshold ${THRESHOLD}%"
  exit 1
fi
echo "Coverage ${COVERAGE}% — OK"
```

**Wrap in `scripts/check-coverage.sh` for Go projects** (this is the one Go-specific custom
script that makes sense — Go's toolchain simply doesn't have native threshold config):

```bash
#!/usr/bin/env bash
# scripts/check-coverage.sh — Go only
set -euo pipefail
THRESHOLD="${COVERAGE_THRESHOLD:-80}"
go test ./... -coverprofile=coverage.out -covermode=atomic
COVERAGE=$(go tool cover -func=coverage.out | grep "^total" | awk '{print $3}' | tr -d '%')
if awk "BEGIN {exit !($COVERAGE < $THRESHOLD)}"; then
  echo "[coverage] FAIL — ${COVERAGE}% < ${THRESHOLD}% threshold"
  exit 1
fi
echo "[coverage] PASS — ${COVERAGE}%"
```

### golangci-lint configuration (`.golangci.yml`)

```yaml
# .golangci.yml
linters:
  enable:
    - gocognit      # cognitive complexity gate (mirrors sonarjs)
    - gocritic      # style and correctness
    - gosec         # security checks (catches hardcoded secrets — mirrors hygiene-check)
    - unused        # unused code detection
    - errcheck      # unchecked errors
    - revive        # general linting (includes print statement detection)

linters-settings:
  gocognit:
    min-complexity: 10    # matches Apex CODE DISCIPLINE max complexity

  gosec:
    excludes:
      - G104   # allow unchecked errors in tests only — configure per-file in overrides
```

---

## QUALITY_GATES templates for CONTEXT.md

Copy the relevant block into CONTEXT.md at project start. Fill in `[domain]`.

### TypeScript
```
QUALITY_GATES:
  tier1: "eslint [file] --max-warnings 0 && tsx scripts/hygiene-check.ts [file]"
  tier2: "tsc --noEmit && eslint src/ --max-warnings 0 && vitest run [domain] --coverage && npx sonarjs src/[file]"
  tier3: "ci"
```

### Python
```
QUALITY_GATES:
  tier1: "ruff check [file] && mypy [file] --strict"
  tier2: "mypy src/ --strict && ruff check src/ && pytest tests/[domain]/ -x --cov=src --cov-fail-under=80 && radon cc [file] -n B"
  tier3: "ci"
```

### Go
```
QUALITY_GATES:
  tier1: "golangci-lint run [file]"
  tier2: "go vet ./... && golangci-lint run && go test ./[domain]/... -coverprofile=coverage.out && bash scripts/check-coverage.sh && gocognit [file] -over 10"
  tier3: "ci"
```

### Polyglot (fill per service)
```
QUALITY_GATES:
  [service-name] ([stack]):
    tier1: "[stack tier1 command]"
    tier2: "[stack tier2 command]"
  tier3: "ci"
```
