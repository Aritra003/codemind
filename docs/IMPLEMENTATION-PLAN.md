# IMPLEMENTATION-PLAN.md — CodeMind CLI v1
# Mode: PLANNER | Agent: BUILDER (co-owner TITAN)
# Scope: Hackathon — packages/cli + packages/shared ONLY
# Canonical reference: ARCHITECTURE.md (canonical file tree + DECISIONS LOCKED)
# REQUIREMENT CHANGELOG applied: 2 active entries (hackathon scope, CV-001 deferred)
# Status: AWAITING TITAN SIGN-OFF
# Last updated: 2026-04-23
================================================================================

## ⚠ SCAFFOLD vs CANONICAL TREE DISCREPANCY — TITAN REVIEW REQUIRED

The SCAFFOLD produced in Gate 18 deviated from the canonical ARCHITECTURE.md file tree
in several ways. TITAN must explicitly approve the resolution before BUILDER begins TDD.

| Canonical (ARCHITECTURE.md) | Scaffolded | BUILDER Recommendation |
|---|---|---|
| `graph/walker.ts` | merged into `graph/indexer.ts` | SPLIT: walker is >50 lines standalone |
| `graph/parser.ts` | merged into `graph/indexer.ts` | SPLIT: parser alone ~150 lines with tree-sitter |
| `graph/git.ts`    | merged into `graph/indexer.ts` | SPLIT: git history logic is standalone |
| `graph/coverage.ts` | merged into `graph/indexer.ts` | SPLIT: detection logic is standalone |
| `graph/persist.ts` | merged into `graph/store.ts`  | SPLIT: msgpack I/O is the ONLY allowed msgpack import (DL-007 fitness function) |
| `graph/completeness.ts` | merged into `graph/indexer.ts` | SPLIT: pure function, easily testable alone |
| `analysis/blast-radius.ts` | merged into `graph/traversal.ts` | SPLIT: BFS is BC-02 Analysis, not BC-01 Graph |
| `analysis/risk.ts` | not created | CREATE: risk rule engine is standalone |
| `analysis/coverage-gap.ts` | not created | CREATE: gap detection from coverage signals |
| `analysis/incident.ts` | not created | CREATE: git-note incident correlation |
| `vision/extract.ts` | merged into `vision/vision-module.ts` | SPLIT: retry logic + schema validation alone ~100 lines |
| `vision/resolve.ts` | merged into `vision/vision-module.ts` | SPLIT: entity resolution standalone |
| `vision/compare.ts` | merged into `vision/vision-module.ts` | SPLIT: deterministic diff, pure function |
| `vision/report.ts` | merged into `vision/vision-module.ts` | SPLIT: Mermaid generator standalone |
| `vision/mappings.ts` | not created | CREATE: see-mappings.yaml read/write |
| `forensics/triage.ts` | merged into `forensics/forensics-module.ts` | SPLIT: AI call is standalone |
| `forensics/backward.ts` | merged into `forensics/forensics-module.ts` | SPLIT: backward BFS is standalone |
| `forensics/ranking.ts` | merged into `forensics/forensics-module.ts` | SPLIT: deterministic ranking is standalone |
| `forensics/narrative.ts` | merged into `forensics/forensics-module.ts` | SPLIT: Opus call + confidence cap is standalone |
| `mcp/tools/*.ts` (5 files) | not created | CREATE: each MCP tool is its own file |
| `output/renderer.ts` | replaced with `output/format.ts` | KEEP format.ts name (aligns with existing format.ts) |
| `output/themes.ts` | not created (colors inline in format.ts) | CREATE: extract color constants per DL-006 boundary |
| `output/html-report.ts` | not created | CREATE: needed for --report flags |
| `lib/errors.ts` | not created (throws new Error() inline) | CREATE: CodemindError types — needed for typed errors |
| `lib/connections.ts` | not created | CREATE: .codemind/connections.yaml reader |
| `lib/ai.ts` | created as `lib/ai/client.ts` + `lib/ai/models.ts` | KEEP split (cleaner separation) |
| `lib/telemetry.ts` | created as `lib/telemetry/client.ts` | KEEP (cleaner) |
| Runner files (check-runner.ts etc.) | created during SCAFFOLD | KEEP — these bridge CLI layer to service layer |

**TITAN decision needed**: Approve the SPLIT approach (match canonical tree) vs KEEP condensed.
BUILDER recommendation: SPLIT to match ARCHITECTURE.md. DL-006 fitness-check.sh enforces
no direct msgpack outside graph/persist.ts — which currently fails since we have msgpack in store.ts.

================================================================================
## FEATURE: CodeMind CLI v1 — Local Tool Implementation
================================================================================

Scope: BC-01 (Graph) + BC-02 (Analysis) + BC-03 (Vision) + BC-04 (Forensics) + BC-05 (MCP)
       Excludes: packages/server, packages/web, all cloud/auth/billing features
SPEC INVARIANTS enforced: INV-001, INV-002, INV-003, INV-004, INV-005

================================================================================
## SPRINT A — Infrastructure Layer
## No dependencies. Implement first. These unlock all other files.
================================================================================

