# REFERENCE: Apex Custom Script Specifications
# Location: .claude/reference/SCRIPTS.md
# Purpose: Implementation for the two genuinely custom scripts in Apex.
#          All other verification (coverage thresholds, lint rules, type-checking)
#          uses native tool configuration — see TOOL-CONFIG.md.
# Owner:   BUILDER implements at SCAFFOLD time. BREAKER verifies on first run.
# Version: Apex Runtime v1.4 | Authors: Ashish Khandelwal, Arup Kolay | MIT License
================================================================================

## Why only two scripts

Apex previously specified four scripts. Two were replaced with native tool configuration
because custom scripts that duplicate tool capabilities create maintenance surface and
break the stack-agnostic principle:

| Was a script | Now handled by | Rationale |
|---|---|---|
| `coverage-ratchet.js` | vitest/pytest/Go native thresholds | Test runners enforce coverage floors natively — see TOOL-CONFIG.md |
| `grounding-check.ts` | `tsc --noEmit` + BUILDER G1–G5 protocol | TypeScript compiler catches hallucinated library calls via generated types. Prisma-generated types catch schema field mismatches. Remaining gap is behavioural — addressed by G1–G5 in BUILDER.md |

The two scripts that remain enforce things no existing tool covers natively:
- `hygiene-check.ts` — project-structure-aware import rules (no-direct-provider-import,
  no-direct-analytics-import) that ESLint cannot express without a custom plugin,
  plus agent-optimised output format
- `fitness-check.sh` — architectural layer boundary enforcement across directory structure

---

## Script 1: `scripts/hygiene-check.ts`

**Tier:** 1 — runs after every file write (~1–2 seconds)
**Input:** one or more file paths as CLI arguments
**Exit codes:** 0 = clean, 1 = violations found

**Why this exists alongside ESLint:**
ESLint handles syntax and style. This script enforces structural project constraints
defined by Apex architecture: which directories may import which provider or analytics SDKs.
These rules change per project as providers are added via ADR. The agent-readable output
(file + line + rule + message) is optimised for Claude to parse and act on directly.

