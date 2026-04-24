# EVENT-STORM.md — CodeMind Domain Model
# Mode: EVENT-STORM | Agent: ORACLE (co-owner: TITAN)
# Pipeline position: First gate — precedes SPEC and ARCHITECT
# Last updated: 2026-04-23
# Consumed by: ARCHITECT mode (TITAN) → informs service boundaries, aggregate ownership,
#              async contracts, and integration seams
================================================================================

## Session Protocol
Domain: Developer tooling — code graph intelligence, architecture drift detection,
        forensic root-cause analysis.
Target scale: 500K MAU. Dual product surface: local CLI (offline-first) + cloud
              platform (team sync, dashboards, billing).
Method: Event Storming — Orange = Domain Event, Blue = Command, Yellow = Aggregate,
        Pink = Policy, Lilac = Bounded Context, Red = Naming Conflict / Risk

================================================================================
## DOMAIN EVENTS (what happened — past tense, immutable facts)
================================================================================

### Graph Context Events
  GE-01  CodebaseIndexingStarted         (trigger: user runs `codemind index`)
  GE-02  SourceFileDiscovered            (each file found during walk)
  GE-03  FileParseSucceeded              (tree-sitter produced AST)
  GE-04  FileParseFailedWithWarning      (syntax error — node added with error flag)
  GE-05  GraphNodeCreated                (function | class | module | type | test | variable)
  GE-06  StaticEdgeResolved              (tree-sitter resolved call site deterministically)
  GE-07  AmbiguousCallSiteDetected       (interface/DI/dynamic dispatch — unresolved)
  GE-08  LLMEdgeInferred                 (Opus inferred call target via --think)
  GE-09  TeamDeclaredConnectionLoaded    (from .codemind/connections.yaml)
  GE-10  GitHistoryLoadedPerNode         (change_count_6mo, last_changed_by populated)
  GE-11  CoverageFileDetected            (nyc_output / lcov / coverage.json found)
  GE-12  MeasuredCoverageLoaded          (line/branch % populated from coverage file)
  GE-13  HeuristicCoverageFlagged        (test file exists but no measurement)
  GE-14  GraphPersistedToStorage         (graph.msgpack written to .codemind/)
  GE-15  IndexCompleted                  (full index with completeness metric)
  GE-16  GraphStalenessDetected          (>7 days since last index — triggers warning)
  GE-17  IncrementalUpdateApplied        (changed files re-parsed without full re-index)
  GE-18  GraphCorruptionDetected         (msgpack load failed — triggers full re-index)

### Analysis Context Events
  AE-01  BlastRadiusTraversalStarted     (BFS from changed nodes, depth 4)
  AE-02  DirectDependentFound            (depth-1 caller of changed node)
  AE-03  TransitiveDependentFound        (depth 2-N caller)
  AE-04  CoverageGapIdentified           (dependent has no test or low measured coverage)
  AE-05  IncidentHistoryCorrelated       (git note or JIRA tag found for changed file)
  AE-06  RiskClassified                  (LOW | MEDIUM | HIGH | CRITICAL by rules engine)
  AE-07  FastAnalysisCompleted           (<2s, no LLM, deterministic)
  AE-08  DeepAnalysisRequested           (user passed --think or auto-triggered on HIGH+)
  AE-09  DeepAnalysisCompleted           (Opus explained the deterministic result)
  AE-10  HTMLReportGenerated             (static HTML exported via --report flag)
  AE-11  PreCommitCheckTriggered         (hook fired before commit)
  AE-12  PreCommitCheckPassed            (risk < HIGH, hook exits 0)
  AE-13  PreCommitCheckFlaggedHighRisk   (risk HIGH+, hook exits 0 with warning — never blocks)

