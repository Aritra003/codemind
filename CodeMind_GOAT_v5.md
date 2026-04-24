# CodeMind — Final Build Specification

> **The one document. Build from this.**
> Version 5.0 · April 2026 · Built with Opus 4.7 Hackathon

---

## Identity

**CodeMind is a local code graph with X-ray vision.**

It indexes your codebase into a structural graph in seconds, works entirely offline, and optionally uses Opus 4.7 to see what no tool has seen before: the gap between what your architecture diagram SAYS and what your code DOES.

**The graph is the product. Everything else is a query.**

---

## Design Principles (Non-Negotiable)

These seven rules override every other decision in this document. If a feature violates any of these, cut the feature.

| # | Principle | What It Means |
|---|---|---|
| 1 | **Offline-first** | Every command works without an API key. The graph is deterministic and local. Opus 4.7 is the `--think` enrichment layer — it makes things BETTER, never FUNCTIONAL. |
| 2 | **Radical honesty** | Every output shows what CodeMind knows AND what it doesn't. `Graph completeness: 83% · 417 ambiguous call sites`. This honesty IS the brand. |
| 3 | **Sub-second for daily use** | `codemind check` (blast radius) returns in < 2 seconds. If it can't, it ships without that feature. Developers disable slow tools. |
| 4 | **Screenshot-worthy output** | Terminal output should be so beautiful that developers share it on Twitter. Think `htop`, not `top`. Think `bat`, not `cat`. Every line of CLI output is designed. |
| 5 | **One install, zero config** | `npx codemind` indexes the repo and works. No config file. No API key. No account. Config exists for those who want it, never required. |
| 6 | **Composable** | Every command has `--json`. The MCP server exposes the raw graph. The graph exports to Mermaid, DOT, JSON. Other tools can build on top. |
| 7 | **Honest about what tree-sitter misses** | Static analysis cannot see event emitters, DI containers, message queues, or dynamic dispatch. CodeMind says so in every output. Teams can teach it via `connections.yaml`. |

---

## Commands

Six commands. Six verbs. No sub-brands, no product names, no marketing layers.

```
codemind             (no args → interactive: shows status + suggests next action)
codemind index       Build or update the code graph
codemind check       Blast radius of staged changes or a specific file
codemind see         Compare an architecture diagram to actual code
codemind trace       Trace an error backward to its probable cause
codemind graph       Export or visualize the raw code graph
codemind serve       Start MCP server for Claude Code integration
```

Every command except `see` works fully offline. `see` requires Opus 4.7 for vision extraction (reading the diagram). `--think` on any command adds Opus 4.7 reasoning on top of deterministic analysis.

---

## The Graph

### What Gets Indexed

```
codemind index
```

Walks the repo. Detects languages. Parses with tree-sitter. Builds a graph of every function, class, module, import, call site, and test file. Loads git history per node (who changed it, when, how often). Persists to `.codemind/graph.msgpack` (MessagePack — 10x smaller and faster than JSON).

### Schema

```typescript
interface CodeNode {
  id: string;                  // Deterministic: sha256(file_path + ":" + name + ":" + type)
  name: string;
  type: 'function' | 'class' | 'module' | 'type' | 'test' | 'variable';
  file_path: string;
  line_start: number;
  line_end: number;
  language: string;
  signature?: string;          // For functions: parameter types + return type
  
  // Git metadata
  change_count_6mo: number;    // Commits touching this node in last 6 months
  last_changed_at: string;     // ISO date
  last_changed_by: string;     // git author
  
  // Test linkage
  has_test_file: boolean;      // Heuristic: test file with matching name exists
  measured_coverage?: number;  // 0-100, ONLY if LCOV/coverage.json found on disk
  coverage_source?: 'lcov' | 'nyc' | 'coverage_py' | 'go_cover' | 'heuristic';
}

interface CodeEdge {
  from: string;
  to: string;
  type: 'CALLS' | 'IMPORTS' | 'INHERITS' | 'TESTED_BY' | 'EXPORTS';
  resolution: 'static' | 'inferred' | 'declared';
  // 'static' = tree-sitter resolved deterministically
  // 'inferred' = Opus resolved via --think
  // 'declared' = team declared in connections.yaml
}

interface GraphMeta {
  node_count: number;
  edge_count: number;
  languages: string[];
  
  // THE HONESTY METRIC
  completeness: {
    static_resolution_rate: number;    // % of call sites resolved by tree-sitter
    ambiguous_call_sites: number;      // Could not resolve target
    inferred_by_llm: number;           // Resolved via --think
    declared_by_team: number;          // From connections.yaml
    known_blind_spots: string[];       // "event emitters", "DI containers" etc.
  };
  
  coverage_data_available: boolean;    // Did we find real coverage files?
  indexed_at: string;
  index_duration_ms: number;
}
```

