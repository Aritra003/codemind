# KNOWLEDGE-BASE.md — Working Reference (max 200 lines)
# Contains actively relevant lessons for current and near-term sprint work.
# Compress when >180 lines: Read(".claude/reference/MEMORY-TRIAGE.md") → KB COMPRESSION section.
# Stable entries graduate to KNOWLEDGE-ARCHIVE.md — the permanent record with no cap.
# Agents load THIS file at session start. Load KNOWLEDGE-ARCHIVE.md on demand only.
# Tags: [domain] [severity] [agent] [date]
================================================================================
# Entry format:
# [SEVERITY] [domain-tag] [date]
# Lesson:  [what was learned]
# Pattern: [reusable principle]
# Trigger: [what should prompt re-reading this entry]
# Source:  [incident ID | session | post-mortem]
# Status:  [ACTIVE | STABLE | RESOLVED]  ← optional; default ACTIVE
================================================================================

## HOW TO USE THIS FILE
- BUILDER:   scan CRITICAL/HIGH entries tagged to your current domain before writing
- SENTINEL:  scan [security] [auth] [pii] [payments] entries before any sensitive work
- DOCTOR:    search for similar symptoms before debugging. If not found here, load
             KNOWLEDGE-ARCHIVE.md → ARCHIVE INDEX to check full history.
- SCHOLAR:   use HIGH/CRITICAL entries to prioritise debt payoff.
             Load KNOWLEDGE-ARCHIVE.md quarterly for compression pass.
- ARTISAN:   scan [ui] entries before component implementation — design anti-patterns
             compound silently across sessions without this check
- GAUGE:     scan [performance] entries before any SLO-critical path work
- ORACLE:    scan [product] entries before SPEC or CRITIC mode
- ANALYST:   scan [analytics] [tagging-trap] entries before BUSINESS-METRICS mode
- New project transfer: load KNOWLEDGE-ARCHIVE.md, strip project-specific details,
             seed new project's KNOWLEDGE-BASE.md with transferable patterns only.

## CANONICAL TAG TAXONOMY
# Every entry must carry one domain tag from this list (add new tags via SCHOLAR in a
# DEBT-AUDIT or COMPLIANCE-CHECK session — do not invent tags ad hoc).
# Format: [domain-tag] — what class of entries carries this tag
#
# [auth]                — authentication, JWT, session, token, role, permission logic
# [payments]            — financial transactions, billing, pricing, subscription logic
# [pii]                 — personally identifiable data, encryption, data classification
# [security]            — OWASP findings, dependency vulns, injection, STRIDE threats
# [ai]                  — LLM calls, prompt engineering, model routing, output validation
# [performance]         — p99 regressions, slow queries, bundle size, cost explosions
# [schema]              — database schema, ORM behaviour, migration, field assumptions
# [integration]         — external API contracts, SDK behaviour, webhook reliability
# [ui]                  — component design patterns, accessibility failures, token misuse
# [copy]                — brand voice drift, error message failures, CTA anti-patterns
# [analytics]           — event schema, provider behaviour, measurement architecture
# [tagging-trap]        — analytics debugging failures (bugs >30 min to resolve)
#                         BUILDER must scan this tag before any analytics file work —
#                         same discipline as scanning [hallucination-trap] before
#                         implementing external API calls
# [hallucination-trap]  — wrong library signatures, schema field assumptions, ORM edge cases
#                         confirmed to have produced incorrect confident code in this project
# [confidence-miscalibration] — HIGH confidence claims that VERIFY found wrong;
#                               used to recalibrate future agent confidence thresholds
# [product]             — scope decisions, metric choices, user type tradeoffs that
#                         affected architecture and should not be re-litigated

## CONFIDENCE MISCALIBRATION LOG
# When VERIFY finds FAIL on something BUILDER was HIGH confidence about:
# Add entry here tagged [confidence-miscalibration]
# Future BUILDER sessions in that domain use these entries to recalibrate.
# Format: [date] | [domain] | [what overconfidence missed] | [recalibration note]
# Example:
# 2025-01-10 | prisma-queries | HIGH confidence on findFirst behaviour with optional relations
#   Missed: optional relation not joined returns null at nested level, not excluded from results
#   Recalibration: always MEDIUM confidence on Prisma optional relation queries — read schema

## ENTRIES
# Seed entries below are canonical examples — one per major domain.
# They demonstrate format and act as first-session references.
# Replace with project-specific entries as the project accumulates real lessons.

---

[HIGH] [auth] [2025-01-01]
Lesson: JWT refresh token rotation without invalidation on logout allows replay attacks.
        A user who logs out can be re-authenticated by replaying the old refresh token if
        the server does not maintain a token revocation list (allowlist or denylist).