### A-01 | src/lib/errors.ts
Layer: infrastructure | Depends on: none
Contract:
  export class CodemindError extends Error {
    constructor(public readonly code: string, message: string, public readonly hint?: string)
  }
  export class AITimeoutError extends CodemindError {}
  export class GraphStaleError extends CodemindError {}
  export class GraphMissingError extends CodemindError {}
  export class InjectionAttemptError extends CodemindError {}
Max lines: 60
TDD plan: test each error class has correct code + message + instanceof chain
Acceptance: all 4 error types constructable; CodemindError.code is always set; AITimeoutError instanceof CodemindError

### A-02 | src/lib/connections.ts
Layer: infrastructure | Depends on: A-01
Contract:
  export interface ConnectionDeclaration { from: string; to: string; kind: string; note?: string }
  export interface ConnectionsFile { version: number; connections: ConnectionDeclaration[] }
  export async function loadConnections(repoRoot: string): Promise<ConnectionsFile | null>
  // Returns null if .codemind/connections.yaml does not exist — not an error
Max lines: 50
TDD plan: fixture yaml → parses correctly; missing file → null; invalid yaml → CodemindError
Acceptance: valid yaml parses; missing file returns null (not throws); malformed yaml throws CodemindError

### A-03 | src/lib/config.ts (implement stub)
Layer: infrastructure | Depends on: A-01
Contract:
  export interface CodemindConfig { anthropic_api_key?: string; telemetry: TelemetryConfig; ai: AIConfig; limits: LimitConfig }
  export async function loadConfig(): Promise<CodemindConfig>
  export async function saveConfig(patch: Partial<CodemindConfig>): Promise<void>
  // Config location: ~/.codemind/config.yaml
  // NEVER throws on missing file — returns safe defaults
Max lines: 80
TDD plan: missing file → safe defaults; valid file → parsed correctly; API key in env var → honoured
Acceptance: missing config → no throw; ANTHROPIC_API_KEY env var overrides yaml value; telemetry defaults to false

### A-04 | src/lib/output/themes.ts (new file — extract from format.ts)
Layer: infrastructure | Depends on: none
Contract:
  export const RISK_SYMBOL: Record<RiskLevel, string>
  export const RISK_COLOR: Record<RiskLevel, chalk.Chalk>
  export const BRAND_COLOR = chalk.hex('#6366F1')
  // All chalk color constants live here. Never inline in other files. (DL-006 + DESIGN-SYSTEM.md)
Max lines: 40
TDD plan: each RiskLevel maps to a symbol; symbols are single unicode chars; BRAND_COLOR is defined
Acceptance: all 5 RiskLevel variants have both symbol and color; BRAND_COLOR defined

### A-05 | src/lib/validate-env.ts (implement stub)
Layer: infrastructure | Depends on: A-01
Contract:
  export function validateEnvCli(): void
  // For CLI: only ANTHROPIC_API_KEY is checked (optional — only warned if AI command run without it)
  // process.exit(1) is NOT called at startup for missing optional vars
Max lines: 40
TDD plan: no env vars → no throw (CLI); ANTHROPIC_API_KEY present → returns normally
Acceptance: CLI startup does not fail without API key; validation is a warning, not a hard stop at startup

### A-06 | src/lib/telemetry/client.ts (implement stub)
Layer: infrastructure | Depends on: A-01
Contract:
  export class TelemetryClient {
    constructor(config: TelemetryConfig)
    async emit(event: { event: string; properties: Record<string, unknown> }): Promise<void>
    async flush(): Promise<void>
    // No-op when config.enabled = false (DL-011: telemetry is opt-in)
    // Fire-and-forget: never throws. Silent on network error.
    // Batches up to 50 events. Flushes every 60s OR on explicit flush() call.
    // flushTimer.unref() — never keeps the process alive
  }
Max lines: 90
TDD plan: disabled → no events queued; enabled → events queued; flush drains queue; >50 events → batched
Acceptance: DL-011 — emit() no-op when telemetry disabled; flush() drains queue; process.unref() called on timer; never throws

================================================================================
## SPRINT B — Graph Layer (BC-01)
## Depends on Sprint A. Implement in this exact order — each file uses the previous.
================================================================================

### B-01 | src/graph/walker.ts (new file)
Layer: repository | Depends on: A-01
Contract:
  export interface WalkerOptions { repoRoot: string; include: string[]; respectGitignore: boolean }
  export interface DiscoveredFile { absolutePath: string; relativePath: string; language: string | null }
  export async function walkFiles(options: WalkerOptions): Promise<DiscoveredFile[]>
  export function detectLanguage(filePath: string): string | null
  // Supported: TypeScript (.ts, .tsx), JavaScript (.js, .jsx). Python deferred to Sprint 2.
  // Respects .gitignore (use ignore package)
  // Skips: node_modules, .codemind, dist, build, coverage
Max lines: 100
TDD plan: fixture dir → finds .ts files; node_modules → excluded; .gitignore patterns → honoured
Acceptance: finds all .ts/.tsx files; skips node_modules; detectLanguage('foo.ts') = 'typescript'