```typescript
#!/usr/bin/env tsx
// scripts/hygiene-check.ts
// Run: tsx scripts/hygiene-check.ts [file] [file...]
// Add to Tier 1 QUALITY_GATES in CONTEXT.md

import { readFileSync } from 'fs'
import { resolve, relative } from 'path'

interface Check {
  name:         string
  pattern:      RegExp
  message:      string
  excludeDirs:  string[]
  includeExts?: string[]
}

interface Violation {
  file:    string
  line:    number
  check:   string
  message: string
}

// Extend this array when a new architectural constraint is established via ADR.
// Suppress a single line with: // hygiene-ignore: check-name
const CHECKS: Check[] = [
  {
    name:        'no-console',
    pattern:     /console\.(log|error|warn|debug|info|trace)\s*\(/,
    message:     'console.* in application code — use structured logger (lib/logger.ts)',
    excludeDirs: ['scripts/', 'tests/', '__tests__/', 'e2e/'],
  },
  {
    name:        'no-debugger',
    pattern:     /\bdebugger\b/,
    message:     'debugger statement — remove before commit',
    excludeDirs: [],
  },
  {
    name:        'no-bare-todo',
    // Good: // TODO(TICKET-123): description   Bad: // TODO: description
    pattern:     /\/\/\s*(TODO|FIXME|HACK|XXX)(?!\s*\()/,
    message:     'Bare TODO/FIXME — add ticket ref: // TODO(TICKET-123): description',
    excludeDirs: [],
  },
  {
    name:        'no-hardcoded-secret',
    pattern:     /(api_key|apikey|api_secret|auth_token|secret|password|passwd)\s*[=:]\s*["'](?!test-|fake-|mock-|example-)[^"']{8,}["']/i,
    message:     'Possible hardcoded secret — use env vars via lib/config.ts',
    excludeDirs: ['tests/', '__tests__/', 'e2e/'],
  },
  {
    // Core custom check: only lib/*/providers/ may import provider SDKs.
    // Update this pattern when new providers are added via ADR.
    name:        'no-direct-provider-import',
    pattern:     /from\s+['"](@aws-sdk\/[^'"]+|aws-sdk|openai|@anthropic-ai\/sdk|@google-cloud\/[^'"]+|@supabase\/supabase-js|mongodb|mysql2|pg\b)['"]/,
    message:     'Direct provider SDK import — use lib/ abstraction layer (see TITAN.md)',
    excludeDirs: [
      'lib/database/providers/',
      'lib/storage/providers/',
      'lib/cache/providers/',
      'lib/ai/providers/',
      'scripts/',
    ],
    includeExts: ['.ts', '.tsx'],
  },
  {
    name:        'no-direct-analytics-import',
    pattern:     /from\s+['"](@amplitude\/analytics-browser|posthog-js|mixpanel-browser|firebase\/analytics|@segment\/analytics-next)['"]/,
    message:     'Direct analytics SDK import — use trackEvent() from lib/analytics/track.ts',
    excludeDirs: ['lib/analytics/', 'scripts/', 'tests/', '__tests__/'],
    includeExts: ['.ts', '.tsx'],
  },
]

function checkFile(filePath: string): Violation[] {
  const absPath    = resolve(filePath)
  const relPath    = relative(process.cwd(), absPath)
  const violations: Violation[] = []

  let content: string
  try {
    content = readFileSync(absPath, 'utf-8')
  } catch {
    console.error(`[hygiene-check] Cannot read: ${relPath}`)
    return violations
  }

  const ext        = filePath.slice(filePath.lastIndexOf('.'))
  const normalised = relPath.replace(/\\/g, '/')
  const lines      = content.split('\n')

  for (const check of CHECKS) {
    // Path-segment-aware exclusion: the excluded directory must appear as a leading
    // path segment, not anywhere as a substring. Prevents 'tests/' from matching
    // 'src/contexts/tests-utils/file.ts' or 'lib/analytics/' from matching a sibling.
    const excluded = check.excludeDirs.some(dir => {
      const normDir = dir.endsWith('/') ? dir : dir + '/'
      return normalised.startsWith(normDir) || normalised.includes('/' + normDir)
    })
    if (excluded) continue
    if (check.includeExts && !check.includeExts.includes(ext)) continue

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes(`hygiene-ignore: ${check.name}`)) continue
      if (check.pattern.test(line)) {
        violations.push({ file: relPath, line: i + 1, check: check.name, message: check.message })
      }
    }
  }
  return violations
}

function main(): void {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    console.error('[hygiene-check] Usage: tsx scripts/hygiene-check.ts [file] [file...]')
    process.exit(1)
  }

  let total = 0
  for (const file of files) {
    const violations = checkFile(file)
    if (violations.length === 0) {
      console.log(`[hygiene-check] PASS: ${file}`)
    } else {
      console.log(`[hygiene-check] FAIL: ${file}`)
      for (const v of violations) {
        console.log(`  Line ${v.line}: ${v.check} — ${v.message}`)
      }
      total += violations.length
    }
  }

  if (total > 0) {
    console.log(`\n[hygiene-check] ${total} violation(s). Fix before proceeding.`)
    process.exit(1)
  }
}

main()
```

**Adding a project-specific check:** append to the `CHECKS` array with `name`, `pattern`,
`message`, `excludeDirs`. Add a comment citing the ADR it enforces.

---

## Script 2: `scripts/fitness-check.sh`

**Tier:** 3 — runs before PR merge (~5 seconds)
**Input:** no arguments
**Exit codes:** 0 = fit, 1 = violation found

**Why this exists:**
Layer boundary enforcement across directories cannot be expressed as a shareable ESLint
config without a custom plugin that must be kept in sync with the project file tree.
Grep patterns are simpler, faster, and immediately readable.