Pattern: Always invalidate refresh tokens server-side on logout AND password change.
         Store active refresh token IDs in cache (Redis) with TTL = token expiry.
         On use: verify token ID is still in the active set before issuing new access token.
Trigger: Any auth flow that issues refresh tokens. Any PR touching logout or password-change logic.
Source: SENTINEL security review template | OWASP A07 Auth Failures

---

[HIGH] [hallucination-trap] [2025-01-01]
Lesson: Prisma's `findFirst` with an optional relation does NOT exclude records where the
        relation is null — it returns the record with `null` at the relation field.
        Code that assumes `findFirst` with an include = "record exists with relation" will
        produce runtime errors on the nested access (e.g. `result.profile.email` where
        `result.profile` is null).
Pattern: Always null-check optional relations after any Prisma query, even with `include`.
         Never assume an included relation is populated — read the schema for `?` on the field.
Trigger: Any Prisma query using `include` with an optional (`?`) relation field.
         Any code accessing nested fields on a Prisma query result.
Source: BUILDER session — confidence miscalibration on optional Prisma relations

---

[HIGH] [analytics] [2025-01-01]
Lesson: GA4 fires `session_start` and `first_visit` before consent is collected if
        `analytics_storage` is not set to `denied` as the consent default.
        This silently produces GDPR-non-compliant data collection on first page load for EU users.
Pattern: Always initialise gtag consent with `analytics_storage: 'denied'` BEFORE the GA4
         script loads. Update to `granted` only after explicit user consent is captured.
         See ANALYTICS-PROTOCOL.md Section C for the correct initialisation sequence.
Trigger: Any analytics provider initialisation. Any change to consent flow or cookie banner.
         Any new market entry where GDPR/PECR applies.
Source: COUNSEL compliance review | ANALYTICS-PROTOCOL.md Section C consent default

---

[HIGH] [performance] [2025-01-01]
Lesson: Paginated list endpoints that use `SELECT COUNT(*)` for total-count on every request
        cause a full table scan on large tables, making the query O(n) in data volume.
        At 100k+ rows this becomes the slowest query in the system, visible in p99 spikes
        on list endpoints under moderate load.
Pattern: Replace `COUNT(*)` pagination with cursor-based pagination (keyset pagination).
         If total count is genuinely required: cache it with a short TTL (30–60s) and update
         asynchronously — do not compute on every request.
         EXPLAIN ANALYZE before and after any paginated query change.
Trigger: Any new list/search endpoint. Any existing endpoint with `LIMIT/OFFSET` pattern.
         Any GAUGE finding showing p99 regression on a read endpoint as data grows.
Source: GAUGE PERF audit pattern | PostgreSQL query planning behaviour on COUNT(*)

---

[MED] [security] [2025-01-01]
Lesson: CORS `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true`
        is rejected by browsers — but some frameworks silently fall back to allowing credentials
        with a wildcard origin in misconfigured setups, creating cross-origin data exposure.
Pattern: Never combine `*` origin with credentials: true.
         Maintain an explicit allowlist of permitted origins. Validate at the framework level,
         not just at the infrastructure level (both can be bypassed independently).
Trigger: Any new API route. Any change to CORS configuration. Any new frontend domain added.
Source: SENTINEL OWASP A05 Security Misconfiguration check

---