### Vision/Drift Context Events
  VE-01  DiagramUploadReceived           (image path provided to `codemind see`)
  VE-02  VisionExtractionStarted        (Opus 4.7 Vision API called)
  VE-03  DiagramComponentsExtracted     (JSON of components + connections returned)
  VE-04  ExtractionSchemaValidationFailed (JSON invalid — retry with stricter prompt)
  VE-05  ExtractionRetryAttempted        (second call with explicit schema constraint)
  VE-06  ExtractionFailed                (2 retries exhausted — error surfaced to user)
  VE-07  UserConfirmedExtraction         (--verify step: user approved extracted components)
  VE-08  UserCorrectedExtraction         (--verify step: user edited extracted components)
  VE-09  EntityResolutionStarted         (Opus maps diagram names → code entities)
  VE-10  EntityMappingConfirmed          (diagram name → code entity, confidence > 70%)
  VE-11  EntityMappingAmbiguous          (confidence 40-70% — flagged for user review)
  VE-12  EntityUnmapped                  (diagram name has no code counterpart = phantom)
  VE-13  EntityMappingOverrideApplied    (team override from see-mappings.yaml)
  VE-14  StructuralComparisonStarted     (deterministic diff of matched entity graphs)
  VE-15  MatchFound                      (connection exists in both diagram and code)
  VE-16  PhantomConnectionFound          (in diagram, not in code — stale documentation)
  VE-17  MissingConnectionFound          (in code, not in diagram — undocumented)
  VE-18  IntermediaryFound               (diagram A→B, code has A→X→B)
  VE-19  DriftAccuracyCalculated         (% of diagram connections that match code)
  VE-20  CorrectedMermaidDiagramGenerated (updated .mermaid file produced)
  VE-21  DriftMappingsFileSaved          (.codemind/see-mappings.yaml updated)
  VE-22  DriftUIOpened                   (browser opened with side-by-side view)

### Forensics Context Events
  FE-01  ErrorInputReceived              (error message or stack trace provided)
  FE-02  OriginClassificationStarted     (Opus triage: CODE|INFRA|CONFIG|DEPENDENCY|DATA)
  FE-03  OriginClassifiedAsCode          (error likely from code change → proceed with trace)
  FE-04  OriginClassifiedAsNonCode       (infra/config/dep/data → suggestion surfaced, trace skipped)
  FE-05  AffectedNodesIdentifiedFromStack (files/functions extracted from stack trace)
  FE-06  BackwardTraversalStarted        (walk callers of affected nodes in graph)
  FE-07  RelevantCommitFound             (git commit touches affected nodes in lookback window)
  FE-08  CommitsRankedByOverlap          (deterministic rank: overlap % + recency + change size)
  FE-09  CausalChainNarrated             (Opus written narrative for top 3 commits)
  FE-10  PreventionRecommendationGenerated (what test would have caught this)
  FE-11  ForensicsReportCompleted        (full output ready)
  FE-12  ConfidenceCapApplied            (raw score capped at 80% — static analysis limit)

### Integration Context Events
  IE-01  MCPServerStarted                (codemind serve)
  IE-02  MCPToolInvoked                  (Claude Code called codemind_* tool)
  IE-03  MCPResponseReturned             (result serialized and returned to Claude)
  IE-04  PreCommitHookInstalled          (--install-hook added to .git/hooks/pre-commit)
  IE-05  CICheckConfigured               (GitHub Actions / GitLab CI step written)
  IE-06  IndexStalenessWarningSent       (hook or CI detected stale graph)

### Identity Context Events (Cloud tier — 500K MAU)
  IM-01  UserRegistered                  (email + password or OAuth provider)
  IM-02  APIKeyIssued                    (scoped to user or team)
  IM-03  APIKeyRevoked                   (security action or rotation)
  IM-04  TeamCreated                     (org-level workspace created)
  IM-05  TeamMemberInvited               
  IM-06  TeamMemberAccepted             
  IM-07  RoleAssigned                    (admin | member | viewer)
  IM-08  SSOMappingConfigured            (enterprise — SAML/OIDC)
  IM-09  PasswordResetRequested         
  IM-10  AccountDeleted                  (GDPR delete — purge all associated data)

### Billing Context Events (Cloud tier — 500K MAU)
  BE-01  SubscriptionCreated             (free | pro | team | enterprise)
  BE-02  SubscriptionUpgraded           
  BE-03  SubscriptionDowngraded         
  BE-04  SubscriptionCancelled          
  BE-05  UsageLimitApproached            (80% of monthly API call quota)
  BE-06  UsageLimitExceeded              (100% — deep analysis blocked until reset)
  BE-07  InvoiceGenerated               
  BE-08  PaymentSucceeded               
  BE-09  PaymentFailed                   (retry + dunning flow)
  BE-10  TrialStarted                   
  BE-11  TrialExpired                   

### Telemetry Context Events (Cloud tier — operational)
  TE-01  CliCommandInvoked               (command name, duration, risk level — no code)
  TE-02  DeepAnalysisApiCalled           (tokens used, latency, model)
  TE-03  GraphIndexDurationRecorded      (node count, edge count, duration)
  TE-04  ErrorEncountered                (CLI error type + context — no stack PII)
  TE-05  FeatureFlagEvaluated            (flag name, variant — for A/B rollouts)

