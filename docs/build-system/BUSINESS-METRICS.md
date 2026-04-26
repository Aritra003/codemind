# BUSINESS-METRICS.md — StinKit Business Intelligence Register
# Mode: BUSINESS-METRICS | Agent: ANALYST
# Input: ANALYTICS-SCHEMA.md · SLO.md · OBSERVABILITY.md · INFRASTRUCTURE.md
# Last updated: 2026-04-23
# Analytics stack: Self-hosted telemetry (ClickHouse) · Grafana · Stripe webhooks
# Rule: Every feature must have primary metric + guardrail metrics + rollback trigger defined here.
================================================================================

## Measurement Philosophy

1. The north star question is "Are more developers getting value from StinKit every week?"
   Everything else is diagnostic.
2. Track leading indicators (hours signal) to catch problems before they become lagging problems (weeks signal).
3. CLI telemetry is opt-in and anonymous. Cloud metrics come from authenticated usage.
   Both matter. Never conflate opt-in CLI data with total usage — it understates.
4. MRR is a lagging indicator of product quality. D7 retention is the leading indicator of MRR.
5. A feature that improves activation but destroys D7 retention is a failure. Ship carefully.
6. Business metrics inform ORACLE (product decisions), not BUILDER (implementation).
   ANALYST surfaces findings and routes them. ANALYST does not change spec unilaterally.

================================================================================
## North Star Metrics
================================================================================

### Primary North Star: Weekly Active Installs (WAI)
Definition:   Unique install_ids with ≥1 KEY_EVENT (K-01 through K-07) in a rolling 7-day window.
Source:       ClickHouse — SELECT count(DISTINCT install_id) FROM telemetry.events
              WHERE event_name IN ('check_fast_completed','check_deep_completed','see_completed',
              'trace_completed','mcp_tool_invoked') AND timestamp > now() - INTERVAL 7 DAY
Why this:     Checks are the recurring value action. An install that ran a check this week
              is getting value. WAI tracks true engagement, not vanity install counts.
Target:       MAU × 0.40 = WAI (40% of monthly installs active in any given 7-day window).
              At 500K MAU: WAI target = 200K.

### Secondary North Star: Monthly Active Teams (Cloud tier)
Definition:   Teams with ≥2 members each running ≥1 check in the past 28 days.
Source:       Cloud DB — team_members JOIN telemetry analytics.
Target:       Year 1: 500 active teams. Year 2: 5,000 active teams.
Why secondary: Cloud monetisation depends on team adoption. This lags CLI adoption by 3–6 months.

================================================================================
## Conversion Funnel
================================================================================

### Funnel: Discovery → Sustained Use

```
Step 1: npm downloads          → baseline (external signal — npmjs.com stats, not telemetry)
Step 2: install_completed      → conversion rate target: > 80% of downloads complete indexing
Step 3: check_fast_completed   → within 24h of install — ACTIVATION (target: > 60% of installs)
Step 4: precommit_hook_installed → within 7 days of activation (target: > 50% of activated)
Step 5: cloud_account_created  → within 30 days (target: > 10% of pre-commit adopters)
Step 6: subscription_upgraded  → within 14 days of cloud signup (target: > 8% of free cloud users)
Step 7: D30 retained (cloud)   → active in D28–D30 window (target: > 60% of paid users)
```

### Funnel Health Queries (ClickHouse, all opt-in installs)

```sql
-- Step 2→3 Activation rate (24-hour window)
SELECT
  countIf(activated) / count() AS activation_rate
FROM (
  SELECT
    install_id,
    min(timestamp) AS install_ts,
    countIf(event_name = 'check_fast_completed'
            AND timestamp < install_ts + INTERVAL 24 HOUR) > 0 AS activated
  FROM telemetry.events
  WHERE event_name IN ('install_completed', 'check_fast_completed')
    AND timestamp > now() - INTERVAL 30 DAY
  GROUP BY install_id
)

-- Step 3→4 Hook adoption (7-day window after first check)
SELECT
  countIf(hook_installed) / countIf(activated) AS hook_adoption_rate
FROM (
  SELECT
    install_id,
    minIf(timestamp, event_name = 'check_fast_completed') AS first_check_ts,
    countIf(event_name = 'check_fast_completed') > 0 AS activated,
    countIf(event_name = 'precommit_hook_installed'
            AND timestamp < first_check_ts + INTERVAL 7 DAY) > 0 AS hook_installed
  FROM telemetry.events
  WHERE timestamp > now() - INTERVAL 37 DAY
  GROUP BY install_id
)
```

