#!/usr/bin/env bash
set -euo pipefail

FAIL=0

# No Anthropic SDK outside lib/ai/client.ts
if grep -r "from.*anthropic" packages/cli/src --include="*.ts" \
     | grep -v "lib/ai/client\.ts" | grep -q .; then
  echo "FAIL: Anthropic SDK imported outside lib/ai/client.ts"
  FAIL=1
fi

# No msgpackr import outside graph/persist.ts
if grep -rE "from 'msgpackr'|require\('msgpackr'\)" packages/cli/src --include="*.ts" \
     | grep -v "graph/persist\.ts" | grep -q .; then
  echo "FAIL: msgpackr imported outside graph/persist.ts"
  FAIL=1
fi

# No prisma in routes (post-hackathon: packages/server not present — skip gracefully)
if [ -d "packages/server/src/routes" ]; then
  if grep -r "from.*prisma" packages/server/src/routes | grep -q .; then
    echo "FAIL: Prisma imported directly in routes layer"
    FAIL=1
  fi
fi

# No HTTP calls in repositories (post-hackathon guard)
if [ -d "packages/server/src/repositories" ]; then
  if grep -r "fetch\|axios\|got" packages/server/src/repositories | grep -q .; then
    echo "FAIL: HTTP client used in repositories layer"
    FAIL=1
  fi
fi

if [ $FAIL -ne 0 ]; then
  echo "Fitness check FAILED — layer boundaries violated."
  exit 1
fi

echo "Fitness check passed."