================================================================================
## COMMANDS (what triggers events — imperative)
================================================================================

  CMD-01  IndexCodebase            → GE-01..GE-15
  CMD-02  UpdateGraphIncremental   → GE-17 (or GE-18 + CMD-01 on corruption)
  CMD-03  AnalyzeBlastRadius       → AE-01..AE-07
  CMD-04  RequestDeepAnalysis      → AE-08..AE-09
  CMD-05  GenerateReport           → AE-10
  CMD-06  InstallPreCommitHook     → IE-04
  CMD-07  UploadDiagramForDrift    → VE-01..VE-06
  CMD-08  ConfirmExtraction        → VE-07 or VE-08
  CMD-09  ResolveEntities          → VE-09..VE-13
  CMD-10  CompareDiagramToCode     → VE-14..VE-21
  CMD-11  TraceError               → FE-01..FE-11
  CMD-12  StartMCPServer           → IE-01
  CMD-13  RegisterUser             → IM-01
  CMD-14  CreateTeam               → IM-04
  CMD-15  UpgradeSubscription      → BE-02

================================================================================
## AGGREGATES (what owns state — noun, consistency boundary)
================================================================================

  AGG-01  CodeGraph
    Owns: nodes, edges, meta, completeness metric, index timestamp
    Invariants:
      - Every node ID is deterministic: sha256(file_path + ":" + name + ":" + type)
      - No duplicate node IDs
      - Every edge has a valid from and to node ID
      - completeness.static_resolution_rate = (static edges / total call sites) × 100
    Commands: IndexCodebase, UpdateGraphIncremental
    Produces: GE-01..GE-18

  AGG-02  BlastRadiusAnalysis
    Owns: traversal result, risk level, coverage gaps, incident history flag
    Invariants:
      - Risk level derived ONLY from transparent rules (no weighted scores)
      - Pre-commit hook NEVER blocks; only warns on HIGH+
      - DeepAnalysis result is an enrichment layer — never replaces Fast result
    Commands: AnalyzeBlastRadius, RequestDeepAnalysis
    Produces: AE-01..AE-13

  AGG-03  DriftAnalysis
    Owns: diagram extraction, entity mapping, structural comparison, accuracy score
    Invariants:
      - Accuracy = matched connections / (matched + phantom + missing + intermediary) × 100
      - Entity mapping confidence < 70% always flagged — never silently assumed
      - Extraction retry capped at 2 attempts before surfacing error
    Commands: UploadDiagramForDrift, ConfirmExtraction, ResolveEntities, CompareDiagramToCode
    Produces: VE-01..VE-22

  AGG-04  ForensicsTrace
    Owns: triage result, commit ranking, causal narrative, prevention recommendation
    Invariants:
      - Confidence never exceeds 80% (static analysis limit — honesty invariant)
      - If origin ≠ CODE → code trace skipped, suggestion provided instead
      - All commit rankings are deterministic — Opus only narrates, never re-ranks
    Commands: TraceError
    Produces: FE-01..FE-12

  AGG-05  GitHistory
    Owns: per-node commit history, author attribution, change frequency
    Lifecycle: populated during IndexCodebase, updated during IncrementalUpdate
    Read by: BlastRadiusAnalysis (incident correlation), ForensicsTrace (commit ranking)

  AGG-06  UserAccount
    Owns: identity, API key(s), subscription tier, usage counters
    Invariants:
      - API key stored as bcrypt hash — plaintext never persisted
      - Usage counters are eventually consistent (ok to be ±5 calls)
      - AccountDeleted → cascade delete all user data within 30 days (GDPR)
    Commands: RegisterUser, IssueAPIKey, DeleteAccount
    Produces: IM-01..IM-10

  AGG-07  Team
    Owns: member roster, roles, shared graph refs, settings
    Invariants:
      - Team must always have at least one admin
      - TeamMember can only be removed by admin
    Commands: CreateTeam, InviteMember, AssignRole
    Produces: IM-04..IM-08

  AGG-08  Subscription
    Owns: plan tier, billing cycle, usage limits, payment state
    Invariants:
      - UsageLimitExceeded blocks DeepAnalysis (never Fast analysis — offline)
      - PaymentFailed starts a 7-day grace period before service restriction
    Commands: UpgradeSubscription, CancelSubscription
    Produces: BE-01..BE-11