================================================================================
## Leading Indicators (alert within hours of regression)
================================================================================

These change quickly. A drop here means something just broke or shipped badly.

### LI-01: Install Activation Rate
Metric:     % of install_completed install_ids that fire check_fast_completed within 24h.
Baseline:   Set at first 30 days live. Target > 60%.
Query:      ClickHouse funnel query above (Step 2→3).
Alert:      Drop > 10 percentage points day-over-day → P1 → DOCTOR DEBUG mode.
            Root cause candidates: broken install flow, index failure spike (D-01), startup time regression (SLO-S05).
Dashboard:  Grafana "Activation" panel, rolling 7-day average.

### LI-02: Pre-Commit Hook Adoption Rate
Metric:     % of activated install_ids (≥1 check) that fire precommit_hook_installed within 7 days.
Baseline:   Set at first 30 days live. Target > 50% (SPEC success metric).
Alert:      Drop > 5 percentage points in rolling 7-day window → P2 → Slack #product.
            Root cause: hook install UX broke, or check quality regressed (users losing trust).
Dashboard:  Grafana "Funnel" panel.

### LI-03: Time-to-Value (T2V)
Metric:     Median time from install_completed to check_fast_completed (first value moment).
Baseline:   Set at first 30 days live. Target < 60s (SPEC success metric F-01).
Query:      SELECT median(time_diff_ms) FROM ... (first K-01 to first K-03 per install_id).
Alert:      Median T2V > 120s for 3 consecutive days → P2 → GAUGE PERF mode.
Dashboard:  Grafana "T2V" panel, p50 and p90 lines.

### LI-04: Daily New Installs
Metric:     count(DISTINCT install_id) WHERE event_name = 'install_completed' AND day = today().
Baseline:   Set at first 30 days live. Organic growth expected (no paid acquisition v1).
Alert:      Drop > 30% day-over-day without a known cause → P2 → check npm download stats,
            check docs/landing page availability, check CLI install error rate.
Dashboard:  Grafana "Growth" panel.

### LI-05: Check Deep (--think) Adoption Rate
Metric:     check_deep_completed events / check_fast_completed events (rolling 7 days).
Baseline:   Target > 15%. Signals premium feature awareness.
Alert:      < 5% for 2 consecutive weeks → P2 → review --think discoverability in CLI output.
Dashboard:  Grafana "Feature Depth" panel.

### LI-06: AI Reliability Rate
Metric:     1 - (D-03 llm_timeout events / (K-04 + K-05 + K-06 events)), rolling 24h.
Baseline:   Target > 98% (< 2% timeout rate).
Alert:      < 95% for > 30 minutes → P1 → check Anthropic API status, trigger SLO-S06/S07 runbook.
Dashboard:  Grafana "AI Health" panel. Also visible on OBSERVABILITY.md on-call Row 4.

================================================================================
## Lagging Indicators (alert within days/weeks of regression)
================================================================================

These reflect cumulative product quality. A drop here means problems that started weeks ago.

### LAG-01: D7 CLI Retention
Metric:     % of install_ids with K-01 (install) 7 days ago that have ≥1 KEY_EVENT today (D4–D7).
Baseline:   Target > 40% (SPEC success metric).
Query:      ClickHouse cohort query — join install cohort D-7 against events D4-D7.
Alert:      Drop > 5 percentage points in a rolling 7-day window → P1 → ORACLE review.
            This is the single most important product health signal.
Dashboard:  Grafana "Retention" panel — D7, D14, D30 cohort curves.

### LAG-02: D30 CLI Retention
Metric:     % of install cohort D-30 with ≥1 KEY_EVENT in D28–D30.
Baseline:   Target > 20%.
Alert:      Drop > 3 percentage points month-over-month → P1 review.
Dashboard:  Grafana "Retention" panel — same panel as LAG-01.