### What tree-sitter Misses (And What We Do About It)

Research shows tree-sitter resolves ~80% of call sites in well-structured codebases. The remaining 20% includes:

| Blind Spot | Example | Mitigation |
|---|---|---|
| Method dispatch through interfaces | `service.validate()` where `service` is typed as `Validator` | `--think`: Opus infers from context |
| Event emitters | `bus.emit('payment.done')` | `connections.yaml` |
| Dependency injection | `@Inject(AuthService)` | `connections.yaml` |
| Message queues | Kafka/RabbitMQ consumers | `connections.yaml` |
| Dynamic requires | `require(envVar)` | Flagged as ambiguous |
| Config-driven routing | Express route tables loaded from config | `connections.yaml` |

**`connections.yaml`** — teams declare what static analysis can't see:

```yaml
# .codemind/connections.yaml
connections:
  - from: "src/payments/processor.ts:processPayment"
    to: "src/notifications/email.ts:sendReceipt"
    via: "EventBus:payment.completed"
  - from: "src/api/gateway.ts:handleRequest"
    to: "src/workers/invoice.ts:generate"
    via: "RabbitMQ:invoice.queue"
```

These edges appear in the graph with `resolution: 'declared'` and are traversed by `check` and `trace` like any other edge.

---

## Command: `codemind check`

**The daily driver. Fast. Deterministic. Offline.**

```bash
codemind check                      # Analyze staged changes
codemind check --file src/auth.ts   # Analyze specific file
codemind check --think              # Add Opus 4.7 failure analysis
codemind check --report             # Generate static HTML report
```

### Two Speeds

| Speed | What Runs | Latency | API Required |
|---|---|---|---|
| **Fast** (default) | Graph traversal + risk classification + coverage gaps | < 2 seconds | No |
| **Think** (`--think`) | Everything above + Opus 4.7 explains the risk, predicts failures, suggests tests, references git history | 15-30 seconds | Yes |

The pre-commit hook (`codemind check --install-hook`) ALWAYS runs Fast. If risk is HIGH or CRITICAL, it prints: `⚠ Run codemind check --think for full analysis`. Never blocks for 30 seconds.

### Risk Classification (Rules, Not Fake Scores)

No made-up 0-100 scores. Transparent rules that developers can inspect and override:

```typescript
function classifyRisk(analysis: BlastRadius): RiskLevel {
  const { direct, transitive, coverage_gaps, has_incident_history } = analysis;
  
  if (direct > 50 && has_incident_history && coverage_gaps.length > 0)
    return 'CRITICAL';  // High blast radius + past incidents + gaps
  if (direct > 30 || (direct > 15 && coverage_gaps.length > 0))
    return 'HIGH';      // Large blast radius or moderate + untested
  if (direct > 10 || coverage_gaps.length > 0)
    return 'MEDIUM';    // Noticeable blast radius or any gap
  return 'LOW';         // Small change, well-tested area
}
```

Teams can override thresholds in `.codemind/config.yaml`:
```yaml
thresholds:
  critical_min_direct: 50
  high_min_direct: 30
  medium_min_direct: 10
```

### Terminal Output (Designed, Not Dumped)

```
 ╭──────────────────────────────────────────────────────────╮
 │  CODEMIND CHECK                                          │
 │  ▌ src/auth/middleware.ts                                │
 ╰──────────────────────────────────────────────────────────╯

  Risk   ██████████████░░░░░░  HIGH
  Reason  38 direct dependents · 2 coverage gaps · incident history

  ┌─────────────────────────────┬───────┬──────────┐
  │ Dependent                   │ Depth │ Coverage │
  ├─────────────────────────────┼───────┼──────────┤
  │ src/api/routes/payment.ts   │   1   │  ✓ 91%  │
  │ src/api/routes/user.ts      │   1   │  ✓ 87%  │
  │ src/workers/webhook.ts      │   1   │  ✗ none │ ← gap
  │ src/mobile/auth.ts          │   2   │  ✗ none │ ← gap
  │ ... 34 more (all covered)   │       │         │
  └─────────────────────────────┴───────┴──────────┘

  ℹ Graph completeness: 83% · 12 ambiguous call sites in blast zone
  ℹ Run codemind check --think for failure scenario analysis

  ⏱ 1.4s · 12,847 nodes · 31,204 edges
```