```bash
#!/usr/bin/env bash
# scripts/fitness-check.sh
# Run: bash scripts/fitness-check.sh
# Requires: grep (POSIX — no extra dependencies)
# SRC_DIR override: SRC_DIR=app bash scripts/fitness-check.sh  (Next.js App Router)

set -euo pipefail

VIOLATIONS=0
SRC_DIR="${SRC_DIR:-src}"

echo "[fitness-check] Scanning ${SRC_DIR}/ ..."

# RULE 1: No DB imports in route handlers  (Enforces: TITAN.md layer architecture)
RULE1=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E "from ['\"](\.\./)*lib/(db|prisma|database)|from ['\"](\.\./)*repositories/" \
  "${SRC_DIR}/app/api/" "${SRC_DIR}/routes/" 2>/dev/null || true)
if [ -n "$RULE1" ]; then
  echo "[fitness-check] FAIL Rule 1 — DB import in route layer:"
  echo "$RULE1" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# RULE 2: No HTTP calls in repository layer  (Enforces: TITAN.md layer architecture)
RULE2=$(grep -rn --include="*.ts" \
  -E "from ['\"](\.\./)*lib/integrations|import (fetch|axios|node-fetch)" \
  "${SRC_DIR}/repositories/" 2>/dev/null || true)
if [ -n "$RULE2" ]; then
  echo "[fitness-check] FAIL Rule 2 — HTTP call in repository layer:"
  echo "$RULE2" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# RULE 3: Provider SDKs behind lib/ abstraction  (Enforces: TITAN.md cloud agnostic)
# Uses find+xargs instead of grep --exclude-dir because --exclude-dir takes a basename
# pattern, not a full path. find -prune is precise and portable across Linux/macOS.
echo "[fitness-check] Rule 3: Provider SDK isolation..."
RULE3=$(find "${SRC_DIR}" -type d -name "lib" -prune -o \
  \( -name "*.ts" -o -name "*.tsx" \) -print | \
  xargs grep -ln \
  -E "from ['\"](openai|@anthropic-ai/sdk|@aws-sdk/[^'\"]+|aws-sdk|@google-cloud/[^'\"]+|@supabase/supabase-js|mongodb)" \
  2>/dev/null || true)
if [ -n "$RULE3" ]; then
  # Re-run with line numbers on matched files for useful output
  echo "[fitness-check] FAIL Rule 3 — Provider SDK outside lib/ abstraction:"
  echo "$RULE3" | xargs grep -n \
    -E "from ['\"](openai|@anthropic-ai/sdk|@aws-sdk/[^'\"]+|aws-sdk|@google-cloud/[^'\"]+|@supabase/supabase-js|mongodb)" \
    2>/dev/null | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# RULE 4: Analytics SDK behind lib/analytics  (Enforces: ANALYTICS-PROTOCOL.md)
# Same find-based approach to avoid --exclude-dir full-path issue.
echo "[fitness-check] Rule 4: Analytics SDK isolation..."
RULE4=$(find "${SRC_DIR}" -type d -name "analytics" -prune -o \
  \( -name "*.ts" -o -name "*.tsx" \) -print | \
  xargs grep -ln \
  -E "from ['\"](posthog-js|@amplitude/analytics-browser|mixpanel-browser|firebase/analytics|@segment/analytics-next)" \
  2>/dev/null || true)
if [ -n "$RULE4" ]; then
  echo "[fitness-check] FAIL Rule 4 — Analytics SDK outside lib/analytics:"
  echo "$RULE4" | xargs grep -n \
    -E "from ['\"](posthog-js|@amplitude/analytics-browser|mixpanel-browser|firebase/analytics|@segment/analytics-next)" \
    2>/dev/null | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# RULE 5: No hardcoded AI model strings  (Enforces: FILE-TREE.md model routing)
RULE5=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E "model:\s*['\"]((gpt|claude|gemini|mistral|llama)-[^'\"]+)['\"]" \
  "${SRC_DIR}/" --exclude-dir="${SRC_DIR}/lib/ai" 2>/dev/null || true)
if [ -n "$RULE5" ]; then
  echo "[fitness-check] FAIL Rule 5 — Hardcoded AI model string (use selectModel()):"
  echo "$RULE5" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "[fitness-check] PASS — all rules satisfied."
  exit 0
else
  echo "[fitness-check] FAIL — ${VIOLATIONS} violation(s). Fix before merge."
  exit 1
fi
```