### LAG-03: Monthly Churn Rate (Cloud tier)
Metric:     subscriptions_cancelled_total (month) / subscriptions_active_start_of_month.
Source:     Stripe webhook events → mrr_events_total{type: churn} counter.
Baseline:   Target < 3% monthly (healthy SaaS benchmark for dev tools).
Alert:      > 5% in a calendar week → P2 → Slack #product → founders notified. (From OBSERVABILITY.md)
            > 8% in a month → P1 → ORACLE spec review + customer exit interviews.
Dashboard:  Grafana "MRR Health" panel.

### LAG-04: Net Revenue Retention (NRR) — Cloud tier
Metric:     (MRR start + expansion MRR - contraction MRR - churn MRR) / MRR start × 100.
Source:     mrr_events_total{type: new|expansion|contraction|churn} from billing metrics.
Target:     > 100% NRR (expansion > churn — a healthy SaaS indicator).
Alert:      NRR < 95% for 2 consecutive months → P1 → ORACLE pricing/value review.
Cadence:    Monthly calculation. Grafana "MRR Health" monthly bar chart.

### LAG-05: NPS (Cloud tier — sampled in-app)
Metric:     Net Promoter Score from in-app survey (Pro/Team users, 90-day rotation).
Source:     NPS survey tool (v1: in-app modal → Resend survey → manual aggregation).
Baseline:   Set at first 90 days live. Target > 50 (developer tools benchmark).
Alert:      Drop > 10 points in rolling 30-day window → P2 → review recent NPS verbatims.
Dashboard:  Manual — not in ClickHouse. Grafana annotation on deploy timeline for correlation.

================================================================================
## MRR Tracking + Targets
================================================================================

### MRR Composition Formula
```
MRR = Σ (active_subscriptions × monthly_price)
    = new_MRR + expansion_MRR - contraction_MRR - churned_MRR

New MRR:        mrr_events_total{type: new}       × tier_price
Expansion MRR:  mrr_events_total{type: expansion} × price_delta (upgrade delta)
Contraction MRR: mrr_events_total{type: contraction} × price_delta (downgrade delta, negative)
Churned MRR:    mrr_events_total{type: churn}     × tier_price
```

### Tier Pricing Reference (v1 assumptions — ORACLE to confirm at launch)
```
Free:         $0/month — limited check --think calls (5/month), no team features
Pro:          $15/month/user — 50 check --think calls/month, private repos, history
Team:         $40/month/seat (min 3 seats) — shared dashboards, team graph, admin controls
Enterprise:   $150/month/seat (negotiated) — SSO, audit logs, SLA, dedicated support
```

### MRR Growth Model (500K MAU trajectory)
```
Month  6: 50K MAU  → 2,500 cloud signups → 200 paid users  → MRR ~$3,500
Month 12: 150K MAU → 7,500 signups       → 600 paid users  → MRR ~$11K
Month 18: 300K MAU → 15K signups         → 1,200 paid users → MRR ~$22K
Month 24: 500K MAU → 25K signups         → 2,000 paid users → MRR ~$38K
```
Note: Assumptions — 5% CLI-to-cloud signup, 8% cloud-to-paid. Validate at Month 3 live.

### MRR Alerts
```
Alert: new MRR < $2K/month at Month 6   → P1 → funnel/pricing review with founders
Alert: monthly NRR < 95% (2 months)    → P1 → churn analysis + ORACLE spec review
Alert: churn spike > 5% in a week      → P2 → customer exit survey launch
Alert: expansion MRR < 20% of new MRR  → P2 → feature depth / upsell path review
```

================================================================================
## Feature Adoption Health Metrics
================================================================================

Measured from KEY_EVENT and ENGAGEMENT event counts in ClickHouse.
All rates are % of active installs (WAI) in rolling 28-day window.

| Feature | Event | Adoption Target | Alert if below |
|---|---|---|---|
| check (fast) | K-03 | > 90% of WAI | < 70% → P1 (core feature broken) |
| check --think | K-04 | > 20% of WAI | < 5% → P2 (discoverability) |
| see (diagram drift) | K-05 | > 15% of WAI | < 5% → P2 (vision feature unused) |
| trace (forensics) | K-06 | > 10% of WAI | < 3% → P2 (forensics feature unused) |
| MCP tool | K-07 | > 10% of WAI | < 3% → P2 (MCP discoverability) |
| pre-commit hook | E-01 | > 50% of WAI | < 30% → P2 (hook UX review) |
| HTML report | E-02 | > 5% of WAI | < 1% → P3 (low priority) |
| connections.yaml | E-05 | > 3% of WAI | < 1% → informational only |

