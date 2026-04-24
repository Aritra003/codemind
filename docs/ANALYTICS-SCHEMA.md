# ANALYTICS-SCHEMA.md — CodeMind Event Catalogue
# Mode: SPEC (ORACLE) | Protocol: .claude/reference/ANALYTICS-PROTOCOL.md → Section A
# Last updated: 2026-04-23
# Owner: ORACLE — no analytics event may be implemented without an entry here.
# SENTINEL review required for any event with PII risk: HIGH.
================================================================================

## Event Naming Convention
  snake_case. Format: [noun]_[verb_past_tense]
  No PII in event names. Noun = domain concept. Verb = what happened.

================================================================================
## KEY EVENTS (7) — conversion, activation, retention signal
================================================================================

  K-01  install_completed
    Category:   KEY_EVENT
    Trigger:    First successful `npx codemind` or `npm install -g codemind` — index completes
    Properties: { node_version: string, os_platform: string, index_node_count: number,
                  index_duration_ms: number, completeness_pct: number,
                  git_history_available: boolean, coverage_files_found: boolean }
    PII risk:   none
    Notes:      One-time per install. Install ID = random UUID stored in ~/.codemind/id.

  K-02  index_completed
    Category:   KEY_EVENT
    Trigger:    `codemind index` completes successfully (including re-indexes)
    Properties: { node_count: number, edge_count: number, languages: string[],
                  static_resolution_rate: number, ambiguous_call_sites: number,
                  duration_ms: number, is_incremental: boolean, repo_size_kb: number }
    PII risk:   none
    Notes:      File paths are NOT sent. Only counts and percentages.

  K-03  check_fast_completed
    Category:   KEY_EVENT
    Trigger:    `codemind check` (fast tier) returns result
    Properties: { risk_level: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', direct_dependents: number,
                  transitive_dependents: number, coverage_gaps: number,
                  has_incident_history: boolean, duration_ms: number,
                  triggered_by: 'precommit'|'cli'|'mcp' }
    PII risk:   none
    Notes:      changed_files count only, never file names.

  K-04  check_deep_completed
    Category:   KEY_EVENT
    Trigger:    `codemind check --think` returns result (Opus call completed)
    Properties: { base_risk_level: string, opus_tokens_used: number,
                  opus_latency_ms: number, duration_ms: number }
    PII risk:   none

  K-05  see_completed
    Category:   KEY_EVENT
    Trigger:    `codemind see` full pipeline completes (comparison + output written)
    Properties: { accuracy_pct: number, phantom_count: number, missing_count: number,
                  intermediary_count: number, entity_mapping_confidence_avg: number,
                  extraction_retries: number, duration_ms: number }
    PII risk:   none

  K-06  trace_completed
    Category:   KEY_EVENT
    Trigger:    `codemind trace` returns result
    Properties: { origin_classification: string, code_trace_ran: boolean,
                  commits_ranked: number, opus_narrative_generated: boolean,
                  duration_ms: number, lookback_days: number }
    PII risk:   none

  K-07  mcp_tool_invoked
    Category:   KEY_EVENT
    Trigger:    Any codemind_* MCP tool called from Claude Code
    Properties: { tool_name: 'codemind_check'|'codemind_see'|'codemind_trace'|
                             'codemind_graph'|'codemind_status',
                  response_status: 'success'|'partial'|'failed',
                  duration_ms: number }
    PII risk:   none

================================================================================
## ENGAGEMENT EVENTS (8) — feature adoption and depth signal
================================================================================

  E-01  precommit_hook_installed
    Category:   ENGAGEMENT
    Trigger:    User accepts hook install prompt or runs --install-hook
    Properties: { shell: 'bash'|'zsh'|'fish'|'other' }
    PII risk:   none

  E-02  report_generated
    Category:   ENGAGEMENT
    Trigger:    `codemind check --report` or `codemind trace --report` produces HTML
    Properties: { command: 'check'|'trace', file_size_kb: number }
    PII risk:   none

  E-03  see_ui_opened
    Category:   ENGAGEMENT
    Trigger:    `codemind see --ui` opens the browser side-by-side view
    Properties: { accuracy_pct: number }
    PII risk:   none

  E-04  hotspot_viewed
    Category:   ENGAGEMENT
    Trigger:    `codemind graph --hotspots` output rendered
    Properties: { top_node_blast_radius: number, top_20_nodes_with_no_coverage: number }
    PII risk:   none

  E-05  connections_yaml_added
    Category:   ENGAGEMENT
    Trigger:    New entry added to .codemind/connections.yaml
    Properties: { via_type: 'EventBus'|'RabbitMQ'|'Kafka'|'DI'|'other',
                  total_declared_connections: number }
    PII risk:   none

  E-06  team_dashboard_viewed  [Cloud tier — deferred to post-v1]
    Category:   ENGAGEMENT
    Trigger:    User views team dashboard on app.codemind.dev
    Properties: { team_size: number, active_repos: number }
    PII risk:   none

  E-07  subscription_upgraded  [Cloud tier]
    Category:   ENGAGEMENT
    Trigger:    User upgrades from free to pro/team/enterprise
    Properties: { from_tier: string, to_tier: string }
    PII risk:   none

  E-08  cli_command_invoked
    Category:   ENGAGEMENT
    Trigger:    Any CLI command runs (superset event — for command-level usage breakdown)
    Properties: { command: 'index'|'check'|'see'|'trace'|'graph'|'serve',
                  flags: string[], duration_ms: number, exit_code: number }
    PII risk:   none
    Notes:      Sampled at 50% to reduce volume. Flags whitelist (never log flag values).

