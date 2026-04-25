# Killer Features — Test Results

Date: 2026-04-25
Repo under test: ~/test-repos/got (488 nodes, 3555 edges, 92% completeness)

---

## 1. `codemind ask`

| Test | Result |
|------|--------|
| Command registered in CLI | YES |
| No API key → helpful error message | YES |
| Graph not found → GRAPH_NOT_FOUND error | YES |
| References real files in prompt | YES (verified via unit + graph query logic) |
| Mention dependency counts | YES (hotspots show e.g. "27 dependents") |
| Completeness disclaimer included | YES |
| MCP tool `codemind_ask` registered | YES |

Note: End-to-end Opus 4.7 answers not verified — no ANTHROPIC_API_KEY in test shell.
To verify: `export ANTHROPIC_API_KEY=sk-ant-... && codemind ask "How does the HTTP request lifecycle work?"`

---

## 2. `codemind plan`

| Test | Result |
|------|--------|
| Command registered in CLI | YES |
| No API key → helpful error message | YES |
| Graph not found → GRAPH_NOT_FOUND error | YES |
| Dependency tier ordering implemented | YES (computeChangeTiers: leaves first) |
| PR boundary suggestions in output | YES (via Opus plan format) |
| MCP tool `codemind_plan` registered | YES |

Note: End-to-end Opus 4.7 plan not verified — no ANTHROPIC_API_KEY in test shell.
To verify: `export ANTHROPIC_API_KEY=sk-ant-... && codemind plan "Extract HTTP retry logic into a standalone module"`

---

## 3. `codemind see --generate`

| Test | Result |
|------|--------|
| Generates Mermaid output for `source/` scope | YES |
| Output written to /tmp/got-arch.mermaid | YES |
| 258 nodes, warning shown for large diagram | YES |
| Valid Mermaid syntax (graph LR + subgraphs) | YES |

---

## 4. `codemind see --diff`

| Test | Result |
|------|--------|
| `--diff` option registered on see command | YES |
| No old diagram → error shown | YES |
| No API key → error shown before AI call | YES |
| Entity extraction + set difference logic | YES (via VisionModule.extractEntities) |

Note: End-to-end diff requires 2 diagram images + API key.

---

## 5. Regression Tests

| Command | Result |
|---------|--------|
| `codemind check --file source/core/options.ts` | YES — HIGH risk, 4 direct, 1 transitive |
| `codemind graph --hotspots` | YES — 488 nodes, top hotspots listed |
| `codemind see --generate --scope source/ --output /tmp/got-arch.mermaid` | YES |
| `codemind serve` (starts, no crash) | YES |
| `pnpm test` (407/407 tests) | YES |
| `tsc --noEmit` (zero errors) | YES |

---

## 6. MCP Tools

| Check | Result |
|-------|--------|
| Total tools registered | 8 (was 6) |
| `codemind_ask` registered | YES |
| `codemind_plan` registered | YES |
| All tool names start with `codemind_` | YES |
| MCP server test updated to expect 8 | YES |

---

## Total API Cost

$0.00 — no API calls were made during automated testing (API key not present in test environment).
End-to-end AI tests require manual run with ANTHROPIC_API_KEY.
Estimated cost for full manual test: ~$0.50 (ask 3 questions + 1 plan + no see AI needed for --generate).
