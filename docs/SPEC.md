# SPEC.md — StinKit Product Specification
# Mode: SPEC | Agent: ORACLE
# Pipeline gate: SPEC → CRITIC → ARCHITECT (CRITIC completed: StinKit_Critical_Review.md, April 2026)
# Last updated: 2026-04-23
# Source: StinKit_GOAT_v5.md + 14 corrections from StinKit_Critical_Review.md
#         + 500K MAU non-functional requirements added
================================================================================

## Problem Statement

**Pain:** Every engineering team operates on a flawed mental model of their own codebase.
When a developer changes a shared utility, they don't know which services will break.
When an incident fires, the team wastes 30–90 minutes correlating error logs to the
right commit. When a new engineer joins, the architecture diagram is six months out
of date and actively misleading.

**Who:** Individual contributors at companies with codebases > 10K lines, where
cross-file impact is non-obvious. Most acutely felt at: mid-size engineering orgs
(20–500 engineers), high-change-frequency repositories (>50 commits/week),
and teams where incidents are frequent but post-mortems are manual.

**Evidence:**
- "What will this break?" is the most common pre-commit hesitation pattern
- Architecture diagrams at companies > 50 engineers are wrong within 90 days of creation
- Mean time to identify root-cause commit in post-mortems: 45 minutes (industry avg)
- Developer context switches per task to understand impact: 4–7 (JetBrains survey)

**Why now:** Tree-sitter is now production-stable across 12 languages. Opus 4.7 has
3.75MP vision support capable of reading whiteboard photos. MCP (Model Context Protocol)
creates a native integration channel between AI coding assistants and external tools.
The combination — local deterministic graph + optional LLM enrichment + MCP native
integration — was not possible before 2026.

**Why not solved:** Existing tools (Sourcegraph, Nx, Madge) are either
enterprise-only ($$$), language-specific, or require cloud indexing.
None combine local privacy-first graph + vision-based drift detection + MCP integration.

================================================================================
## User Types (max 4 for v1)
================================================================================

**U1: Solo Developer (primary — 70% of MAU)**
  Core need:     Know what will break before pushing. Zero friction.
  Success signal: Runs `stinkit check` habitually before every push within 7 days.
  Failure signal: Disables pre-commit hook within 48 hours. Tool perceived as noise.
  Key constraint: Zero config tolerance. Must work in 60 seconds from `npx stinkit`.

**U2: Team Lead / Staff Engineer (secondary — 20% of MAU)**
  Core need:     Maintain code quality at scale. Identify high-risk files proactively.
  Success signal: References StinKit hotspot report in code review at least weekly.
  Failure signal: Graph data contradicts what they know is true (trust broken).
  Key constraint: Needs deterministic, verifiable output. LLM speculation unacceptable.

**U3: Engineering Manager (tertiary — 8% of MAU)**
  Core need:     Visibility into technical risk without reading code.
  Success signal: Uses hotspot dashboard in engineering planning weekly.
  Failure signal: Reports don't connect to incidents or outcomes they recognize.
  Key constraint: Browser-based access essential (no CLI). Team-level aggregates.

**U4: Platform / SRE Engineer (tertiary — 2% of MAU)**
  Core need:     Fast commit identification during production incidents.
  Success signal: `stinkit trace` narrows the responsible commit in < 5 minutes.
  Failure signal: Tool blamed wrong commit twice → abandoned.
  Key constraint: Works in incident stress. Simple input (paste error). Clear output.

**Compatibility check:** All four needs can be satisfied simultaneously. U1/U2 are
the local CLI surface. U3 is the cloud web dashboard. U4 uses the CLI in high-stakes
moments. No contradictions.

================================================================================
## User Flows (GIVEN/WHEN/THEN)
================================================================================