================================================================================
## DIAGNOSTIC EVENTS (7) — health, reliability, error monitoring
================================================================================

  D-01  graph_corruption_detected
    Category:   DIAGNOSTIC
    Trigger:    GE-18 fires — msgpack load failed
    Properties: { error_type: string, graph_age_hours: number }
    PII risk:   none

  D-02  extraction_failed
    Category:   DIAGNOSTIC
    Trigger:    VE-06 fires — 2 retries exhausted on diagram extraction
    Properties: { retry_count: number, error_type: 'schema_validation'|'api_error'|'timeout' }
    PII risk:   none

  D-03  llm_timeout
    Category:   DIAGNOSTIC
    Trigger:    Opus API call exceeds 30s timeout
    Properties: { command: string, model: string, timeout_ms: number }
    PII risk:   none

  D-04  graph_staleness_detected
    Category:   DIAGNOSTIC
    Trigger:    GE-16 fires — graph older than 7 days
    Properties: { age_days: number, node_count: number }
    PII risk:   none

  D-05  usage_limit_exceeded
    Category:   DIAGNOSTIC
    Trigger:    BE-06 fires — user hits monthly deep analysis limit
    Properties: { tier: string, calls_used: number, calls_limit: number }
    PII risk:   none

  D-06  index_duration_recorded
    Category:   DIAGNOSTIC
    Trigger:    Every index_completed event (overlapping — D-06 has richer perf data)
    Properties: { parse_duration_ms: number, graph_build_duration_ms: number,
                  git_history_duration_ms: number, persist_duration_ms: number,
                  node_count: number, error_file_count: number }
    PII risk:   none

  D-07  ambiguous_call_sites_count
    Category:   DIAGNOSTIC
    Trigger:    index_completed — summary of resolution gaps
    Properties: { total_call_sites: number, static_resolved: number,
                  llm_inferred: number, declared: number, ambiguous: number,
                  blind_spots_detected: string[] }
    PII risk:   none
    Notes:      blind_spots_detected values from controlled vocabulary only
                (e.g., "event_emitter", "dependency_injection") — never file paths.

================================================================================
## PII CLASSIFICATION SUMMARY
================================================================================

  PII risk HIGH:  None in this schema. No user-identifying data in any event.
  PII risk LOW:   None. All user identity signals are install_id (random UUID) only.
  PII risk NONE:  All 22 events.

  SENTINEL review: Not required for this schema. No HIGH-risk events.
  If any future event requires email, file path, user name, or IP: SENTINEL review mandatory.

================================================================================
## IMPLEMENTATION NOTES
================================================================================

  Opt-in:         Telemetry is opt-in. Prompt at first run:
                  "Help improve CodeMind? Send anonymous usage data. [Y/n]"
                  If N: no events emitted. TelemetryClient.emit() is a no-op.
                  Setting stored in ~/.codemind/config.yaml → telemetry: false

  Batching:       Events batched locally and flushed every 60 seconds or on CLI exit.
                  Batch size: max 50 events. Never block CLI path.

  Endpoint:       POST https://telemetry.codemind.dev/v1/events
                  Auth: install_id (UUID, no personal identity)
                  Payload: { install_id, events: TelemetryEvent[], client_version }

  Sampling:       cli_command_invoked (E-08): 50% sample rate to manage volume.
                  All other events: 100%.

================================================================================
# END OF ANALYTICS-SCHEMA.md
================================================================================