### Feature Depth Signal
```
check_deep_completed / check_fast_completed  →  target > 15%  (premium feature awareness)
mcp_tool_invoked / (K-03 + K-04)            →  target > 10%  (AI-native workflow adoption)
see_ui_opened / see_completed               →  target > 30%  (UI vs CLI preference signal)
```

================================================================================
## Product Quality Guardrails (telemetry-derived)
================================================================================

These are non-negotiable. Any feature shipped must not regress these.

| Metric | Source | Target | Alert |
|---|---|---|---|
| Graph corruption rate | D-01 / K-02 | < 0.1% | > 0.5% → P1 → data integrity incident |
| Vision extraction failure rate | D-02 / K-05 | < 10% | > 15% → P1 → Anthropic API or prompt issue |
| AI timeout rate | D-03 / (K-04+K-05+K-06) | < 2% | > 5% → P1 → SLO breach |
| Graph staleness (> 7 days) | D-04 events count | track only | spike = user not re-indexing |
| Ambiguous call sites rate | D-07 (ambiguous/total) | < 30% | > 50% → P2 → tree-sitter gap review |

================================================================================
## Analytics Key Event Baselines (set at D+30 live)
================================================================================

Fill in after first 30 days live. Placeholders below represent the measurement protocol.
A Key Event dropping > 20% day-over-day without a product explanation → P1 analytics incident.

| Event | baseline_daily_avg | alert_threshold | Assigned DOCTOR runbook |
|---|---|---|---|
| install_completed (K-01) | [set at D+30] | -30% DoD | runbooks/analytics-regression.md |
| check_fast_completed (K-03) | [set at D+30] | -20% DoD | runbooks/analytics-regression.md |
| check_deep_completed (K-04) | [set at D+30] | -30% DoD | runbooks/analytics-regression.md |
| see_completed (K-05) | [set at D+30] | -30% DoD | runbooks/analytics-regression.md |
| precommit_hook_installed (E-01) | [set at D+30] | -30% DoD | runbooks/analytics-regression.md |

Protocol: BREAKER runs tagging regression check as part of VERIFY mode on every deploy.
          Any baseline gap triggers DOCTOR DEBUG mode within 4 hours.

================================================================================
## Feature Launch Validation Framework
================================================================================

### Required Pre-Definition (every feature before merge to main)
Every feature shipped must have this block written in its PR description AND
linked from CONTEXT.md DECISIONS THIS SESSION before BUILDER starts implementation.

```
Feature: [name]
Primary metric:     [one measurable thing we're improving — must map to an event in ANALYTICS-SCHEMA.md]
Guardrail metrics:  [what must NOT regress — include D7 retention if any UX change]
Measurement window: [how long before declaring success or failure — minimum 7 days for CLI features]
Success threshold:  [specific number — not "improvement" — e.g., "activation rate > 65%"]
Rollback trigger:   [specific metric threshold that fires rollback — e.g., "D7 retention drops > 3 points"]
```

### Example: Pre-commit hook install prompt redesign
```
Feature: Redesigned hook install UX (interactive prompt during first check)
Primary metric:     E-01 precommit_hook_installed / K-03 check_fast_completed within 7 days
                    Current baseline: [set before shipping]. Target: +10 percentage points.
Guardrail metrics:  - D7 retention must not drop (LAG-01)
                    - T2V must not increase (LI-03)
                    - CLI p99 latency must not increase (SLO-C05)
Measurement window: 14 days post-deploy (at least 2 weekly cohorts)
Success threshold:  Hook adoption rate > 60% (up from estimated 50% baseline)
Rollback trigger:   D7 retention drops > 3 percentage points in rolling 7-day window
```