This output is the thing people screenshot. Every character is intentional.

### `--think` Enrichment (Opus 4.7)

When `--think` is passed, the deterministic analysis is already complete. Opus receives the RESULT and is asked to EXPLAIN it, not redo it:

```
Prompt to Opus:
"Here is a blast radius analysis for a change to auth/middleware.ts.
38 direct dependents. 2 have no test coverage. This file has incident
history from March. The change modifies the token validation logic.

Based on this analysis:
1. What should a code reviewer specifically check?
2. What tests should exist but don't?
3. What does the March incident history suggest about this area?

Be concrete. Reference file paths and line numbers."
```

Opus EXPLAINS deterministic analysis. It does not REPLACE it. This is the correct division of labor.

---

## Command: `codemind see`

**The hero feature. The thing nobody else has. The hackathon wow.**

```bash
codemind see diagram.png                     # Compare diagram to code
codemind see diagram.png --scope services/   # Limit to a directory
codemind see diagram.png --verify            # Show extraction before comparing
codemind see diagram.png --output arch.mermaid   # Save corrected diagram
codemind see diagram.png --ui                # Open side-by-side in browser
```

### Pipeline

```
Image on disk (whiteboard photo, Lucidchart PNG, Miro export, C4 diagram)
     │
     ▼
[1] Opus 4.7 Vision (3.75MP) → extracts components + connections as JSON
     │  Validates JSON schema. Retries once on failure. Shows error if extraction fails.
     │
     ▼
[2] Code graph → extracts actual components + connections from indexed graph
     │  Groups nodes by directory/module to match diagram granularity
     │
     ▼
[3] Entity resolution — Opus 4.7 matches diagram names to code entities
     │  "Auth Service" → src/auth/ (confidence: 95%)
     │  "Payment Gateway" → src/payments/stripe.ts (confidence: 82%)
     │  Returns unmapped items on both sides
     │
     ▼
[4] Structural comparison — deterministic diff of matched entities
     │  Matches: connections that exist in both
     │  Phantoms: in diagram but not in code (stale)
     │  Missing: in code but not in diagram (undocumented)
     │  Intermediaries: diagram shows A→B, code has A→X→B
     │
     ▼
[5] Output: accuracy %, divergence list, corrected Mermaid diagram
```

### The `--verify` Step

Before running the comparison, `--verify` shows the developer what was extracted from the diagram and asks for confirmation:

```
 ╭──────────────────────────────────────────────────────────╮
 │  CODEMIND SEE — Extraction Preview                       │
 ╰──────────────────────────────────────────────────────────╯

  From your diagram I extracted:

  Components (7):
    Auth Service · Payment Gateway · User DB · Redis Cache
    API Gateway · Notification Service · Message Queue

  Connections (9):
    API Gateway → Auth Service
    Auth Service → User DB
    Auth Service → Redis Cache
    API Gateway → Payment Gateway
    ...

  Does this look right? [Y/n/edit]
```

This prevents the entire analysis from running on a bad extraction. The developer catches mistakes in 5 seconds instead of discovering them in the output.

### Entity Resolution

The critical step that v4 handwaved. Opus receives both lists and performs fuzzy matching:

```typescript
interface EntityMatch {
  diagram_name: string;
  code_entity: string | null;       // null = phantom
  confidence: number;
  match_basis: 'name' | 'directory' | 'semantic' | 'manual';
}

// Persisted in .codemind/see-mappings.yaml for future runs
// Teams can manually edit this file to correct matches
```

### Output

```
 ╭──────────────────────────────────────────────────────────╮
 │  CODEMIND SEE — Architecture Reality Check               │
 ╰──────────────────────────────────────────────────────────╯

  Accuracy  ████████████░░░░░░░░  58%

  ✓ Matches (5)
    API Gateway → Auth Service              confirmed
    Auth Service → User DB                  confirmed
    Auth Service → Redis Cache              confirmed
    ...

  ✗ Phantoms — in diagram, not in code (2)
    Notification Service → Email Provider   service decommissioned Feb 2026
    Auth Service → Legacy LDAP              removed in commit f3a21b

  ⊕ Missing — in code, not in diagram (3)
    Auth Service → EventBus → Audit Logger  undocumented audit trail
    Payment Gateway → Retry Queue → Stripe  queue intermediary missing
    API Gateway → Rate Limiter              added March 2026, diagram not updated

  ◇ Intermediaries — diagram shows direct, code has intermediary (1)
    Diagram: API Gateway → Payment Gateway
    Actual:  API Gateway → Auth Middleware → Payment Gateway

  ℹ Corrected Mermaid diagram saved to .codemind/architecture.mermaid
  ℹ Open with: codemind see diagram.png --ui
```