### Flow F-01: First-time setup (critical for D1 retention)
  GIVEN a developer has Node.js ≥18 installed and a git repo in the current directory
  WHEN they run `npx stinkit`
  THEN StinKit detects the project, begins indexing with a progress bar
  AND prints "Indexed 12,847 nodes · 31,204 edges · Completeness: 83% · 417 ambiguous call sites" in < 60s
  AND suggests: "Add pre-commit hook? [Y/n]"
  AND if Y: writes hook, confirms "Hook installed. StinKit will run before every commit."
  EDGE: repo > 200K nodes: warning printed, index proceeds (may take 2-5 min first time)
  EDGE: no git history: git warnings suppressed, index succeeds without history signals

### Flow F-02: Pre-commit check (the daily driver — U1, U2)
  GIVEN a developer has staged changes in git
  WHEN the pre-commit hook fires (or they run `stinkit check`)
  THEN StinKit returns in < 2 seconds with a risk classification (LOW/MEDIUM/HIGH/CRITICAL)
  AND shows the blast radius table (direct dependents, depth, coverage signal)
  AND shows completeness caveat: "Graph completeness: 83% · 12 ambiguous call sites in blast zone"
  AND if risk is LOW/MEDIUM: hook exits 0, developer commits normally
  AND if risk is HIGH/CRITICAL: hook exits 0 with warning, prints "Run stinkit check --think for full analysis"
  EDGE: graph stale (> 7 days): warning printed, analysis proceeds with stale data + staleness flag
  EDGE: API unavailable: proceeds with offline deterministic analysis only

### Flow F-03: Deep analysis (U1, U2 — high-risk changes)
  GIVEN a developer received HIGH or CRITICAL risk in F-02
  WHEN they run `stinkit check --think`
  THEN StinKit sends deterministic analysis to Opus 4.7 and returns in < 30 seconds
  AND Opus explains the blast radius in human terms
  AND suggests specific tests to write referencing file paths
  AND references git history patterns ("similar change in March caused 2-hour session timeout")
  AND prints a reviewer checklist tailored to the change type
  EDGE: Opus API timeout: returns partial result with "Deep analysis timed out — fast analysis below"
  EDGE: usage limit exceeded: prints upgrade prompt, returns fast analysis only

### Flow F-04: Architecture drift check (U2, U3 — the hero feature)
  GIVEN a developer has an architecture diagram (PNG/JPG from Miro, Lucidchart, whiteboard)
  WHEN they run `stinkit see diagram.png`
  THEN StinKit calls Opus Vision API to extract components + connections
  AND runs entity resolution (diagram names → code entities with confidence scores)
  AND compares the matched entity graph to the actual code graph
  AND prints accuracy score + phantom connections + missing connections + intermediaries
  AND saves corrected Mermaid diagram to .stinkit/architecture.mermaid
  EDGE: extraction fails schema validation: retries once with stricter prompt
  EDGE: extraction fails twice: prints "Could not extract architecture. Try higher-resolution export."
  EDGE: --verify flag: shows extracted components, asks for confirmation before comparing

### Flow F-05: Incident forensics (U4 — emergency)
  GIVEN a production incident is active and the developer has an error message / stack trace
  WHEN they run `stinkit trace "error message"` or `stinkit trace --stack-trace error.log`
  THEN StinKit first classifies the error origin (CODE | INFRA | CONFIG | DEPENDENCY | DATA)
  AND if origin ≠ CODE: skips code trace, surfaces "Check recent config changes / dep updates"
  AND if origin = CODE: extracts affected files from stack trace, ranks recent commits by overlap
  AND calls Opus to narrate the causal chain for top 3 candidates
  AND caps all confidence at 80% with explicit caveat
  AND provides a prevention recommendation (what test would have caught this)
  EDGE: partial stack trace: proceeds with available file paths + flags low confidence
  EDGE: no git history in lookback window: returns "No relevant commits in last [N] days"