[CRITICAL] [payments] [2025-01-01]
Lesson: Stripe webhook handlers that return 200 before processing the event allow the handler
        to fail silently — Stripe considers the event delivered and will not retry.
        Race condition variant: processing the event synchronously inside the handler causes
        timeouts on high-volume events (Stripe's 30s timeout), resulting in missed events with
        no retry and no error surfaced to the application.
Pattern: Acknowledge the webhook immediately (return 200), then process asynchronously via a
         queue. Persist the raw event to DB before acknowledging — this is the idempotency record.
         Verify webhook signature (Stripe-Signature header) BEFORE any processing. Reject without 200 if invalid.
         Idempotency key: store event.id. On duplicate delivery, return 200 immediately — do not reprocess.
Trigger: Any new payment webhook handler. Any change to existing payment event processing.
         Any billing feature that relies on webhook-driven state transitions.
Source: SENTINEL payment review pattern | Stripe webhook best practices

---

[CRITICAL] [pii] [2025-01-01]
Lesson: Logging middleware that serialises request objects will capture Authorization headers,
        request bodies containing passwords or tokens, and query params with email addresses.
        These end up in plaintext in log aggregation tools (Datadog, CloudWatch) where they
        persist far beyond their intended lifetime and are accessible to anyone with log access.
Pattern: Implement a log sanitiser that runs on every request/response object before logging.
         Redact fields by name: password | token | authorization | cookie | secret | card_number | ssn.
         Never log raw request bodies on auth routes. Log correlation IDs, not user identifiers.
         Confirm with SENTINEL that the sanitiser covers all log emission paths — not just the main logger.
Trigger: Any new logging configuration. Any middleware that logs request/response data.
         Any new field added to a user or payment model — check if it could reach a log line.
Source: SENTINEL PII review | GDPR Article 5(1)(f) integrity and confidentiality

---

[HIGH] [ai] [2025-01-01]
Lesson: LLM token counts are non-linear with input length — a prompt that is 2× longer does not
        cost 2× tokens. JSON serialisation of objects, repeated whitespace, and verbose system
        prompts can produce 4–6× token inflation relative to the semantic content.
        At scale this makes AI cost the dominant infrastructure cost with no warning until the
        monthly bill arrives.
Pattern: Measure actual token usage (tokensIn + tokensOut) on every AI call path in staging
         before enabling for production. Set per-user and per-day hard caps via rate limiting.
         Use cachedCompletion() for any prompt with a stable prefix — cache hit rate >60% is
         achievable on most classification and extraction tasks.
         Budget: model × expected_calls_per_day × avg_tokens → monthly cost estimate before launch.
Trigger: Any new AI feature. Any change to a system prompt. Any analytics showing AI cost trending up.
         GAUGE PERF mode on any endpoint that calls an LLM.
Source: GAUGE cost audit pattern | BUILDER AI call wrapper requirement

---

[HIGH] [schema] [2025-01-01]
Lesson: Adding a NOT NULL column to a large production table without a default value causes
        the migration to lock the entire table while backfilling, producing downtime proportional
        to table size. At 1M+ rows this is minutes, not seconds.
Pattern: Follow TITAN's zero-downtime migration protocol (4 PRs):
         PR 1 EXPAND: add column as nullable with no default. Deploy.
         PR 2 MIGRATE: backfill in batches (1000 rows at a time with sleep between). Deploy.
         PR 3 CUTOVER: add NOT NULL constraint + default now that all rows are populated. Deploy.
         PR 4 CONTRACT: remove old column if this was a rename. Deploy.
         Never combine these PRs. Each must be independently deployable and independently rollback-safe.
Trigger: Any migration that adds a NOT NULL column to an existing table with data.
         Any schema change on a table with >100k rows — always check row count before writing migration.
Source: TITAN zero-downtime DB migration protocol | PostgreSQL ALTER TABLE locking behaviour

---

[HIGH] [integration] [2025-01-01]
Lesson: Third-party API clients that do not implement exponential backoff will hammer a
        rate-limited endpoint, consuming the entire rate limit quota in seconds, then failing
        all subsequent requests for the reset window — typically 60 seconds to 1 hour.
        This amplifies a temporary rate limit into a sustained outage for all users.
Pattern: Wrap every external API call in the integration gateway (lib/integrations/[service].ts).
         Implement: retry with exponential backoff (base 1s, max 32s, jitter ±20%) on 429 and 5xx.
         Circuit breaker: after 5 consecutive failures, open the circuit for 30s before retrying.
         Honour Retry-After headers when present — use the provider's stated reset time, not your own.
Trigger: Any new external service integration. Any 429 or 503 appearing in error logs.
         Any integration that does not route through lib/integrations/ gateway.
Source: BUILDER integration gateway pattern | SENTINEL OWASP A04 (quota bypass via retry storms)

---

[HIGH] [tagging-trap] [2025-01-01]
Lesson: Analytics events that fire correctly in development fail silently in production because
        the consent default was not propagated to the production environment variable, leaving
        `analytics_storage: 'granted'` in dev and `analytics_storage: 'denied'` in prod (or
        vice versa). Events appear in the dev analytics dashboard but are missing in production
        for EU users, making the discrepancy invisible without a side-by-side comparison.
Pattern: After any analytics deployment: open the provider's real-time debug view on production
         (not staging) and walk through the consent → first event sequence manually.
         Confirm the firing order: ConsentDefault → Config/Initialise → First Event.
         Any other order = tagging bug. Check environment-specific consent configuration first.
         Document the production verification step in the PR checklist for any analytics change.
Trigger: Any analytics change deployed to production. Any new market / consent flow added.
         Any discrepancy between staging and production event counts in the analytics dashboard.
Source: BREAKER analytics verification checklist | ANALYTICS-PROTOCOL.md Section E3