### B-02 | src/graph/parser.ts (new file)
Layer: repository | Depends on: B-01, A-01, shared/graph.ts
Contract:
  export interface ParseResult { nodes: GraphNode[]; edges: GraphEdge[]; parse_errors: number }
  export async function parseFile(discoveredFile: DiscoveredFile): Promise<ParseResult>
  // Uses tree-sitter + tree-sitter-typescript
  // Extracts: function/method/class declarations → GraphNode
  // Extracts: function calls, imports → GraphEdge (unresolved — resolver fills in NodeId targets)
  // Node ID format: "relative/path.ts::symbolName"
  // parse_errors counts files that failed to parse (completeness signal)
Max lines: 150
TDD plan: single .ts file with 2 functions → 2 nodes + 1 call edge; import statement → import edge; syntax error → parse_errors++
Acceptance: node ID format is "file::symbol"; call edges have from+to as NodeIds; import edges have kind='imports'

### B-03 | src/graph/git.ts (new file)
Layer: repository | Depends on: shared/graph.ts, A-01
Contract:
  export interface GitNodeHistory { node_id: NodeId; change_count_6mo: number; last_changed: number; authors: string[] }
  // authors: name only — NEVER email (INV-003 + GDPR)
  export async function loadNodeHistory(repoRoot: string, nodes: GraphNode[]): Promise<Map<NodeId, GitNodeHistory>>
  // Uses simple-git. Falls back gracefully if git not available (sets change_count_6mo = 0)
  // Groups commits by file path (not symbol level — too expensive)
Max lines: 80
TDD plan: git available → returns history; git not available → returns empty map (no throw); author email stripped
Acceptance: authors array contains names only (no @); git unavailable → empty map, no throw

### B-04 | src/graph/coverage.ts (new file)
Layer: repository | Depends on: shared/graph.ts, A-01
Contract:
  export type CoverageFormat = 'lcov' | 'v8' | 'istanbul' | 'none'
  export interface NodeCoverage { node_id: NodeId; covered: boolean; format: CoverageFormat }
  export async function loadCoverage(repoRoot: string, nodes: GraphNode[]): Promise<Map<NodeId, NodeCoverage>>
  // Detects coverage format by looking for: coverage/lcov.info, coverage/coverage-summary.json
  // Returns empty map if no coverage file found — not an error
Max lines: 100
TDD plan: lcov fixture → parses correctly; no coverage file → empty map (no throw); v8 json → parses correctly
Acceptance: no coverage files → empty map, not throw; covered node maps to covered=true; uncovered maps to false

### B-05 | src/graph/completeness.ts (new file)
Layer: repository | Depends on: shared/graph.ts
Contract:
  export interface CompletenessReport { completeness_pct: number; blind_spots: string[]; unresolved_calls: number; total_calls: number }
  export function computeCompleteness(edges: GraphEdge[]): CompletenessReport
  // static_resolution_rate = edges with kind='calls' and to.resolution='static' / total call edges
  // blind_spots = file patterns with 0 static resolution (likely dynamic dispatch)
  // INV-002: completeness_pct is the single source of truth for graph self-reporting
Max lines: 60
TDD plan: all static edges → 100%; all ambiguous edges → low %; empty graph → 100% (vacuous truth)
Acceptance: INV-002 — completeness_pct always a number 0–100; pure function (no side effects); empty graph = 100

### B-06 | src/graph/persist.ts (new file — extract from store.ts)
Layer: repository | Depends on: shared/graph.ts, A-01
Contract:
  export async function saveGraph(storeDir: string, graph: CodeGraph): Promise<void>
  export async function loadGraph(storeDir: string): Promise<{ graph: CodeGraph; ageMs: number } | null>
  // ONLY FILE ALLOWED TO IMPORT msgpackr (DL-007 + fitness-check.sh)
  // Writes atomically: write to .tmp then rename — no partial writes
  // CodeGraph.nodes (Map) → serialized as Array<[NodeId, GraphNode]> (msgpack)
  // Returns null if file does not exist — not an error
Max lines: 80
TDD plan: save+load round-trip → identical graph; missing file → null; atomic write (rename)
Acceptance: DL-007 — ONLY msgpackr import; Map survives round-trip; missing file → null not throw; atomic write (no partial)

### B-07 | src/graph/store.ts (refactor stub — remove persist logic)
Layer: repository | Depends on: shared/graph.ts, B-06
Contract:
  export class GraphStore {
    constructor(storeDir: string)
    async load(maxAgeMs?: number): Promise<CodeGraph | null>   // delegates to persist.ts
    async save(graph: CodeGraph): Promise<void>                 // delegates to persist.ts
    async exists(): Promise<boolean>
    async ageMs(): Promise<number | null>
  }
  // GraphStore is a thin facade — no msgpack logic here (lives in persist.ts)
Max lines: 60
TDD plan: load delegates to persist; save delegates to persist; ageMs = current time - file mtime
Acceptance: no msgpack imports; delegates to persist.ts correctly; stale maxAgeMs returns null