---

## Command: `codemind trace`

**The emergency tool. Post-incident root cause.**

```bash
codemind trace "TypeError: Cannot read property 'token' of undefined"
codemind trace --stack-trace error.log
codemind trace "connection timeout" --days 30    # Wider lookback
```

### Pipeline

```
Error message or stack trace
     │
     ▼
[1] TRIAGE (Opus 4.7, fast) — classify origin:
    CODE | INFRASTRUCTURE | DEPENDENCY | CONFIG | DATA | UNKNOWN
    If not CODE → skip code trace, suggest what to check instead
     │
     ▼
[2] Parse error → identify affected files + functions from stack trace
     │
     ▼
[3] Graph query → find all callers of affected nodes (backward trace)
     │
     ▼
[4] Git query → find all commits touching affected nodes in lookback window
     │
     ▼
[5] Rank commits by overlap with error path + recency + change size
    (deterministic ranking, no LLM needed for this step)
     │
     ▼
[6] Opus 4.7 → narrate the causal chain for top 3 candidates
    "Commit abc123 changed X, which broke Y, which caused Z"
     │
     ▼
[7] Output: ranked causes + causal narrative + prevention recommendation
```

### Confidence Cap

**Never output confidence above 80%.** CodeMind traces through code structure, not runtime execution. It doesn't know about deployment order, feature flags, infrastructure changes, or data state. Saying "94% confidence" from static analysis is dishonest.

```
  Probable cause  (confidence capped at static analysis)
  ┌───────────────────────────────────────────────────────┐
  │  1. commit f3a21b by Sarah · Apr 20 · auth.ts:45-78  │
  │     Likelihood: HIGH                                   │
  │     Changed: token validation logic                    │
  │     Chain: auth.ts → session_manager.ts → webhook.ts   │
  │                                                        │
  │  2. commit 8bc44a by James · Apr 19 · cache.ts:12     │
  │     Likelihood: MEDIUM                                 │
  │     Changed: cache TTL from 1h to 5min                 │
  │                                                        │
  │  ℹ Static analysis cannot see: env var changes,        │
  │    deployment order, feature flags, data corruption.    │
  │    Check those if code commits don't explain the error. │
  └───────────────────────────────────────────────────────┘
```

---

## Command: `codemind graph`

**The composability primitive. What makes this a platform, not just a tool.**

```bash
codemind graph                          # Interactive terminal graph summary
codemind graph --export mermaid         # Export as Mermaid diagram
codemind graph --export dot             # Export as Graphviz DOT
codemind graph --export json            # Export full graph as JSON
codemind graph --export html            # Self-contained interactive HTML
codemind graph --node src/auth.ts       # Show single node + its edges
codemind graph --hotspots               # Top 20 highest-blast-radius nodes
```

`--hotspots` is the "code health" view:

```
 ╭──────────────────────────────────────────────────────────╮
 │  CODEMIND HOTSPOTS — Highest Blast Radius Nodes          │
 ╰──────────────────────────────────────────────────────────╯

  #   File                        Callers  Changes  Coverage
  1.  src/auth/middleware.ts          47       18    ✗ none
  2.  src/db/connection.ts            39        3    ✓ 72%
  3.  src/utils/logger.ts             34        7    ✓ 45%
  4.  src/api/validation.ts           28       12    ✗ none
  ...

  ℹ These are the files where a single bug causes the most damage.
  ℹ Prioritize test coverage here.
```

This is the slide that gets shown in engineering all-hands. This is the output that gets pasted in Slack. This is what makes the tool stick.

---

## MCP Server + Skill File

### MCP Tools

Five tools. Maps 1:1 to CLI commands.

| MCP Tool | CLI Equivalent | Description |
|---|---|---|
| `codemind_check` | `codemind check` | Blast radius analysis. Default: fast/offline. Add `think: true` for Opus enrichment. |
| `codemind_see` | `codemind see` | Diagram vs. code comparison. Requires image path. |
| `codemind_trace` | `codemind trace` | Error → root cause trace. |
| `codemind_graph` | `codemind graph` | Export or query the code graph. |
| `codemind_status` | `codemind` (no args) | Index health + completeness metric. |