================================================================================
## POLICIES (when event A → trigger command B automatically)
================================================================================

  POL-01  When IndexCompleted               → AutoLoadGitHistoryPerNode
  POL-02  When CoverageFileDetected         → ParseAndOverrideCoverageSignal
  POL-03  When GraphCorruptionDetected      → TriggerFullReindex
  POL-04  When GraphStalenessDetected       → SurfaceReindexSuggestionToUser
  POL-05  When RiskClassifiedHigh           → SuggestDeepAnalysisInOutput
  POL-06  When RiskClassifiedCritical       → PrintDetailedReviewerGuide
  POL-07  When ExtractionSchemaValidationFailed → RetryWithStricterPrompt (max 1 retry)
  POL-08  When ExtractionFailed             → SurfaceClearErrorWithSuggestions
  POL-09  When OriginClassifiedAsNonCode    → SkipCodeTrace + SurfaceAlternativeSuggestion
  POL-10  When UsageLimitApproached (80%)   → SendUsageWarningNotification
  POL-11  When UsageLimitExceeded           → BlockDeepAnalysisAPICall + ShowUpgradePrompt
  POL-12  When PaymentFailed                → StartGracePeriodTimer (7 days)
  POL-13  When TrialExpired                 → DowngradeToFreeTier
  POL-14  When AccountDeleted              → PurgeAllUserDataWithin30Days

================================================================================
## BOUNDED CONTEXTS
================================================================================

  BC-01  GRAPH
    Owner: Graph Aggregate (AGG-01) + Git History (AGG-05)
    Responsibility: parse, build, persist, and maintain the code graph
    External reads: tree-sitter (parsing), git (history), filesystem (coverage files)
    Integration seams → Analysis BC: GraphQueried event (read model)
    Integration seams → Vision BC: GraphQueried event (read model)
    Integration seams → Forensics BC: GraphQueried event (read model)
    Data: .codemind/graph.msgpack (local), optional cloud sync
    Language: TypeScript (Node.js)

  BC-02  ANALYSIS
    Owner: BlastRadiusAnalysis Aggregate (AGG-02)
    Responsibility: blast radius traversal, risk classification, coverage gap detection
    Reads from: GRAPH BC (read-only graph query)
    Triggers: INTEGRATION BC (reports), TELEMETRY BC (events)
    Data: ephemeral (analysis results not persisted by default; HTML report on --report)
    Language: TypeScript

  BC-03  VISION
    Owner: DriftAnalysis Aggregate (AGG-03)
    Responsibility: diagram extraction, entity resolution, structural comparison, drift report
    External dependency: Opus 4.7 Vision API (extraction + entity resolution)
    Reads from: GRAPH BC (read-only)
    Data: .codemind/see-mappings.yaml (entity override persistence)
    Language: TypeScript

  BC-04  FORENSICS
    Owner: ForensicsTrace Aggregate (AGG-04)
    Responsibility: error triage, backward graph traversal, commit ranking, causal narrative
    External dependency: Opus 4.7 (triage + narrative — optional; ranking is deterministic)
    Reads from: GRAPH BC, GIT HISTORY BC
    Language: TypeScript

  BC-05  INTEGRATION
    Owner: CLI interface + MCP server + hook system
    Responsibility: surface all bounded contexts through CLI verbs and MCP tools
    No domain logic — pure orchestration and presentation
    Adapts: all other BCs via defined ports
    Language: TypeScript (Node.js, commander.js or yargs, @modelcontextprotocol/sdk)

  BC-06  IDENTITY  [Cloud tier]
    Owner: UserAccount (AGG-06), Team (AGG-07)
    Responsibility: authentication, API key management, team membership
    External dependency: email provider (transactional), OAuth (GitHub/Google)
    Data: PostgreSQL (cloud, schema-separated: identity schema)
    Language: TypeScript (Node.js)

  BC-07  BILLING  [Cloud tier]
    Owner: Subscription (AGG-08)
    Responsibility: plan management, usage metering, payment processing
    External dependency: Stripe (payments), usage DB (metering)
    Data: PostgreSQL (cloud, schema-separated: billing schema)
    Language: TypeScript

  BC-08  TELEMETRY  [Cloud tier]
    Owner: No persistent aggregate — event stream only
    Responsibility: collect opt-in CLI usage events, power dashboards, detect anomalies
    External dependency: ClickHouse (analytics DB) or BigQuery
    Data: partitioned by date, 90-day hot retention, 2-year cold retention
    Language: TypeScript (ingestion), SQL (queries)