### B-08 | src/graph/indexer.ts (refactor stub — orchestrator only)
Layer: service | Depends on: B-01, B-02, B-03, B-04, B-05, B-06, A-02
Contract:
  export class GraphIndexer {
    async index(options: IndexerOptions, onProgress?: (p: IndexProgress) => void): Promise<CodeGraph>
    async reindex(existing: CodeGraph, changedFiles: string[], options: IndexerOptions): Promise<CodeGraph>
  }
  // Orchestrates: walkFiles → parseFile (per file) → resolveEdges → loadNodeHistory → loadCoverage
  //               → computeCompleteness → build CodeGraph
  // resolveEdges: static first (exact match on NodeId), then connections.yaml declarations
  // INV-002: sets completeness_pct from computeCompleteness result
  // SLO-S05: p99 < 45s on 50K nodes (onProgress used for user feedback)
Max lines: 120
TDD plan: fixture repo with 3 .ts files → graph with correct node_count + edge_count; progress callbacks fired
Acceptance: INV-002 — completeness_pct set; git unavailable → graph still built; fixture → deterministic node_count

================================================================================
## SPRINT C — Analysis Layer (BC-02)
## Depends on Sprint B. BFS + risk rules + coverage gap detection.
================================================================================

### C-01 | src/analysis/blast-radius.ts (new file — move from traversal.ts)
Layer: service | Depends on: shared/graph.ts, A-01
Contract:
  export function computeBlastRadius(graph: CodeGraph, changedNodes: NodeId[]): BlastRadius
  // BFS outward using reverse adjacency (dependent → what it depends on)
  // Separates direct (depth=1) from transitive (depth>1)
  // Includes graph.completeness_pct in BlastRadius.completeness_pct (INV-002)
  // SLO-C05: p99 < 2s on 50K nodes
Max lines: 80
TDD plan: single changed node with 2 dependents → direct=[2], transitive=[]; chain of 3 → direct=[1], transitive=[1]
Acceptance: INV-002 — completeness_pct always set; empty changed_nodes → empty result; cyclic graph → no infinite loop

### C-02 | src/analysis/risk.ts (new file)
Layer: service | Depends on: shared/graph.ts, C-01, A-01
Contract:
  export function classifyRisk(radius: Omit<BlastRadius, 'risk_level'>): RiskLevel
  // Deterministic rule engine — no AI (DL-012: LLM never replaces deterministic output)
  // Rules (in order):
  //   CRITICAL: transitive_dependents.length > 50 OR (coverage_gaps > 10 AND direct > 5)
  //   HIGH:     transitive_dependents.length > 20 OR coverage_gaps > 5
  //   MEDIUM:   direct_dependents.length > 5 OR coverage_gaps > 0
  //   LOW:      otherwise
  // Rules must be transparent — no magic numbers. Constants exported for tests.
Max lines: 60
TDD plan: each threshold boundary tested (50 transitives → CRITICAL, 49 → HIGH); coverage gaps tested
Acceptance: DL-012 — pure function, no AI; all 4 risk levels reachable; boundary values tested exactly

### C-03 | src/analysis/coverage-gap.ts (new file)
Layer: service | Depends on: shared/graph.ts, B-04, A-01
Contract:
  export function detectCoverageGaps(affectedNodes: NodeId[], coverage: Map<NodeId, NodeCoverage>): NodeId[]
  // Returns affected nodes that have no coverage data OR covered=false
  // If coverage map is empty: all affected nodes are gaps (conservative — better to over-warn)
Max lines: 40
TDD plan: 3 nodes, 1 covered → gaps=[2]; empty coverage map → all nodes are gaps; empty affected → []
Acceptance: empty coverage → all nodes returned as gaps (conservative); pure function

### C-04 | src/analysis/incident.ts (new file)
Layer: service | Depends on: shared/graph.ts, B-03, A-01
Contract:
  export function correlateIncidents(nodes: NodeId[], history: Map<NodeId, GitNodeHistory>): boolean
  // Returns true if any changed node has change_count_6mo > 3 (high-churn = incident correlation signal)
  // Used by risk.ts to boost risk classification
  // Simple heuristic — not AI (DL-012)
Max lines: 40
TDD plan: high-churn node → true; no history → false; low-churn → false
Acceptance: pure function; no history → false (not throws); DL-012 — no AI

### C-05 | src/analysis/analysis-module.ts (refactor stub)
Layer: service | Depends on: C-01, C-02, C-03, C-04, B-03, B-04
Contract:
  export class AnalysisModule {
    constructor(graph: CodeGraph)
    resolveFilesToNodes(files: string[], repoRoot: string): NodeId[]
    computeBlastRadius(changedFiles: string[], repoRoot: string): BlastRadius
    // Orchestrates: resolveFilesToNodes → blast-radius → risk → coverage-gap → incident correlation
  }
Max lines: 60
TDD plan: changed file → blast radius computed; risk level assigned; coverage gaps populated
Acceptance: resolveFilesToNodes handles both absolute and relative paths; result always has risk_level

================================================================================
## SPRINT D — AI Client
## Depends on Sprint A only. Implement in parallel with Sprint B/C (no dependency).
================================================================================

### D-01 | src/lib/ai/models.ts (verify stub — already scaffolded)
Layer: infrastructure | Depends on: none
Contract:
  export type AITask = 'think-blast-radius' | 'vision-extract-diagram' | ...
  export const MODEL_ROUTING: Record<AITask, ModelConfig>
  export function selectModel(task: AITask): ModelConfig
  // Note: ARCHITECTURE.md uses claude-opus-4-7 for ALL tasks — forensics-triage uses Haiku in scaffold.
  // TITAN flag: model routing in ARCHITECTURE.md (p.505) says ALL tasks use claude-opus-4-7.
  // Scaffold used claude-haiku-4-5-20251001 for triage to reduce cost. Needs TITAN resolution.