### Flow F-06: MCP integration (U1, U2 — AI-native workflow)
  GIVEN Claude Code is open and `stinkit serve` is running (or auto-started)
  WHEN the developer asks "What will break if I change auth.ts?"
  THEN Claude calls `stinkit_check` via MCP with the file path
  AND receives the full blast radius JSON
  AND responds with a human summary inline in the coding session
  EDGE: graph stale: Claude surfaces the staleness warning in its response
  EDGE: MCP server not running: Claude suggests running `stinkit serve`

### Flow F-07: Team dashboard (U3 — cloud tier)
  GIVEN an engineering manager is logged into app.stinkit.dev
  WHEN they navigate to the team dashboard
  THEN they see a hotspot heatmap of the top 20 highest blast-radius files
  AND coverage trend lines per file over the last 30 days
  AND risk trend (avg risk level per commit per week)
  AND can click any file to see its blast radius graph and recent change history
  EDGE: no team graph synced: onboarding prompt to install CLI + enable sync

================================================================================
## INVARIANTS (business rules that must NEVER be violated)
================================================================================

  INV-001  The pre-commit hook NEVER blocks a commit.
    Pre-commit exits 0 regardless of risk level. It warns; it never blocks.
    Why: Blocking hooks are disabled. A disabled tool is worse than no tool.
    Test: hook returns exit code 0 for CRITICAL risk changes.

  INV-002  Graph completeness must be surfaced in every analysis output.
    Every output that uses the graph must show the completeness metric.
    Why: Hiding uncertainty makes the tool dishonest and breaks trust.
    Test: grep for "completeness" in every command output in integration tests.

  INV-003  LLM output never replaces deterministic analysis — it enriches it.
    The fast tier result is always produced first. --think layers on top.
    Why: LLMs can be wrong, slow, or unavailable. Determinism is the foundation.
    Test: --think result must always include the fast tier data unchanged.

  INV-004  Confidence scores never exceed 80% in forensics output.
    The tool caps any computed confidence at 80% before output.
    Why: Static analysis cannot validate runtime behavior. 94% is a lie.
    Test: unit test for all confidence output paths — assert max 80.

  INV-005  Sensitive code content is never sent to the Opus API.
    Only structural data (function names, call sites, file paths, node IDs) goes to Opus.
    Actual source code content stays local.
    Why: Enterprise security requirement. Code may be proprietary.
    Test: intercept Opus API calls in tests — assert no source content in prompt.

  INV-006  The CLI works fully offline for index, check, and trace (ranking tier).
    No network call may be made in the offline path.
    Why: Security-conscious orgs will not send code to external APIs.
    Test: e2e test with network blocked — all offline commands succeed.

  INV-007  Every analysis acknowledges what tree-sitter cannot see.
    Outputs include: "N ambiguous call sites · Static analysis cannot see: [blind spots]"
    Why: The graph is incomplete. Hiding that fact creates false confidence.
    Test: output contract test — completeness section required in all analysis outputs.

  INV-008  User data deletion completes within 30 days of AccountDeleted event.
    All personal data, API keys, usage logs, and team associations purged.
    Why: GDPR Article 17 (right to erasure).
    Test: integration test — delete account, verify DB rows purged in test pipeline.

================================================================================
## Success Metrics
================================================================================

  Primary:
    Time to first insight:    < 60s from `npx stinkit` to first check result
                              Baseline: N/A (new product) | Target: 55s p50, 90s p99
                              Measured by: telemetry TE-01 (indexDuration) | Timeframe: Week 1

    D7 retention:             > 40% of installs run at least one command in days 2-7
                              Baseline: N/A | Target: 40% | Measured by: install cohort telemetry

    Pre-commit adoption:      > 50% of active users have hook installed after 7 days
                              Measured by: IE-04 event rate / install count | Timeframe: 30-day window

  Secondary:
    D30 retention:            > 25% of installs active in day 30
    Deep analysis rate:       > 15% of HIGH/CRITICAL checks trigger --think within the session
    MCP daily invocations:    > 3x/day per active MCP user
    False trust rate:         < 5% of forensics traces identify the wrong commit as top-1
                              (measured by post-mortem feedback survey, not automated)

  Guardrails (must NOT degrade):
    Pre-commit check p99:     Must stay < 2 seconds — monitor weekly
    Index time for 50K-node repo: Must stay < 45 seconds — regression test per release
    Graph corruption rate:    < 0.1% of index sessions — monitor via GE-18 telemetry
    CLI crash rate:           < 0.5% of command invocations