### Skill File (`.claude/skills/codemind.md`)

Teaches Claude Code WHEN to use each tool. Three key rules:

1. **Before calling any tool, call `codemind_status`.** If the index is stale (>7 days), suggest re-indexing.
2. **Use `codemind_check` whenever the developer modifies shared code** (anything with >5 callers). Skip for tests, docs, config.
3. **Use `codemind_see` when an architecture diagram is referenced.** Use `codemind_trace` when an error is pasted.

The full skill file is a separate deliverable (already created).

---

## Build Plan — 7 Days

### Day 1: The Graph
- tree-sitter TypeScript parser → extract functions, classes, imports, call sites
- In-memory graph with adjacency list (nodes + edges)
- MessagePack persistence (`.codemind/graph.msgpack`)
- `codemind index` command with progress bar
- `codemind` (no args) shows status + completeness metric
- Git history loader (per-node: change_count, last_changed, author)
- Coverage file auto-detection (nyc, lcov, coverage.py)
- **Exit criterion:** Index a real 5K-line TS project. Completeness metric shows correct %.

### Day 2: Check (Fast Tier)
- BFS blast radius traversal (configurable depth 1-8, default 4)
- Risk classification (transparent rules, not weighted scores)
- Coverage gap detection (has_test_file heuristic + measured if available)
- Beautiful terminal output (the screenshot-worthy version)
- `--json` flag
- `--install-hook` (pre-commit, fast tier only)
- **Exit criterion:** `codemind check` returns in < 2 seconds on demo repo. Output looks like the spec.

### Day 3: See (The Hero)
- Opus 4.7 Vision API call → extract components + connections
- JSON schema validation on extraction (retry once on failure)
- Entity resolution via Opus (diagram names → code entities)
- Structural comparison engine (matches, phantoms, missing, intermediaries)
- Mermaid diagram generator
- `--verify` step (show extraction, ask for confirmation)
- Terminal output (the accuracy %, the diff table)
- **Exit criterion:** Run on 3 different diagram styles (whiteboard photo, Lucidchart, hand-drawn). Produces correct output on 2/3.

### Day 4: MCP + Skill + Check Deep
- MCP server (5 tools)
- Skill file
- `codemind serve` command
- Auto-config in `codemind index` ("Enable Claude Code integration? [Y/n]")
- Check `--think` tier (Opus explains deterministic analysis)
- Test in real Claude Code session
- **Exit criterion:** "What will break if I change auth.ts?" in Claude Code → correct impact report.

### Day 5: Trace + connections.yaml
- Error parser (extract files/functions from stack traces)
- Triage step (Opus classifies: CODE/INFRA/CONFIG/etc.)
- Backward graph traversal from error nodes
- Git commit ranking (overlap + recency + change size)
- Opus causal chain narrative
- Confidence cap at 80%
- `connections.yaml` support (parse, add to graph, traverse)
- **Exit criterion:** Given a real error from a demo repo, trace identifies the correct commit.

### Day 6: See UI + Hotspots
- Single-page React app for `codemind see --ui` (side-by-side view)
- Static HTML report for `codemind check --report`
- `codemind graph --hotspots` (the engineering all-hands slide)
- `codemind graph --export mermaid|dot|json|html`
- Python parser (tree-sitter-python) if time allows
- **Exit criterion:** `--ui` opens in browser, shows correct side-by-side.

### Day 7: Demo + Polish
- Error handling (bad images, empty repos, no git, API timeouts)
- Edge case testing (monorepo, single-file project, no tests)
- README.md (one GIF, one-line install, 60-second quickstart)
- Demo video (3 minutes)
- Submission package
- **Exit criterion:** Judge can `npx codemind` on a fresh repo and see results in under 60 seconds.

---

## Demo Script (3 Minutes)

### 0:00 — The Promise
"Every tool tells you what your code does. CodeMind tells you what your code does that you DON'T KNOW."

### 0:15 — The Index
```bash
npx codemind
```
Auto-detects, indexes, prints: `12,847 nodes · 31,204 edges · TypeScript + Python · Completeness: 83% · 417 ambiguous call sites · 1.2s`
"83% — that's what we can prove. Other tools claim 100%. We show you what we actually know."