Max lines: 50 (already at limit — verify no changes needed)
TDD plan: selectModel returns correct config per task; hardcoded model strings do not exist in other files
Acceptance: ARCHITECTURE.md model table matches selectModel() output; no hardcoded model strings outside this file

### D-02 | src/lib/ai/client.ts (implement stub)
Layer: infrastructure | Depends on: D-01, A-01, shared types
Contract:
  export class AIClient {
    constructor(config: UserConfig)
    async analyzeBlastRadius(radius: BlastRadius, summary: GraphSummaryForAI): Promise<AIAnalysis>
    async extractDiagramEntities(imagePath: string): Promise<DiagramExtractionResult>
    async resolveEntityNames(extracted: string[], graphNodeNames: string[]): Promise<EntityResolutionResult[]>
    async narrateTrace(trace: Pick<ForensicsTrace, 'ranked_commits' | 'origin_classification' | 'code_paths'>): Promise<string>
    async triageError(sanitizedInput: string): Promise<{ symbols: string[]; likely_domain: string }>
  }
  // INV-005: ONLY file that imports @anthropic-ai/sdk (hygiene-check.ts enforces at build)
  // INV-004: all responses have confidence capped at 0.8
  // All methods: 30s timeout → AITimeoutError. Max config.ai.max_retries retries on transient errors.
  // POL-07: vision-extract-diagram max 1 retry. On 2nd failure: emit D-02, return partial result.
  // Prompt caching: system prompts use cache_control: ephemeral where MODEL_ROUTING.cacheSystemPrompt = true
  // INV-005: GraphSummaryForAI must be validated to contain NO source code before sending
Max lines: 180
TDD plan: mock Anthropic SDK; analyzeBlastRadius → confidence capped at 0.8; timeout → AITimeoutError; disabled api key → throws on construction
Acceptance: INV-004 — confidence always ≤ 0.8; INV-005 — no source code in any prompt (hygiene-check.ts passes); AITimeoutError on timeout

================================================================================
## SPRINT E — Vision Layer (BC-03)
## Depends on Sprint B + Sprint D.
================================================================================

### E-01 | src/vision/extract.ts (new file)
Layer: service | Depends on: D-02, A-01
Contract:
  export async function extractDiagramEntities(ai: AIClient, imagePath: string): Promise<DiagramExtractionResult>
  // POL-07: max 1 retry. On 2nd failure: emit D-02 event, return partial result (never crash)
  // Validates image: PNG/JPG accepted; SVG → throw UnsupportedFormatError (rasterize = future)
  // Validates response with Zod schema before returning
Max lines: 80
TDD plan: mock AIClient; 1st call fails → retries; 2nd call fails → partial result (no throw); SVG → throws
Acceptance: POL-07 — only 1 retry; 2 failures → partial result not exception; D-02 event emitted on 2nd failure

### E-02 | src/vision/resolve.ts (new file)
Layer: service | Depends on: D-02, shared/graph.ts, A-01
Contract:
  export async function resolveEntities(ai: AIClient, extracted: DiagramExtractionResult, graph: CodeGraph): Promise<EntityResolutionResult[]>
  // Batches entity names → AIClient.resolveEntityNames (Haiku classification)
  // INV-004: all EntityResolutionResult.confidence ≤ 0.8
Max lines: 60
TDD plan: 3 extracted entities → 3 results; confidence capped; empty extracted → empty array
Acceptance: INV-004 — confidence ≤ 0.8 on all results; empty → empty (no throw)

### E-03 | src/vision/compare.ts (new file)
Layer: service | Depends on: shared/graph.ts, A-01
Contract:
  export function compareToGraph(resolved: EntityResolutionResult[], graph: CodeGraph): DriftReport
  // Deterministic — no AI (DL-012)
  // phantom = resolved entity with no matched_node_id
  // missing = graph node with no diagram counterpart (by module-level heuristic)
  // accuracy_pct = matched / (matched + phantom + missing) * 100
Max lines: 60
TDD plan: 3 resolved (1 phantom, 1 missing) → accuracy_pct = 33%; all matched → 100%; empty graph → 0%
Acceptance: DL-012 — no AI; accuracy_pct formula matches spec; pure function

### E-04 | src/vision/report.ts (new file)
Layer: service | Depends on: shared/graph.ts
Contract:
  export function generateMermaidDiff(report: DriftReport): string
  // Generates Mermaid graph showing phantom (red) + missing (yellow) + matched (green) nodes
  // Used by --report flag
Max lines: 60
TDD plan: report with phantoms → mermaid string contains phantom node names; empty report → valid mermaid
Acceptance: output is valid Mermaid syntax; phantom nodes annotated; pure function