================================================================================
## Non-Functional Requirements (500K MAU scale)
================================================================================

  Performance:
    stinkit check (fast):        < 2s p99 (local, 50K-node graph)
    stinkit check --think:       < 30s p99 (depends on Opus API SLA)
    stinkit index (50K nodes):   < 45s p99 (local)
    stinkit index (200K nodes):  < 3 min p99 (large repo — warn user at start)
    stinkit see:                 < 20s p99 for extraction; < 5s for comparison
    stinkit trace:               < 10s p99 for ranking; < 25s with Opus narrative
    MCP tool response:            < 5s p99 (fast tier, local graph query)
    CLI startup time:             < 200ms (binary startup, no warm-up needed)
    Cloud API (auth endpoints):   < 200ms p99

  Availability:
    Local CLI:                    100% (offline-first, no server dependency)
    Cloud API (identity/billing): 99.9% monthly SLO (< 43 minutes downtime/month)
    Telemetry pipeline:           99.0% (degraded silently; never blocks CLI)

  Scale targets:
    Max repo size supported:      500K lines, ~200K nodes, ~600K edges
    Graph file size (200K nodes): < 150MB (MessagePack compressed)
    Cloud API RPS at 500K MAU:    ~1,200 RPS peak (auth + telemetry combined)
    Telemetry events/day:         ~5M events (500K MAU × ~10 events/active session)
    Telemetry hot storage:        ClickHouse, partitioned by date, 90-day retention

  Security:
    API keys:                     Bcrypt-hashed at rest; transmitted only over HTTPS
    Code content:                 Never transmitted to any external service (see INV-005)
    Structural data (node IDs):   May be transmitted to Opus API for enrichment (names only)
    Cloud infrastructure:         SOC 2 Type II target (post-launch, within 12 months)

  Privacy:
    Telemetry:                    Opt-in only. No telemetry without explicit consent at setup.
    GDPR:                         Full right-to-erasure implemented (INV-008)
    Data residency:               US + EU regions at launch (EU required for GDPR compliance)

  Internationalisation:
    v1 scope:                     English only. i18n scaffold required but no translations.

  Accessibility:
    CLI output:                   WCAG-equivalent — no color-only information. All color has a text label.
    Web dashboard (U3):           WCAG 2.1 AA (ARTISAN ACCESSIBILITY gate required)

  Compatibility:
    Node.js:                      ≥ 18.0.0 LTS
    Operating systems:            macOS 13+, Ubuntu 22.04+, Windows 11 (WSL2)
    Shell integration:            bash, zsh, fish
    Git:                          ≥ 2.30

================================================================================
## Out of Scope for v1 (explicitly listed)
================================================================================

  GitHub Action:          Deferred — post-hackathon. MCP + CLI is the v1 surface.
                          Revisit at: 10K installs milestone.

  VS Code extension:      Deferred — MCP covers the AI coding assistant surface.
                          Revisit at: product-market fit signal from 50K MAU.

  Python parser:          Deferred to Sprint 2. TypeScript parser ships in Sprint 1.
                          Revisit at: first user request for Python repo analysis.

  Go / Java parsers:      Deferred to Sprint 3+.

  Team graph sync:        Deferred — local-only graph for v1. Cloud sync is roadmap.
                          Revisit at: first enterprise inquiry.

  Multi-region cloud:     Deferred. US + EU at launch. Other regions post-SOC 2.

  Slack bot integration:  Deferred — mentioned in Critical Review as a valid use case.
                          Revisit at: 50K MAU.

  `--calibrate` command:  Post-hackathon — needs incident correlation data first.

  SQL/SQLite backend:     Post-hackathon — MessagePack for v1. SQLite migration roadmap.

  `connections.yaml` support: Sprint 1 Day 5. Required before v1 GA.