### 0:45 — See (The Wow)
Upload messy whiteboard photo.
```bash
codemind see whiteboard.jpg --ui
```
Browser opens. Side-by-side: diagram vs. actual. "Accuracy: 58%." Phantoms highlighted in red. Missing connections in blue. Intermediaries shown as expanded paths.
"Your architecture diagram hasn't been updated since March. Three services in it don't exist anymore. Two real connections aren't shown. Here's the corrected version."

### 1:45 — Check (The Daily Driver)
```bash
codemind check --file src/auth/middleware.ts
```
1.4 seconds. Beautiful terminal output. HIGH risk. 38 dependents. 2 coverage gaps.
```bash
codemind check --think
```
20 seconds. Opus adds: "A similar change in March caused a 2-hour session timeout. The webhook handler has no test for the cold-cache path. Here's what to check before merging."
"Two speeds. Fast for every commit. Deep when the stakes are high."

### 2:30 — Claude Code Integration
In Claude Code: "What will break if I change the auth middleware?"
Claude calls `codemind_check` via MCP. Answers with the full analysis inline.
"No context switch. The code graph lives inside your AI editor."

### 2:50 — Close
"CodeMind. A local code graph with X-ray vision. Offline-first. Radically honest. Built with Opus 4.7. Open source."

---

## What Was Removed (And Why)

| Removed | Why |
|---|---|
| Weighted risk scores (0-100) | Fake precision. Transparent rules are debuggable and trustworthy. |
| Web UI for Impact + Forensics | Terminal output is better for structured text. HTML report flag for sharing. Saved 2 days of React. |
| "Managed Agent" for Forensics | Misuse of the term. Trace uses task budgets but it's a single API call, not a managed agent lifecycle. |
| DuckDB, Kuzu, FAISS, SQLite, Neo4j | All replaced by one in-memory graph + MessagePack file. Hackathon needs speed, not infra. |
| Verify (entire product) | Table-stakes in Cursor/Claude Code. Not novel. |
| Memory (entire product) | Occupied by Greptile/DeepWiki/Cody. Not novel. |
| Three-product branding | Modes are verbs (`check`, `see`, `trace`), not products. CodeMind is one tool. |
| GitHub Action, VS Code extension | Post-hackathon distribution. MCP + CLI is the hackathon surface. |
| $0-$20K/mo pricing tiers | Not relevant for a hackathon submission. |
| 18-month roadmap | This is a 7-day build. Roadmap is "win, then decide." |

## What Was Added (And Why)

| Added | Why |
|---|---|
| `connections.yaml` | tree-sitter can't see event emitters, DI, queues. Teams need to declare what static analysis misses. |
| Graph completeness metric | The brand identity. Every output shows what CodeMind knows and doesn't know. |
| Two-speed architecture | Fast (offline, <2s) + Think (Opus, 15-30s). Pre-commit hooks must be fast. |
| Entity resolution for Drift | The diagram says "Auth Service", the code says `src/auth/`. Matching is the hard problem. |
| Coverage source tracking | Distinguish "test file exists" from "actual coverage measured." Don't weight garbage signals. |
| Triage step for Trace | Classify error origin before blaming code. Prevents false attribution for infra/config issues. |
| Confidence cap at 80% | Static analysis cannot reach 94% confidence. Don't lie. |
| `--verify` step for See | Show diagram extraction before running comparison. Catch bad extractions early. |
| `codemind graph` command | The composability primitive. Export, query, visualize the raw graph. Makes CodeMind a platform. |
| `--report` HTML output | Static HTML file. Opens in any browser. No React app needed for Impact/Trace. |
| Error handling contracts | `CodemindResult<T>` with success/partial/failed states. LLMs return garbage sometimes. |

---

## Prize Targeting

| Prize | What Wins It | CodeMind Feature |
|---|---|---|
| **Most Creative Opus 4.7 Exploration** | "Made us feel something" | `codemind see` — watching your architecture diagram get corrected in real-time. Nobody has done this. The 3.75MP vision upgrade makes it possible. |
| **The "Keep Thinking" Prize** | "Found a problem nobody thought to point Claude at" | Architecture diagram rot is a universal engineering pain point that nobody has automated. The completeness metric reframes how tools should communicate uncertainty. |
| **Best Use of Claude Managed Agents** | "Long-running tasks you'd actually ship" | `codemind check --think` as a CI step that runs on every PR and posts the analysis as a comment. Not a demo — something you'd actually wire into your pipeline. |

---

*Build this. Ship this. Everything else is post-hackathon.*
