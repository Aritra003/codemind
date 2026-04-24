# ANALYTICS-PROTOCOL.md — Apex Analytics Engineering Standard
# Location: .claude/reference/ANALYTICS-PROTOCOL.md
# Load: Read(".claude/reference/ANALYTICS-PROTOCOL.md") when any agent works on analytics
# Authors: Ashish Khandelwal, Arup Kolay | Apex Runtime v1.4 | MIT License
================================================================================
# THIS FILE DEFINES: event schema standards, naming conventions, implementation
# patterns, brownfield migration algorithm, consent compliance, and QA protocol.
# It is provider-agnostic. GA4, Amplitude, Mixpanel, PostHog, and Segment all
# implement this standard. Provider-specific tooling (DebugView, BigQuery export,
# GTM tag types) is configuration — not the standard.
================================================================================

## AGENT OWNERSHIP MAP

| Concern | Owner | File written |
|---|---|---|
| Event schema, naming, what to track | ORACLE | ANALYTICS-SCHEMA.md |
| Business metrics, measurement strategy, rollback triggers | ANALYST | BUSINESS-METRICS.md |
| Consent compliance, PII in parameters, GDPR data flows | SENTINEL | GDPR-REGISTER.md |
| Implementation — track.ts, provider.ts, schema validation | BUILDER | lib/analytics/ |
| QA, debug loop, tagging regression, 30-min rule | BREAKER | KNOWLEDGE-BASE.md |
| Provider infrastructure decision (which vendor, cost model) | TITAN | INFRASTRUCTURE.md |

No single agent leads analytics. Authority follows domain.

## WHEN EACH AGENT READS THIS FILE

ORACLE:   Before writing ANALYTICS-SCHEMA.md — use SECTION A for schema design rules.
ANALYST:  Before writing BUSINESS-METRICS.md — use SECTION A (event taxonomy) +
          SECTION F (measurement north star).
SENTINEL: Before any LAUNCH-READY or GDPR-REGISTER.md update — use SECTION D.
BUILDER:  Before implementing lib/analytics/track.ts or lib/analytics/provider.ts
          — use SECTION B. Before any trackEvent() call — use naming rules in SECTION A.
BREAKER:  Before analytics QA or any tagging regression investigation — use SECTION E.
TITAN:    Before INFRA-DESIGN when product has analytics — use SECTION B (provider
          abstraction contract) and SECTION F (data retention requirement).

## PROJECT STATE: THIS PROTOCOL DOES NOT CLASSIFY PROJECTS

Greenfield vs brownfield detection is performed by CLAUDE.md session startup (step 3).
This protocol is invoked AFTER that classification:
  - GREENFIELD detected → apply SECTION A + B + D + E + F
  - BROWNFIELD detected → apply SECTION C + D + E + F (Section A/B for new features only)

================================================================================
## SECTION A — EVENT SCHEMA DESIGN (ORACLE + ANALYST)
================================================================================
# Invoked at: SPEC mode (ORACLE), BUSINESS-METRICS mode (ANALYST)
# Output: ANALYTICS-SCHEMA.md — the project-specific event catalogue

### A1. Measurement North Star (ORACLE applies at SPEC time)

Track only events that trigger a business decision or a metric alert.
If a data point cannot change a decision, it is noise. Do not track it.

Three categories only:
  KEY EVENT:    High-intent action tied to a conversion or retention signal.
                Examples: purchase, trial_started, upgrade_completed.
                Gate: ANALYST must pre-approve every Key Event designation.
                Rule: scroll, generic_click, and page_view are NEVER Key Events.

  ENGAGEMENT:   Mid-funnel action that predicts conversion. Tracked for signal, not KPI.
                Examples: feature_used, calculator_compute, whitepaper_download.

  DIAGNOSTIC:   Technical events for debugging and funnel QA only.
                Examples: form_validation_error, session_timeout, api_retry.
                Rule: Diagnostic events must NOT appear in business dashboards.

### A2. Deterministic Naming Algorithm

Rule: `snake_case` strictly. No spaces, no hyphens, no camelCase, no PascalCase.

Priority logic (apply in order — stop at first match):
  1. Use the analytics provider's recommended event name if one exists.
     Examples: view_item, generate_lead, purchase, sign_up, login.
  2. If no recommended name exists, use `object_action` format.
     Examples: whitepaper_download, plan_upgrade, onboarding_step_complete.
  3. Never invent a third format. If neither rule applies, consult ORACLE.