================================================================================
## INTEGRATION SEAMS (cross-context boundaries — these become API contracts)
================================================================================

  SEAM-01  INTEGRATION → GRAPH
    Type: synchronous function call (local process, same binary)
    Contract: GraphRepository interface { queryNodes, queryEdges, getBlastRadius }
    Failure mode: graph not indexed → return { status: 'unindexed' } (never throw)

  SEAM-02  INTEGRATION → ANALYSIS
    Type: synchronous function call (local process)
    Contract: AnalysisService interface { analyzeBlastRadius, classifyRisk }
    Failure mode: graph stale → warn user, proceed with potentially stale data

  SEAM-03  INTEGRATION → VISION
    Type: synchronous function call (local process)
    Contract: VisionService interface { extractDiagram, resolveEntities, compareToCodograph }
    Failure mode: Opus API unavailable → surface clear error (vision is always LLM-dependent)

  SEAM-04  INTEGRATION → FORENSICS
    Type: synchronous function call (local process)
    Contract: ForensicsService interface { triageError, traceToCommit }
    Failure mode: partial trace (Opus down) → deterministic ranking only, no narrative

  SEAM-05  CLI → CLOUD API
    Type: HTTPS REST (authenticated with API key)
    Contract: /api/v1/* endpoints (see API-DESIGN mode for full spec)
    Failure mode: offline → CLI works fully for Graph/Analysis/Forensics; Vision requires API

  SEAM-06  TELEMETRY ← ALL CONTEXTS
    Type: fire-and-forget event emission (never blocks CLI path)
    Contract: TelemetryClient.emit(event: TelemetryEvent): void
    Failure mode: telemetry failure is silently swallowed — never surfaces to user

  SEAM-07  BILLING → IDENTITY
    Type: synchronous (same cloud service process)
    Contract: SubscriptionService.checkEntitlement(userId, feature): boolean
    Failure mode: billing service down → OPEN (allow the action, log for reconciliation)

================================================================================
## NAMING CONFLICTS (red stickies — resolve before ARCHITECT)
================================================================================

  NC-01  "graph" overloaded
    Used in: BC-01 (the internal data structure), `codemind graph` command (export/visualize)
    Resolution: internal = CodeGraph (type/class name), user-facing = `graph` (CLI verb)
    TITAN: use CodeGraph in all internal interfaces, never expose the implementation type name

  NC-02  "analysis" vs "check"
    Used in: BC-02 domain (AnalysisContext), CLI verb is `check`
    Resolution: Domain layer uses Analysis*, CLI layer uses check
    TITAN: AnalysisService in the domain; CLI adapts it as the `check` command

  NC-03  "drift" vs "see"
    The architectural concept is "drift detection"; the CLI verb is `see`
    Resolution: Domain layer uses DriftAnalysis*, CLI layer uses see command
    Keep consistent throughout: never use "drift" in CLI-facing strings, never use "see" in domain code

  NC-04  "forensics" vs "trace"
    Same pattern as above. Domain = ForensicsTrace; CLI = `trace`

  NC-05  "completeness" vs "accuracy"
    Graph.completeness = how much of the static call graph was resolved
    DriftAnalysis.accuracy = how closely the diagram matches the code
    These are different metrics. BUILDER must not conflate them. Different fields, different docs.

================================================================================
## TITAN REVIEW — Context Map Acceptance
================================================================================

Bounded contexts reviewed. Mapping accepted with the following architectural notes
for ARCHITECT mode:

  1. BC-01 through BC-05 form the LOCAL product (CLI + MCP). Single binary, no network.
     These should be implemented as a modular monolith (co-located modules, clear interfaces).
     No microservices until PMF proven at 50K MAU.

  2. BC-06, BC-07, BC-08 form the CLOUD product. Separate deployment.
     These communicate with BC-05 (INTEGRATION) via authenticated REST API only.
     Cloud services are optional — the CLI degrades gracefully to offline-first mode.

  3. SEAM-01 through SEAM-04 must be defined as TypeScript interfaces before any implementation.
     BUILDER may not import concrete classes across context boundaries — only interfaces.

  4. SEAM-05 is the primary security surface. SENTINEL must review before BUILDER touches it.

  5. Telemetry (SEAM-06) must never block the CLI path. Fire-and-forget with 100ms timeout.

  6. POL-14 (GDPR delete cascade) is a legal invariant. COUNSEL must review before BUILDER
     implements the account deletion flow.

Context map accepted. Proceeding to ARCHITECT mode.

================================================================================
# END OF EVENT-STORM.md
# Next: SPEC mode (ORACLE) → SPEC.md
# Then: ARCHITECT mode (TITAN) → ARCHITECTURE.md
================================================================================