### E-05 | src/vision/mappings.ts (new file)
Layer: repository | Depends on: A-01
Contract:
  export interface SeeMappings { version: number; mappings: Record<string, string> }
  export async function loadMappings(repoRoot: string): Promise<SeeMappings | null>
  export async function saveMappings(repoRoot: string, mappings: SeeMappings): Promise<void>
  // Reads/writes .codemind/see-mappings.yaml (user-provided diagram→graph label overrides)
Max lines: 50
TDD plan: valid yaml → parsed; missing file → null; round-trip save+load → identical
Acceptance: missing file → null not throw; round-trip fidelity

### E-06 | src/vision/vision-module.ts (refactor stub — delegate to sub-files)
Layer: service | Depends on: E-01, E-02, E-03, E-04, E-05
Contract:
  export class VisionModule {
    constructor(ai: AIClient)
    async extractEntities(imagePath: string): Promise<DiagramExtractionResult>
    async resolveEntities(extracted: DiagramExtractionResult, graph: CodeGraph): Promise<EntityResolutionResult[]>
    compareToGraph(resolved: EntityResolutionResult[], graph: CodeGraph): DriftReport
  }
  // Thin orchestrator — delegates to extract.ts, resolve.ts, compare.ts
Max lines: 40
TDD plan: all methods delegate correctly; constructor stores ai reference
Acceptance: no business logic in VisionModule itself; delegates to sub-modules

================================================================================
## SPRINT F — Forensics Layer (BC-04)
## Depends on Sprint B + Sprint D.
================================================================================

### F-01 | src/forensics/sanitize.ts (new file — CRITICAL, injection prevention)
Layer: service | Depends on: A-01
Contract:
  export function sanitizeErrorInput(rawInput: string): string
  // INV-005 + injection prevention:
  // 1. Strip patterns: "ignore previous instructions", "you are now", "system prompt", <|im_start|>
  // 2. Truncate to max 500 chars
  // 3. Allow: stack trace text, error messages, function names, file paths
  // 4. On injection detected: emit security event log + throw InjectionAttemptError
Max lines: 60
TDD plan: injection string → InjectionAttemptError; long string → truncated at 500; stack trace → passes through
Acceptance: INV-005 enforced; injection patterns rejected; stack traces allowed; max 500 chars enforced

### F-02 | src/forensics/backward.ts (new file)
Layer: service | Depends on: shared/graph.ts, A-01
Contract:
  export function findCodePaths(graph: CodeGraph, changedNodes: NodeId[], symptomNodes: NodeId[]): NodeId[][]
  // Backward BFS from symptomNodes, searching for changedNodes
  // Depth limit: 10 (prevents infinite loops on cyclic graphs)
  // Returns empty array if no path found — not an error
Max lines: 70
TDD plan: linear path A→B→C with B changed → returns [[A,B,C]]; cyclic graph → terminates; no path → []
Acceptance: depth limit prevents infinite loop; cyclic graph terminates; no path → [] not throws

### F-03 | src/forensics/ranking.ts (new file)
Layer: service | Depends on: shared/graph.ts, B-03, A-01
Contract:
  export function rankCommits(commits: GitCommit[], symbols: string[], nodes: NodeId[]): RankedCommit[]
  // Deterministic scoring (no AI) — DL-012
  // Score = (symbol_overlap_weight * 0.4) + (recency_weight * 0.4) + (blast_radius_weight * 0.2)
  // Returns top 10 ranked commits
  // author: name only — NEVER email (INV-003 + GDPR)
  // INV-004: score is a raw relevance score, not a confidence claim
Max lines: 80
TDD plan: commit touching changed symbol scores higher; recent commit scores higher; author email stripped
Acceptance: INV-003 — no email in output; top 10 max; deterministic (same input = same output); DL-012 — no AI

### F-04 | src/forensics/triage.ts (new file)
Layer: service | Depends on: D-02, A-01
Contract:
  export async function triageError(ai: AIClient, sanitizedInput: string): Promise<{ symbols: string[]; likely_domain: string }>
  // Input MUST be sanitized (sanitize.ts called before this — never call with raw input)
  // Uses AIClient.triageError (Haiku — cheap classification)
  // Zod validates response before returning
Max lines: 50
TDD plan: mock AIClient; sanitized input → symbols extracted; Zod schema rejects malformed response
Acceptance: Zod validation on response; precondition: input is sanitized (documented, not enforced at runtime)

### F-05 | src/forensics/narrative.ts (new file)
Layer: service | Depends on: D-02, A-01, shared types
Contract:
  export async function generateNarrative(ai: AIClient, trace: Pick<ForensicsTrace, 'ranked_commits' | 'origin_classification' | 'code_paths'>): Promise<string>
  // Calls AIClient.narrateTrace (Opus — expensive, only with --narrative flag)
  // INV-004: narrative text must include "confidence capped at 80%" disclaimer
  // INV-005: trace object contains structural data only — no source code
Max lines: 50
TDD plan: mock AIClient; result includes confidence disclaimer; trace object has no source code fields
Acceptance: INV-004 — "confidence capped at 80%" in narrative; INV-005 — no source code sent