Forbidden:
  - Reserved prefixes: ga_, firebase_, google_, gtm_, _underscore_leading
  - Abbreviations without a glossary entry in ANALYTICS-SCHEMA.md
  - Numbered suffixes to work around uniqueness: btn_click_1, btn_click_2

### A3. Mandatory Event Parameter Object

Every event dispatched through lib/analytics/track.ts must carry this context.
These fields enable cross-session reconciliation and are validated at build time
by `tsc --noEmit` against the TypeScript interface defined in lib/analytics/track.ts.
BREAKER verifies schema completeness against ANALYTICS-SCHEMA.md during QA mode.

```typescript
interface AnalyticsContext {
  page_location:   string;   // Full URL (web) or Screen Class (mobile/native)
  user_tier:       'anonymous' | 'free' | 'premium' | 'admin';
  session_id:      string;   // Apex UUID — generated by lib/analytics/track.ts
  app_version:     string;   // SemVer string from appConfig — never hardcoded
}
```

Every custom event additionally carries its own typed parameter interface,
defined in ANALYTICS-SCHEMA.md and enforced by TypeScript in track.ts.

### A4. ANALYTICS-SCHEMA.md Structure (ORACLE produces)

One entry per event. Format:

```
EVENT: [event_name]
Category:    [KEY_EVENT | ENGAGEMENT | DIAGNOSTIC]
Trigger:     [exact user action or system condition that fires this event]
Parameters:  [field: type — description] (list all beyond mandatory context)
Owner:       [agent or team responsible for this event]
Approved by: ANALYST — [date] (required for KEY_EVENT; optional for others)
PII risk:    [none | low: describe | HIGH: SENTINEL review required]
```

PII risk HIGH → SENTINEL must review and add to GDPR-REGISTER.md before BUILDER
implements the event. BUILDER cannot ship a HIGH PII-risk event without
SENTINEL sign-off logged in CONTEXT.md.

================================================================================
## SECTION B — IMPLEMENTATION STANDARD (BUILDER)
================================================================================
# Invoked at: SCAFFOLD and BUILDER modes
# Single permitted call site: lib/analytics/track.ts
# Single permitted provider file: lib/analytics/provider.ts

### B1. The Abstraction Contract (TITAN defines at INFRA-DESIGN — BUILDER enforces)

The Apex CODE DISCIPLINE mandates abstraction layers for all external providers.
Analytics is an external provider. The contract:

```
lib/
  analytics/
    track.ts      ← ONLY file that may call provider.ts. All trackEvent() calls
                    in application code import from here. Nothing else.
    provider.ts   ← ONLY file that imports the analytics SDK. Contains the
                    provider-specific implementation (GA4, Amplitude, Segment, etc.)
                    Swapping providers = rewriting provider.ts only. track.ts unchanged.
```

Rule: No application code — no component, service, route, or hook — may import
directly from an analytics SDK. All tracking goes through track.ts.
Violation of this rule is treated as a CODE DISCIPLINE breach, same as
importing a DB client directly into a route.

### B2. track.ts Contract

track.ts must export exactly one public function:

```typescript
export function trackEvent(
  eventName: string,          // Must match a name in ANALYTICS-SCHEMA.md
  parameters: Record<string, unknown>,
  context: AnalyticsContext   // Mandatory — defined in Section A3
): void
```

track.ts responsibilities:
  1. Validate eventName against ANALYTICS-SCHEMA.md event registry at runtime
     (dev/staging only — fail loudly; production — log silently + alert).
  2. Merge AnalyticsContext into the full event payload.
  3. Gate dispatch on consent signal (see Section D).
  4. Call provider.ts dispatch function.
  5. Never throw — analytics must never break application flow. Use try/catch
     with silent error logging to the observability stack.