---

## SCAFFOLD checklist

[ ] `scripts/hygiene-check.ts` created from spec above
[ ] `tsx scripts/hygiene-check.ts scripts/hygiene-check.ts` → PASS (script passes on itself)
[ ] `scripts/fitness-check.sh` created from spec above + `chmod +x scripts/fitness-check.sh`
[ ] `bash scripts/fitness-check.sh` → PASS on empty src/
[ ] QUALITY_GATES set in CONTEXT.md — see TOOL-CONFIG.md for per-stack templates
[ ] Coverage thresholds set in vitest.config.ts / pytest.ini / go test flags — see TOOL-CONFIG.md
[ ] CI pipeline references: hygiene-check (Tier 1+2), fitness-check.sh (Tier 3)

---

## Optional Script: `scripts/generate-openapi.ts`

**Required only if:** project exposes a REST API with external consumers AND uses Zod schemas
for request/response validation. Skip entirely for internal APIs or non-REST architectures.

**Purpose:** Generate an OpenAPI 3.x spec from Zod schemas, and in `--verify` mode compare
the generated spec against the committed `openapi.json` to catch breaking contract changes
before they reach production.

**Input:** `--verify` flag (CI gate mode) | no flag (generate/update mode)
**Output:** `openapi.json` at project root | exit code 1 if `--verify` detects regression
**Owner:** BUILDER implements at SCAFFOLD time if the project has external API consumers.
**Tier:** Tier 3 only. Not required for internal services.

```typescript
// scripts/generate-openapi.ts
// Run: tsx scripts/generate-openapi.ts           (generate/update openapi.json)
//      tsx scripts/generate-openapi.ts --verify  (CI gate — fail if contract regressed)
//
// Dependencies: zod-to-openapi or similar (e.g. @asteasolutions/zod-to-openapi)
// Schema source: src/schemas/ or wherever Zod request/response schemas are defined
//
// Implementation steps:
// 1. Import all Zod schemas from API route files or a central schema registry
// 2. Use a Zod-to-OpenAPI converter to generate the spec object
// 3. In --verify mode: read committed openapi.json, compare with generated spec
//    - Any removed endpoint or removed field = BREAKING change → exit 1
//    - Any added endpoint or added optional field = non-breaking → warn only
//    - Any changed field type or changed required status = BREAKING → exit 1
// 4. In generate mode: write generated spec to openapi.json and exit 0

// Output format on --verify failure:
// [generate-openapi] BREAKING CHANGE DETECTED
//   Removed: GET /api/v1/users/{id} — endpoint removed without version bump
//   Changed: POST /api/v1/orders — field 'amount' type changed from number to string
// [generate-openapi] Bump API version or restore removed fields before merging.
```

**If not implementing this script:** remove the `tsx scripts/generate-openapi.ts --verify`
line from your CI pipeline's Tier 3 job. See VERIFICATION-TIERS.md.

---

## APEX HEALTH CHECK

Run from the project root at any time — safe to run repeatedly, exits 0 regardless.
Purpose: verify an Apex installation is complete and functional before starting work.
Especially useful: fresh project setup, after pulling from another developer, after a git clone.