### F-06 | src/forensics/forensics-module.ts (refactor stub — delegate to sub-files)
Layer: service | Depends on: F-01, F-02, F-03, F-04, F-05, B-03
Contract:
  export class ForensicsModule {
    constructor(graph: CodeGraph, ai: AIClient, repoRoot: string)
    sanitizeErrorInput(rawInput: string): string
    async parseError(sanitizedInput: string): Promise<{ symbols: string[]; likely_domain: string }>
    async rankCommits(symbols: string[], lookbackDays: number): Promise<RankedCommit[]>
    classifyOrigin(commits: RankedCommit[]): OriginClass
    findCodePaths(changedNodes: NodeId[], symptomNodes: NodeId[]): NodeId[][]
    async assemble(sanitizedInput: string, lookbackDays: number, generateNarrative: boolean): Promise<ForensicsTrace>
  }
  // Thin orchestrator. classifyOrigin is deterministic (no AI for clear cases).
  // ForensicsTrace.confidence_cap = 0.8 always (INV-004)
Max lines: 80
TDD plan: assemble calls sub-modules in order; classifyOrigin returns UNKNOWN for empty commits
Acceptance: INV-004 — confidence_cap = 0.8 in all ForensicsTrace results; assemble orchestrates correctly

================================================================================
## SPRINT G — Output Layer
## Depends on shared types + Sprint C/E/F for format types.
================================================================================

### G-01 | src/lib/output/format.ts (implement stubs — formatCheckResult etc.)
Layer: infrastructure | Depends on: A-04 (themes), shared types, Sprint C+E+F types
Contract: (implement the 3 stub functions)
  formatCheckResult(result, json): string  — full DESIGN-SYSTEM.md CLI anatomy
  formatSeeResult(result, json): string    — drift report with accuracy bar
  formatTraceResult(result, json): string  — forensics trace with ranked commits
  // CV-004: AI-enriched sections must show formatAIAttribution (already implemented)
  // INV-002: completeness warning already implemented
Max lines: 180
TDD plan: CRITICAL result → red badge; json=true → valid JSON; completeness < 90 → yellow warning; AI attribution present
Acceptance: INV-002 — completeness always shown; CV-004 — AI attribution shown when AI used; WCAG — no color-only info

### G-02 | src/lib/output/html-report.ts (new file)
Layer: infrastructure | Depends on: shared types, Sprint C/E/F types
Contract:
  export function generateCheckReport(result: CodemindResult<BlastRadius>): string
  export function generateSeeReport(result: CodemindResult<DriftReport>): string
  export function generateTraceReport(result: CodemindResult<ForensicsTrace>): string
  // Returns a self-contained HTML string (no external deps — inline CSS)
  // Written to .codemind/reports/[command]-[timestamp].html by runners
Max lines: 150
TDD plan: result with CRITICAL risk → HTML contains 'CRITICAL'; HTML is valid (no unclosed tags)
Acceptance: self-contained HTML (no CDN links); each result type generates unique output

================================================================================
## SPRINT H — MCP Tools (BC-05)
## Depends on Sprint C + E + F + G.
================================================================================

### H-01 | src/mcp/tools/check.ts (new file)
Layer: service | Depends on: Sprint C, G, A-06
Contract:
  export function createCheckTool(): Tool
  // MCP tool: codemind_check
  // Input schema: { files: string[], think: boolean }
  // Calls runCheckCore() and formats for MCP response
  // Returns MCP ToolResult with text content
Max lines: 60

### H-02 | src/mcp/tools/see.ts (new file)
Layer: service | Depends on: Sprint E, G, A-06
Contract:
  export function createSeeTool(): Tool
  // MCP tool: codemind_see; Input: { diagram_path: string }
Max lines: 50

### H-03 | src/mcp/tools/trace.ts (new file)
Layer: service | Depends on: Sprint F, G, A-06
Contract:
  export function createTraceTool(): Tool
  // MCP tool: codemind_trace; Input: { error_input: string, lookback_days: number }
Max lines: 50

### H-04 | src/mcp/tools/graph.ts (new file)
Layer: service | Depends on: Sprint B, G
Contract:
  export function createGraphTool(): Tool
  // MCP tool: codemind_graph; Input: { hotspots: boolean, focus: string, depth: number }
Max lines: 50

### H-05 | src/mcp/tools/status.ts (new file)
Layer: service | Depends on: Sprint B
Contract:
  export function createStatusTool(): Tool
  // MCP tool: codemind_status — returns graph age, node count, completeness_pct, CLI version
Max lines: 40

### H-06 | src/mcp/server.ts (implement stub)
Layer: service | Depends on: H-01 through H-05
Contract:
  export function createMcpServer(): Server  // @modelcontextprotocol/sdk Server
  // stdio transport; registers all 5 tools
  // Tools execute in process — no additional process spawning
Max lines: 70

================================================================================
## SPRINT I — Integration Wiring (Commands)
## Depends on all above. Runners already scaffolded — finalise them.
================================================================================

### I-01 | src/commands/index-runner.ts (finalise — already scaffolded)
Layer: CLI | Depends on: B-07, B-08, G-01
Status: scaffolded. No changes needed if Sprint B compiles correctly.
TDD: integration test with fixture repo → graph built + saved; --force flag forces rebuild
Acceptance: graph file created in .codemind/; completeness shown; progress spinner fires