track.ts must NOT:
  - Import any analytics SDK directly (that is provider.ts's job).
  - Contain business logic.
  - Be called from within lib/analytics/provider.ts (no circular calls).

### B3. provider.ts Contract

provider.ts is the only file that knows which analytics vendor is active.
Configured via environment variable: ANALYTICS_PROVIDER=ga4|amplitude|segment|posthog

```typescript
export function dispatchEvent(
  eventName: string,
  payload: Record<string, unknown>
): void

export function setConsent(
  analyticsStorage: 'granted' | 'denied',
  adUserData:       'granted' | 'denied'
): void

export function setUserId(userId: string | null): void
```

Provider swap = change ANALYTICS_PROVIDER env var + update provider.ts implementation.
track.ts, application code, and ANALYTICS-SCHEMA.md remain unchanged.
Validate-env.ts must include ANALYTICS_PROVIDER as a required var at startup.

### B4. E-Commerce and Transactional Events

Every purchase or transactional event must include:
  transaction_id: string   — Unique per transaction. Duplicate IDs → flag as DRAFT,
                              exclude from Key Event reporting.
  value:          number   — Revenue value. Never zero on a successful purchase.
  currency:       string   — ISO 4217 code (e.g., "USD", "INR", "GBP").
  items:          array    — Provider-standard items array schema.

Idempotency rule (mirrors BUILDER's mutation pattern): the transactional event
must be idempotent. If a purchase event fires twice for the same transaction_id,
provider.ts must deduplicate. This is a business data integrity rule.

### B5. BUILDER Checklist Additions (applied to every file touching analytics)

These extend the standard POST-WRITE CHECKLIST in BUILDER.md:

[ ] trackEvent() is the only analytics call in this file — no SDK imports
[ ] eventName exists in ANALYTICS-SCHEMA.md — no undocumented events
[ ] AnalyticsContext fields are sourced from runtime state — none hardcoded
[ ] app_version sourced from appConfig — never a string literal
[ ] PII check: no email, name, phone, address, or user-identifiable string
    appears in any event parameter value
[ ] Consent gate active: provider.ts setConsent() called before any dispatch
    (verified in lib/analytics/track.ts — not per-call)
[ ] Error in trackEvent() does not propagate to application flow (try/catch confirmed)

================================================================================
## SECTION C — BROWNFIELD MIGRATION ALGORITHM (ANALYST + BUILDER)
================================================================================
# Invoked at: BROWNFIELD INTAKE mode, then as a parallel workstream
# This section replaces ad-hoc legacy tag cleanup.
# It does NOT re-run CLAUDE.md project classification — that already happened.

### C1. Phase 1 — Archaeology (ANALYST leads, runs during BROWNFIELD INTAKE)

Map before touching. Add to INTAKE-REPORT.md:

```bash
# Discover all existing analytics calls
grep -r "gtag\|dataLayer\|analytics\.\|_gaq\|mixpanel\|amplitude\|posthog" \
  src/ --include="*.ts" --include="*.tsx" --include="*.js" -l

# Count total legacy tracking calls
grep -rc "gtag\|dataLayer\.push" src/ | awk -F: '{sum+=$2} END{print sum}'
```

For each legacy event found, record in `MIGRATION-MAP.csv`:

```csv
legacy_event_name, file, line, call_type, ads_dependency, financial_dependency, apex_equivalent
```

`ads_dependency: yes` or `financial_dependency: yes` → classify as LOCKED TAG.
LOCKED TAGS are in DO-NOT-TOUCH zones until Phase 3. BUILDER must not modify them.
Locked Tag criteria mirrors brownfield DO-NOT-TOUCH: if removing breaks Ads
conversion tracking or financial attribution, it is locked.

**Analytics Density Baseline** (parallel to COVERAGE FLOOR in BROWNFIELD.md):
Record in INTAKE-REPORT.md:
  Total legacy events:    [n]
  Apex-compliant events:  [n]   (events already in track.ts / matching naming rules)
  Analytics Density:      [n%]  = Apex-compliant / Total

This is the ANALYTICS DENSITY FLOOR. It must only increase. Never decrease.
Commit `.analytics-density-floor.json` to git alongside `.coverage-floor.json`.

### C2. Phase 2 — Shadow Migration (BUILDER implements, ANALYST validates)

Objective: modernise without breaking historical continuity or causing data amnesia.

Step 1 — Shadow Deployment:
  Deploy Apex-standard events via lib/analytics/track.ts ALONGSIDE legacy calls.
  Do not remove legacy calls yet.
  Prefix new Apex events with `v2_` during this phase only:
    legacy: `purchase` → shadow: `v2_purchase`
    legacy: `button_click` → shadow: `v2_cta_click` (renamed to Apex standard)

Step 2 — Validation Window (minimum 7 days):
  Compare shadow event counts against legacy event counts.
  Validation tool: provider's debug/data export (DebugView for GA4, Inspect for
  Amplitude, etc.) or data warehouse query.
  Validation threshold: delta between legacy and v2_ event counts must be <2%.
  If delta >2% after 7 days: BREAKER investigates — do not proceed to Phase 3.

Step 3 — MIGRATION-MAP.csv update:
  Mark validated events as `APEX-VALIDATED` in MIGRATION-MAP.csv.
  Only APEX-VALIDATED events may proceed to Phase 3.

### C3. Phase 3 — Analytics Density Ratchet (ANALYST enforces)

Mirrors the COVERAGE RATCHET in BROWNFIELD.md. Same discipline, applied to analytics.

**The Rule:** The Analytics Density (Apex-compliant / Total events) must only ever
increase. Decreasing density at any commit → blocked by CI ratchet check.

**The Validation Gate:** A new feature's tracking may not be shipped until 2 legacy
events are fully migrated to Apex standard and the `v2_` prefix is removed.

**CI enforcement:**
```bash
# scripts/analytics-density-check.ts
# Reads .analytics-density-floor.json
# Counts current Apex-compliant vs total events
# Fails build if density < floor
```

Add to Tier 3 verification (fitness-check.sh): `tsx scripts/analytics-density-check.ts`

**Removing the v2_ prefix (sunsetting legacy):**
  Prerequisite: shadow event APEX-VALIDATED + density ratchet check passes.
  Step 1: Remove `v2_` prefix from event name in ANALYTICS-SCHEMA.md.
  Step 2: Update track.ts call.
  Step 3: Remove legacy call.
  Step 4: Verify in provider debug tool — old event name stops firing.
  Step 5: Update MIGRATION-MAP.csv status to `MIGRATED`.
  LOCKED TAGS: do not remove until ANALYST confirms no active Ads or financial
  attribution depends on them. Requires explicit human approval.

================================================================================
## SECTION D — CONSENT + PRIVACY COMPLIANCE (SENTINEL)
================================================================================
# Invoked at: SECURITY mode, LAUNCH-READY, any analytics-related PR touching
# user data or third-party data transmission
# SENTINEL has VETO POWER over any analytics deployment that violates this section.

### D1. Consent Gate Architecture

No analytics event may be dispatched without a valid consent signal.
Consent is not an analytics concern — it is a legal one. SENTINEL owns it.

provider.ts must implement:
  1. `setConsent()` called at page/app load BEFORE any `dispatchEvent()` call.
  2. Default state: `analytics_storage: 'denied'`, `ad_user_data: 'denied'`.
     Modelling Consent Mode v2 — deny by default, grant on positive signal.
  3. On consent granted: call `setConsent('granted', 'granted')` — then
     provider.ts may begin dispatching buffered events.
  4. On consent denied: provider.ts must not dispatch any events. Period.
     No "anonymous" events. No "non-identifiable" workarounds.

Consent signal source: the product's own Consent Management Platform (CMP),
not the analytics provider's built-in consent UI. SENTINEL reviews CMP
integration as part of the GDPR-REGISTER.md update.

### D2. PII Hard Rules

These rules have no exceptions. SENTINEL veto applies to any violation.

NEVER include in any event parameter — at any tier, in any event category:
  - Email addresses (even hashed without explicit legal basis)
  - Full names
  - Phone numbers
  - Physical addresses
  - IP addresses (use provider's IP anonymisation setting instead)
  - User agent strings (use device_category: 'mobile'|'tablet'|'desktop' instead)
  - Any field from a user profile that is RESTRICTED in SPEC.md DATA MODEL

URL sanitisation rule:
  page_location must be the path only — strip query parameters containing
  user-identifiable data before dispatch.
  Example: `/checkout?email=user@example.com` → `/checkout` (strip email param)
  BUILDER must implement URL sanitisation in track.ts, not in each call site.

### D3. GDPR-REGISTER.md Analytics Entry (SENTINEL produces)

When any analytics provider is configured, SENTINEL must add an entry:

```
Processing activity: Analytics event collection
Provider:            [provider name + version]
Data sent:           [list of event types | parameter fields transmitted]
Legal basis:         Legitimate interest (diagnostic) | Consent (personalisation/ads)
Consent mechanism:   [CMP name + version]
Data retention:      [configured retention period — must match D4 below]
User right to object: [opt-out mechanism and URL]
Cross-border transfer: [yes: adequacy decision or SCC reference | no]
SENTINEL review date: [ISO date]
```

### D4. Data Retention

Set provider data retention to the minimum required for the product's
measurement window (defined in ANALYST's BUSINESS-METRICS.md).
Default: 14 months (covers YoY comparison). Never "maximum available" without
documented justification in GDPR-REGISTER.md.
Retention must be set in provider admin configuration before LAUNCH-READY.

================================================================================
## SECTION E — QA, DEBUG LOOP, AND KNOWLEDGE BASE (BREAKER)
================================================================================
# Invoked at: VERIFY mode (analytics files), QA mode, any tagging regression
# BREAKER owns analytics QA. Not SENTINEL.

### E1. Analytics VERIFY Checklist (BREAKER runs on every PR touching analytics)

[ ] All events in the PR have matching entries in ANALYTICS-SCHEMA.md
[ ] No event fires before consent signal is received (trace through track.ts)
[ ] No PII appears in any parameter value (static analysis + runtime spot-check)
[ ] Mandatory AnalyticsContext fields all populated — none null or undefined
[ ] app_version sourced from appConfig — not a hardcoded string
[ ] transaction_id present and unique on all purchase-category events
[ ] Diagnostic events do NOT appear tagged as Key Events in provider config
[ ] Provider debug tool confirms firing order:
    Consent Default → Config/Initialise → First Event
    (any other order = tagging bug — block PR)
[ ] No legacy SDK import found in application code outside lib/analytics/

### E2. The Debug Loop (BREAKER's procedure for tagging bugs)

When a tagging discrepancy is found:

Step 1 — REPRODUCE: confirm the event fires or fails to fire in the provider's
  real-time debug tool (DebugView, Inspect, Live Events — whichever the active
  provider offers). Screenshot required as evidence.

Step 2 — ISOLATE: binary search through the event dispatch chain:
  Application code → trackEvent() → track.ts → provider.ts → SDK → provider
  Identify which layer the failure occurs at.

Step 3 — ROOT CAUSE: apply the 5-Whys. The root cause is never "the tag fired
  wrong" — it is a code path, a consent timing issue, a parameter type error,
  or a provider SDK version change.

Step 4 — FIX: targeted. Do not refactor track.ts during a debugging session.

Step 5 — VERIFY FIX: confirm in provider debug tool. Compare event counts
  against the expected baseline for >1h post-fix.

### E3. The 30-Minute Rule (mandatory KNOWLEDGE-BASE.md entry)

If a tagging bug, attribution drift, or analytics regression takes >30 minutes
to resolve, it is an Engineering Failure — not bad luck.

Action: Record a KNOWLEDGE-BASE.md entry before the session ends.

```
[HIGH] [tagging-trap] [ISO date]
Lesson:  [what was wrong — one sentence]
Pattern: [generalised principle — what class of analytics bugs does this represent]
Trigger: [what symptom should prompt a BUILDER to re-read this entry]
Source:  [PR reference | session date]
```

The `[tagging-trap]` tag is a first-class domain tag in KNOWLEDGE-BASE.md.
BUILDER must scan for `[tagging-trap]` entries before implementing any analytics
file — same discipline as scanning `[hallucination-trap]` entries before
implementing external API calls.

### E4. Regression Detection

Add to ANALYTICS-SCHEMA.md: a snapshot of expected event counts per day
  for each KEY EVENT (measured over the first 30 days post-launch).
  Format: `event_name | baseline_daily_avg | alert_threshold (% drop)`

ANALYST configures provider alerts against these thresholds.
BREAKER verifies alert configuration is live at LAUNCH-READY.

A Key Event count dropping >20% day-over-day without a product explanation
is treated as a P1 analytics incident → DOCTOR investigates via DEBUG mode.

================================================================================
## SECTION F — CROSS-CUTTING STANDARDS (ALL AGENTS, ALL PROJECTS)
================================================================================

### F1. The Non-Negotiable Rules Table

| DO | DO NOT |
|---|---|
| Route all tracking through `lib/analytics/track.ts` | Call analytics SDK directly from components, services, or routes |
| Use snake_case for all event and parameter names | Use camelCase, kebab-case, PascalCase, or spaces |
| Use provider's recommended event names where they exist | Invent names when a recommended name covers the same intent |
| Gate all event dispatch on consent signal in provider.ts | Dispatch any event before consent is received |
| Use server-side analytics gateway for sensitive transactional data | Send PII (email, name, phone) in any event parameter or URL |
| Set 14-month data retention in provider admin | Leave retention at "maximum" without documented justification |
| Mark only high-intent conversions as Key Events | Mark scroll, generic click, or page view as a Key Event |
| Validate shadow `v2_` events before removing legacy calls | Remove legacy tracking before shadow validation passes |
| Add `[tagging-trap]` KB entry for any debug session >30 min | Move on from a tagging failure without recording the root cause |
| Source app_version from appConfig | Hardcode a version string anywhere in analytics code |

### F2. Server-Side Analytics Gateway (for sensitive transactional data)

For events containing financial values, subscription tier changes, or any
data classified CONFIDENTIAL in SPEC.md:
  Use server-side event dispatch (Measurement Protocol, server-side SDKs) rather
  than client-side. This prevents client-side manipulation of revenue figures.
  TITAN defines the server-side gateway pattern in INFRASTRUCTURE.md.
  SENTINEL reviews the server-side integration as part of THREAT-MODEL.md update.

### F3. Provider Infrastructure Decision (TITAN owns at INFRA-DESIGN)

TITAN documents in INFRASTRUCTURE.md:
```
Analytics provider:      [name + version — exact, never "latest"]
Dispatch method:         [client-side | server-side | hybrid]
Data warehouse export:   [yes: destination + sync frequency | no]
Cost per event:          [$x per 1M events — calculated, not guessed]
Monthly budget:          [$x hard cap]
Alert at 80% of budget:  [yes — configured in provider dashboard]
Provider swap path:      [named alternative + estimated migration effort]
Review cadence:          Quarterly
```

Provider swap = rewrite lib/analytics/provider.ts + update INFRASTRUCTURE.md.
track.ts, ANALYTICS-SCHEMA.md, and all application code remain unchanged.
This is the cloud-agnostic contract for analytics.

================================================================================
## LAUNCH-READY GATE — ANALYTICS SIGN-OFF
================================================================================
# All items must PASS before LAUNCH-READY is approved.
# Failures block launch. No "we'll add tracking post-launch."

ORACLE sign-off:
[ ] ANALYTICS-SCHEMA.md complete — every Key Event and Engagement event documented
[ ] All event names comply with naming algorithm (Section A2) — no exceptions
[ ] No undocumented events in application code (BREAKER analytics checklist passes — see BREAKER.md)

ANALYST sign-off:
[ ] BUSINESS-METRICS.md includes analytics provider and event schema reference
[ ] All Key Events approved — none are scroll, click, or page_view
[ ] Regression detection baselines defined (Section E4) for all Key Events
[ ] Provider alerts configured against BUSINESS-METRICS.md alert thresholds
[ ] Data retention set to minimum required period (14 months default — documented if different)

SENTINEL sign-off:
[ ] GDPR-REGISTER.md analytics entry complete (Section D3)
[ ] Consent gate architecture implemented and verified in provider debug tool
[ ] Default consent state is DENY — confirmed in provider real-time debug
[ ] No PII found in any event parameter (BREAKER scan + SENTINEL review)
[ ] Cross-border data transfer documented in GDPR-REGISTER.md (if applicable)

BUILDER sign-off:
[ ] lib/analytics/track.ts implements full Section B2 contract
[ ] lib/analytics/provider.ts implements Section B3 contract
[ ] validate-env.ts includes ANALYTICS_PROVIDER as required var
[ ] No analytics SDK imported outside lib/analytics/provider.ts
[ ] All POST-WRITE checklist additions from Section B5 confirmed across all files
[ ] Transactional events include transaction_id, value, currency (Section B4)

BREAKER sign-off:
[ ] Full Section E1 VERIFY checklist passed
[ ] Provider debug tool confirms correct firing order across all Key Events
[ ] Analytics regression detection alerts verified live (Section E4)
[ ] No open tagging-trap KB entries from this sprint unresolved

BROWNFIELD ONLY — ANALYST + BUILDER sign-off:
[ ] MIGRATION-MAP.csv complete — all legacy events classified
[ ] Analytics Density Ratchet CI check active (scripts/analytics-density-check.ts)
[ ] All LOCKED TAGS explicitly documented — no unlocked modifications
[ ] All migrated events validated with <2% delta before legacy removal

================================================================================
# ANALYTICS-PROTOCOL.md — Apex Runtime v1.4
# Authors: Ashish Khandelwal, Arup Kolay | MIT License
================================================================================