```bash
#!/usr/bin/env bash
# Usage: bash .claude/reference/apex-health-check.sh
# Or run inline: paste into terminal from project root

echo "[apex-health] Checking Apex v1.4 installation..."
WARNINGS=0
FAILURES=0

# 1. Required root files
for f in CLAUDE.md CONTEXT.md KNOWLEDGE-BASE.md; do
  if [ -f "$f" ]; then
    echo "[apex-health] PASS: $f"
  else
    echo "[apex-health] FAIL: missing $f"
    FAILURES=$((FAILURES + 1))
  fi
done

# 2. Required agent files (spot-check key agents)
for f in .claude/agents/ORACLE.md .claude/agents/TITAN.md \
         .claude/agents/SENTINEL.md .claude/agents/BUILDER.md \
         .claude/agents/BREAKER.md .claude/agents/COUNSEL.md; do
  if [ -f "$f" ]; then
    echo "[apex-health] PASS: $f"
  else
    echo "[apex-health] FAIL: missing $f"
    FAILURES=$((FAILURES + 1))
  fi
done

# 3. Required mode files
for f in .claude/modes/GREENFIELD-PIPELINE.md \
         .claude/modes/BROWNFIELD.md \
         .claude/modes/LAUNCH-READY.md; do
  if [ -f "$f" ]; then
    echo "[apex-health] PASS: $f"
  else
    echo "[apex-health] FAIL: missing $f"
    FAILURES=$((FAILURES + 1))
  fi
done

# 4. Required reference files
for f in .claude/reference/TOOL-CONFIG.md \
         .claude/reference/TEMPLATES.md \
         .claude/reference/SCRIPTS.md \
         .claude/reference/VERIFICATION-TIERS.md; do
  if [ -f "$f" ]; then
    echo "[apex-health] PASS: $f"
  else
    echo "[apex-health] FAIL: missing $f"
    FAILURES=$((FAILURES + 1))
  fi
done

# 5. Project scripts (WARN only — created at SCAFFOLD time, not at install)
for f in scripts/hygiene-check.ts scripts/fitness-check.sh; do
  if [ -f "$f" ]; then
    echo "[apex-health] PASS: $f"
  else
    echo "[apex-health] WARN: $f not yet created (expected — run at SCAFFOLD time)"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# 6. QUALITY_GATES configured in CONTEXT.md
if grep -q "QUALITY_GATES:" CONTEXT.md 2>/dev/null; then
  if grep -qv "QUALITY_GATES:    \[" CONTEXT.md 2>/dev/null; then
    echo "[apex-health] PASS: QUALITY_GATES configured in CONTEXT.md"
  else
    echo "[apex-health] WARN: QUALITY_GATES present but not yet filled in CONTEXT.md"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "[apex-health] WARN: QUALITY_GATES not found in CONTEXT.md (set at project start)"
  WARNINGS=$((WARNINGS + 1))
fi

# 7. hygiene-check self-test (only if the script exists)
if [ -f "scripts/hygiene-check.ts" ] && command -v tsx &>/dev/null; then
  if tsx scripts/hygiene-check.ts scripts/hygiene-check.ts &>/dev/null; then
    echo "[apex-health] PASS: hygiene-check.ts passes on itself"
  else
    echo "[apex-health] FAIL: hygiene-check.ts fails on itself — check SCRIPTS.md"
    FAILURES=$((FAILURES + 1))
  fi
fi

# 8. fitness-check dry run (only if script exists and src/ directory exists)
if [ -f "scripts/fitness-check.sh" ] && [ -d "src" ]; then
  if bash scripts/fitness-check.sh &>/dev/null; then
    echo "[apex-health] PASS: fitness-check.sh passes on current src/"
  else
    echo "[apex-health] FAIL: fitness-check.sh reports violations — run manually for details"
    FAILURES=$((FAILURES + 1))
  fi
fi

echo ""
echo "[apex-health] Result: $FAILURES failure(s), $WARNINGS warning(s)"
if [ "$FAILURES" -eq 0 ]; then
  echo "[apex-health] Installation looks good. Warnings are expected on fresh installs."
else
  echo "[apex-health] Fix failures before starting work. Warnings can wait until SCAFFOLD."
fi
exit 0  # always exits 0 — diagnostic only
```