### I-02 | src/commands/check-runner.ts (finalise — already scaffolded)
Layer: CLI | Depends on: C-05, D-02, G-01, A-06
Status: scaffolded. Depends on Sprint C/D being implemented.
TDD: integration test; staged file → blast radius computed; --think with no API key → error shown
Acceptance: no API key → graceful error (not crash); K-03/K-04 event emitted

### I-03 | src/commands/see-runner.ts (finalise — already scaffolded)
Layer: CLI | Depends on: E-06, D-02, G-01, A-06
TDD: PNG fixture → vision pipeline runs; unsupported format → clear error
Acceptance: unsupported format → clear error (not crash); D-02 emitted on 2nd extraction failure

### I-04 | src/commands/trace-runner.ts (finalise — already scaffolded)
Layer: CLI | Depends on: F-06, D-02, G-01, A-06
TDD: error string → trace assembled; no API key → early exit with message
Acceptance: K-06 event emitted; sanitizeErrorInput called before any AI call

### I-05 | src/commands/graph-runner.ts (finalise — already scaffolded)
Layer: CLI | Depends on: B-07, C-01, G-01
TDD: --hotspots → sorted list; --output → JSON file written; no graph → clear error
Acceptance: --output creates file; --hotspots sorts by descending dependents

================================================================================
## TEST FILE LOCATIONS
================================================================================

Unit tests (per module):
  tests/unit/lib/errors.test.ts
  tests/unit/lib/connections.test.ts
  tests/unit/lib/config.test.ts
  tests/unit/lib/telemetry.test.ts
  tests/unit/graph/walker.test.ts
  tests/unit/graph/parser.test.ts
  tests/unit/graph/git.test.ts
  tests/unit/graph/coverage.test.ts
  tests/unit/graph/completeness.test.ts
  tests/unit/graph/persist.test.ts
  tests/unit/graph/store.test.ts
  tests/unit/graph/indexer.test.ts
  tests/unit/analysis/blast-radius.test.ts
  tests/unit/analysis/risk.test.ts
  tests/unit/analysis/coverage-gap.test.ts
  tests/unit/analysis/incident.test.ts
  tests/unit/vision/extract.test.ts
  tests/unit/vision/resolve.test.ts
  tests/unit/vision/compare.test.ts
  tests/unit/forensics/sanitize.test.ts
  tests/unit/forensics/ranking.test.ts
  tests/unit/forensics/backward.test.ts
  tests/unit/output/format.test.ts

Integration tests (full command paths):
  tests/integration/commands/index.test.ts
  tests/integration/commands/check.test.ts
  tests/integration/commands/see.test.ts
  tests/integration/commands/trace.test.ts
  tests/integration/commands/graph.test.ts

Fixtures (small deterministic repos):
  tests/fixtures/simple-ts-repo/src/   (3 files, 5 functions, 2 call edges — all static)
  tests/fixtures/coverage-repo/        (same + lcov.info present)
  tests/fixtures/no-git-repo/          (no .git/ — tests graceful fallback)

================================================================================
## SHARED FUNCTIONS TO CREATE
================================================================================
(Seed for ARCHITECTURE.md Shared Function Registry)

  SFR-001  sanitizeErrorInput(raw: string): string → src/forensics/sanitize.ts
  SFR-002  computeBlastRadius(graph, changedNodes): BlastRadius → src/analysis/blast-radius.ts
  SFR-003  classifyRisk(radius): RiskLevel → src/analysis/risk.ts
  SFR-004  computeCompleteness(edges): CompletenessReport → src/graph/completeness.ts
  SFR-005  detectLanguage(filePath): string | null → src/graph/walker.ts
  SFR-006  selectModel(task: AITask): ModelConfig → src/lib/ai/models.ts (already exists)
  SFR-007  formatAIAttribution(model): string → src/lib/output/format.ts (already exists)
  SFR-008  formatCompletenessWarning(pct): string → src/lib/output/format.ts (already exists)

================================================================================
## SUMMARY
================================================================================

DB changes required:     NO (local CLI — no database)
New external service:    NO (Anthropic SDK already in THREAT-MODEL.md)
Blast radius:            packages/cli only | reversible (all new files or stub implementations)
Total new files:         18 new files to create
Total stubs to implement: 14 existing stub files to implement
Total test files:        28 test files

Estimated sessions:
  Sprint A (infrastructure): 1 session
  Sprint B (graph):          2 sessions (parser.ts has tree-sitter complexity)
  Sprint C (analysis):       1 session
  Sprint D (AI client):      1 session
  Sprint E (vision):         1 session
  Sprint F (forensics):      1 session
  Sprint G (output):         1 session
  Sprint H (MCP tools):      1 session
  Sprint I (integration):    1 session
  Integration tests + fixtures: 1 session
  Total: ~11 sessions

================================================================================
## TITAN SIGN-OFF REQUIRED
## Write "PLAN APPROVED — TITAN [ISO date]" in CONTEXT.md before BUILDER begins TDD.
## TITAN must explicitly resolve:
##   T-01: Scaffold discrepancy — approve SPLIT approach (match canonical tree)
##   T-02: Model routing discrepancy — forensics-triage: Haiku (scaffold) vs Opus (ARCHITECTURE.md p.505)
================================================================================