### Experiment (A/B) Decision Protocol
If feature is A/B tested:
  - Minimum sample: 1,000 unique install_ids per variant.
  - Minimum duration: 7 days (one full weekly cycle).
  - Statistical significance: p < 0.05 before declaring a winner.
  - Guardrail check: run guardrail metrics on both variants before declaring winner.
  - ANALYST documents result in CONTEXT.md DECISIONS THIS SESSION.
  - ORACLE consults result before updating SPEC.md.

================================================================================
## Business Intelligence Dashboard (Grafana — Business Layer)
================================================================================

Separate Grafana dashboard from the on-call operations dashboard (OBSERVABILITY.md).
Access: #product and #eng channels. Not on PagerDuty — no ops paging from business metrics.

```
Row 1 — Acquisition:
  [ Daily new installs (K-01) ]  [ 7-day rolling trend ]  [ Activation rate LI-01 ]

Row 2 — Engagement:
  [ WAI (north star) ]  [ D7 retention LAG-01 ]  [ Pre-commit hook adoption LI-02 ]

Row 3 — Revenue:
  [ MRR (current) ]  [ MRR growth MoM ]  [ Churn rate LAG-03 ]  [ NRR LAG-04 ]

Row 4 — Feature health:
  [ check fast adoption ]  [ check --think rate LI-05 ]  [ see adoption ]  [ trace adoption ]

Row 5 — Quality signals:
  [ AI reliability LI-06 ]  [ graph corruption rate ]  [ vision failure rate ]
```

================================================================================
## Alert Routing (Business Layer)
================================================================================

| Alert | Severity | Channel | Owner |
|---|---|---|---|
| D7 retention drop > 5pts (7-day window) | P1 | Slack #product + email founders | ORACLE |
| Activation rate drop > 10pts (DoD) | P1 | Slack #eng | DOCTOR → DEBUG |
| Key Event regression > 20% DoD | P1 | Slack #eng | DOCTOR → DEBUG |
| Monthly churn > 5% in a week | P2 | Slack #product | Founders |
| MRR new < $2K at Month 6 | P2 | Slack #product | Founders |
| NRR < 95% (2 months) | P1 | Slack #product | Founders + ORACLE |
| AI reliability < 95% (30 min) | P1 | Slack #eng | DOCTOR |
| T2V median > 120s (3 days) | P2 | Slack #eng | GAUGE → PERF |
| Hook adoption < 30% WAI | P2 | Slack #product | ORACLE |
| Feature regression (guardrail breach) | P1 | Slack #eng | Revert + ORACLE |

================================================================================
## Monthly Business Review Checklist (BUSINESS-REVIEW mode)
================================================================================

Run at end of each calendar month. ANALYST produces brief, routes to ORACLE.

[ ] LI-01..LI-06 leading indicators vs baseline — any alert-threshold breach this month?
[ ] LAG-01..LAG-05 lagging indicators — trend direction correct?
[ ] MRR calculation: new + expansion - contraction - churn. NRR computed.
[ ] Funnel conversion rates updated and compared to prior month.
[ ] Feature adoption table updated — any feature with no adoption growth for 60 days?
[ ] Analytics Key Event counts reviewed — any regression > 20% DoD unexplained?
[ ] Churn survey responses reviewed (if any cancellations this month).
[ ] Any active A/B test ready for decision? (7 days + 1K installs per variant minimum.)
[ ] Brief produced and routed to ORACLE — findings summarised in CONTEXT.md DECISIONS THIS SESSION.

================================================================================
## Compliance Note (ANALYST → COUNSEL)
================================================================================

- All ClickHouse analytics data is anonymous (install_id = random UUID, no user identity).
- Cloud billing metrics tie to userId, governed by GDPR-REGISTER.md PA-01.
- NPS survey data (email-based) is a separate data flow — COUNSEL must confirm
  legal basis and retention before implementing in-app NPS. Candidate legal basis: Legitimate Interest.
- Telemetry is opt-in (ANALYTICS-SCHEMA.md). Analytics dashboards must clearly note
  "Based on opt-in telemetry — understates true usage" wherever displayed.

================================================================================
# END OF BUSINESS-METRICS.md
# Gate: BUSINESS-METRICS complete.
# Next gate: ESCALATION-TREE (STEWARD) → ESCALATION-TREE.md
================================================================================