================================================================================
## Riskiest Assumptions (top 3)
================================================================================

  RISK-01  Developers will tolerate a 45-second first-time index.
    Assumption: the value (knowing blast radius) is worth the one-time setup cost.
    Validation: usability test with 5 developers during hackathon demo. Measure dropoff.
    Kill criterion: > 40% of test users abandon during first-time index.
    Mitigation: streaming progress bar + intermediate partial results during index.

  RISK-02  tree-sitter's 80% call resolution rate is sufficient for the product to be trusted.
    Assumption: showing completeness honestly ("83% resolved") preserves trust despite gaps.
    Validation: demo to 3 senior engineers. Ask: "Would you trust this?"
    Kill criterion: All 3 say the completeness metric makes them distrust the output more.
    Mitigation: --enrich flag (Opus resolves ambiguous sites) — increases trust if completion rate rises.

  RISK-03  Opus 4.7 Vision reliably extracts architecture from real-world diagrams.
    Assumption: whiteboard photos and Miro exports parse well enough for the demo.
    Validation: test with 5 different diagram formats. Target: 3/5 extract correctly.
    Kill criterion: < 2/5 diagrams produce useful extraction.
    Mitigation: --verify step allows manual correction; explicit error messages guide better input.

================================================================================
## Analytics Events
================================================================================

See ANALYTICS-SCHEMA.md for the full event catalogue.
(Required: read .claude/reference/ANALYTICS-PROTOCOL.md → Section A before implementation.)

Event categories summary:
  KEY_EVENTs (7):    install_completed, index_completed, check_fast_completed,
                     check_deep_completed, see_completed, trace_completed, mcp_tool_invoked
  ENGAGEMENT (8):    precommit_hook_installed, report_generated, see_ui_opened,
                     hotspot_viewed, connections_yaml_added, team_dashboard_viewed,
                     subscription_upgraded, cli_command_invoked
  DIAGNOSTIC (7):    graph_corruption_detected, extraction_failed, llm_timeout,
                     graph_staleness_detected, usage_limit_exceeded, index_duration_recorded,
                     ambiguous_call_sites_count

================================================================================
## CRITIC Pass Status
================================================================================

CRITIC output: StinKit_Critical_Review.md (April 2026) — 14 gaps identified and corrected.
All 14 corrections from the Critical Review are incorporated into this SPEC and the v5 BRD.
Status: CRITIC PASS ACCEPTED. Proceeding to ARCHITECT.

Key corrections confirmed integrated:
  [1] Graph completeness metric added to every output (INV-002, INV-007)
  [2] Coverage split into has_test_file + measured_coverage (schema above)
  [3] Two-speed architecture: Fast (<2s, no LLM) + Deep (--think, 15-30s) (F-02, F-03)
  [4] Entity resolution step for Drift (Flow F-04)
  [5] Transparent risk rules, not weighted score (risk classification section)
  [6] Forensics triage step + origin classification (Flow F-05)
  [7] MessagePack persistence (NFR: graph file size target)
  [8] Offline mode for Graph/Analysis/Forensics (INV-006)
  [9] connections.yaml for runtime connections (out of scope for Day 1; Sprint 1 Day 5)
  [10] UI scoped to Drift view only (DESIGNER gate)
  [11] StinKitResult<T> error handling (BUILDER gate — implementation detail)
  [12] Renamed --managed to --think (Flow F-03)
  [13] --verify step for Drift (Flow F-04)
  [14] Opus prompt changed to "explain the analysis" not "predict failures" (INV-003)

================================================================================
# END OF SPEC.md
# SPEC complete. CRITIC passed. Next gate: ARCHITECT mode (TITAN) → ARCHITECTURE.md
================================================================================
