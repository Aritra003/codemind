# ESCALATION-TREE.md — CodeMind Production Ownership + Escalation Protocol
# Mode: ESCALATION-TREE | Agent: STEWARD
# Input: INFRASTRUCTURE.md · SLO.md · OBSERVABILITY.md · GDPR-REGISTER.md
# Last updated: 2026-04-23
# Rule: Every P0 category has a named primary + backup human before first production deploy.
# Review cadence: Monthly (ESCALATION-REVIEW mode). Stale contacts cost 30+ minutes during P0.
# ⚠️  FILL BEFORE LAUNCH: All [FILL BEFORE LAUNCH] fields must be completed before SCAFFOLD.
================================================================================

## Production Ownership Declaration
```
Production owner:  [FILL BEFORE LAUNCH — must be a named human, not a role or agent]
Declared by:       STEWARD
Effective:         [date when declared]
Review trigger:    Ownership transfers require a new declaration in CONTEXT.md.
```
STEWARD rule: Production cannot be unowned. BUILDER work is blocked until this is filled.

================================================================================
## On-Call Rotation
================================================================================

Rotation cadence: weekly, Sunday 00:00 UTC handoff.
On-call scope:    P0 and P1 incidents. P2+ are handled next business day.
Tooling:          PagerDuty schedule (configure before LAUNCH-READY gate).

### Current Rotation Slots

```
Slot 1 — Primary on-call:
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH — mobile, receives PagerDuty call + SMS]
  Slack:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]

Slot 2 — Backup on-call (paged if primary does not acknowledge within 5 minutes):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]
  Slack:   [FILL BEFORE LAUNCH]

Escalation escalation (paged if backup does not acknowledge within 10 minutes):
  → Escalate to FOUNDER (see P0-01 entry below)
```

### Handoff Protocol
Before going off-call, outgoing engineer must:
- [ ] Confirm no open incidents
- [ ] Confirm no ISSUES OPEN P0 or P1 that landed during their rotation
- [ ] Brief incoming engineer on any elevated risk (recent deploy, known flakiness)
- [ ] Transfer PagerDuty schedule coverage and confirm acknowledgment

================================================================================
## Severity Classification Matrix
================================================================================

| Severity | Definition | Examples | SLA | Wake? |
|---|---|---|---|---|
| **P0** | Production completely broken or legal obligation at risk | Auth down, GDPR purge failed, data leak, payment corruption | Immediate (<15 min) | Any time |
| **P1** | Significant degradation, SLO breach, security event | 50% error rate on any critical endpoint, Redis down, credential stuffing | 30 min | Business hours |
| **P2** | Partial degradation, SLO warning | p99 latency elevated, queue backlog, telemetry lag | Same day | No |
| **P3** | Cosmetic or low-impact issue | Minor UI bug, non-critical log noise | Next sprint | No |

P0 auto-triggers: SLO-C01..C04 fast-burn alert + any GDPR purge job failure.
P1 auto-triggers: SLO error budget > 10% in 6 hours (slow burn), Redis unavailable alert.

================================================================================
## P0 Escalation Entries
================================================================================

### P0-01: Complete API Outage (SLO-C01–C03 all breached simultaneously)
```
Definition:     API returns 5xx on ≥3 CRITICAL-tier endpoints for > 5 minutes.
                Users cannot log in, refresh sessions, or access any cloud feature.
Category:       Complete outage

Primary:
  Name:    [FILL BEFORE LAUNCH — Founder / Engineering Lead]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]
  Slack:   [FILL BEFORE LAUNCH]

Backup:
  Name:    [FILL BEFORE LAUNCH — Co-founder or Senior Engineer]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   15 minutes to acknowledge. 30 minutes to first mitigation action.
Wake window:    Any time
Decision authority:
  - Approve infrastructure failover (multi-AZ switch)
  - Approve rollback of last deploy
  - Approve scaling ECS task count above provisioned limits
  - Approve public status page update and user communication
Escalate if:    Outage > 30 minutes, or no root cause found after initial investigation.

STEWARD action: Post to #status-page channel immediately.
                Update status.codemind.dev to "Investigating" within 5 minutes.
DOCTOR action:  Read runbooks/api-server.md → COMPLETE OUTAGE section.
```

---

### P0-02: Security Breach — Credential Leak or Unauthorized Access
```
Definition:     Confirmed or suspected: mass account compromise, API key leak,
                unauthorized admin access, data exfiltration, or injection attack
                that reached the database.
Category:       P0 security breach

Primary (Security lead):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]
  Slack:   [FILL BEFORE LAUNCH]

Backup:
  Name:    [FILL BEFORE LAUNCH — Founder]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   Immediate — do not wait 15 minutes. Call in parallel with investigation.
Wake window:    Any time
Decision authority:
  - Approve mass session revocation (all active refresh tokens purged)
  - Approve taking API offline to prevent further data exposure
  - Approve mandatory password reset for affected users
  - Approve notifying affected users (GDPR Article 33: 72-hour notification clock starts now)
  - Approve engaging external security firm
Escalate if:    Any evidence of personal data exfiltration → GDPR breach notification clock
                starts immediately. Escalate to Legal (P0-05) in parallel.

STEWARD action: Log incident timestamp in CONTEXT.md: "SECURITY INCIDENT [ISO date]: [description]"
                Do NOT communicate externally until Primary approves exact wording.
                GDPR 72-hour clock: notify [COUNSEL / Legal contact] immediately.
DOCTOR action:  Read runbooks/auth-service.md → SECURITY BREACH section.
SENTINEL action: Engage immediately — SENTINEL owns forensics of the attack vector.
```

---

### P0-03: Payment / Billing Corruption (Stripe Webhook Processing Failure)
```
Definition:     ≥2 Stripe webhook failures in 1 hour, OR subscriptions in unknown state
                (user paid but not upgraded, or user cancelled but still active),
                OR Stripe event IDs being processed twice (double-charge risk).
Category:       P0 payment failure

Primary (Billing / Founder):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]
  Slack:   [FILL BEFORE LAUNCH]

Backup:
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   15 minutes
Wake window:    Any time
Decision authority:
  - Approve manual subscription state reconciliation (Stripe dashboard → local DB sync)
  - Approve refunding affected users
  - Approve disabling new subscription signups while corruption is investigated
  - Approve direct communication to affected billing users
Escalate if:    > 10 users affected, OR double-charge confirmed.

STEWARD action: Pull Stripe Dashboard webhook logs immediately.
                Cross-reference mrr_events_total and stripe_webhook_failures_total in Grafana.
DOCTOR action:  Read runbooks/billing-service.md → WEBHOOK FAILURE section.
```

---

### P0-04: GDPR Data Deletion Failure
```
Definition:     Any gdpr-purge BullMQ job in `failed` state, OR any purge taking > 25 days
                from AccountDeleted event (SLO-B03: must complete within 30 days — legal).
Category:       Legal obligation breach

Primary (Legal / Compliance):
  Name:    [FILL BEFORE LAUNCH — Legal counsel or DPO]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]

Backup (Founder):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   Immediate — this is a legal obligation. There is no grace period.
Wake window:    Any time
Decision authority:
  - Approve manual execution of data purge script
  - Approve notification to data subject that their deletion is delayed
  - Approve regulatory disclosure if 30-day deadline is missed
  - Approve engaging Data Protection Authority if required
Escalate if:    30-day deadline is missed → escalate to DPA notification immediately.

STEWARD action: Log in CONTEXT.md: "GDPR BREACH RISK [ISO date]: purge job [id] failed."
                Contact Legal (this entry) AND production owner simultaneously.
                Preserve all logs related to the failed purge — do not rotate or delete them.
DOCTOR action:  Read runbooks/gdpr-purge.md → FAILED JOB section.
                Note: userId logs for the failed purge must be retained until purge completes,
                      then purged as part of the successful purge run.
```

---

### P0-05: Legal Escalation (Subpoena, Regulatory Inquiry, GDPR Complaint)
```
Definition:     Formal legal demand received: subpoena for user data, GDPR
                data subject complaint filed with DPA, IP/copyright claim, or
                any government inquiry requiring a legal response.
Category:       Legal

Primary (Legal Counsel):
  Name:    [FILL BEFORE LAUNCH — retained external legal counsel]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]

Backup (Founder):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   4 hours (legal demands have formal response deadlines — do not sit on them)
Wake window:    Business hours (unless demand includes imminent deadline)
Decision authority:
  - All external legal communication
  - Decisions to comply or contest legal demands
  - User data disclosures
Escalate if:    Any demand arrives → immediately forward to Legal Primary. Do not respond
                to any legal demand without Legal counsel approval. Not even "received."

STEWARD action: Forward the demand unmodified to Legal Primary.
                Log receipt in CONTEXT.md with timestamp.
                Do NOT respond to the sender, do NOT produce any data, do NOT communicate
                about this externally until Legal provides approved language.
```

---

### P0-06: Cost Runaway (AWS or Anthropic API bill spike)
```
Definition:     AWS daily spend exceeds 3× normal daily average, OR Anthropic API
                usage (if CodeMind ever manages API keys for users) exceeds $500/day
                unexpectedly. Signals: runaway ECS task, recursive job loop,
                ClickHouse scan on un-indexed column, or compromised API key.
Category:       Cost runaway

Primary (Founder / Engineering Lead):
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]
  Email:   [FILL BEFORE LAUNCH]

Backup:
  Name:    [FILL BEFORE LAUNCH]
  Phone:   [FILL BEFORE LAUNCH]

Response SLA:   1 hour (AWS Cost Anomaly Detection sends the alert — time-box investigation)
Wake window:    Business hours (configure AWS budget alert → PagerDuty for after-hours)
Decision authority:
  - Approve scaling down or terminating ECS tasks
  - Approve disabling specific features to stop cost bleed
  - Approve AWS support escalation
Escalate if:    Spend > 10× normal and root cause not found within 1 hour → take down
                the runaway resource immediately, then investigate.

STEWARD action: Check AWS Cost Explorer and CloudWatch → identify top-spend resource.
                Cross-reference ECS task health and BullMQ queue depths.
DOCTOR action:  Read runbooks/api-server.md → COST RUNAWAY section.
```

================================================================================
## Human Briefing Format Template
================================================================================

Send this brief to the on-call human BEFORE calling them.
Rule: never call without a brief. "Something is wrong, call us" causes panic and wastes time.
Copy, fill, send via Slack DM + SMS within 3 minutes of declaring the incident.

```
BRIEF:         [one sentence — "The API /auth/login endpoint has returned 5xx for all requests
                for the last 8 minutes, blocking all user logins."]
SEVERITY:      P[0|1|2]
IMPACT:        [estimated users affected — "~200 active sessions, all logins blocked"]
DURATION:      [time since incident started — "8 minutes (since 14:32 UTC)"]

WHAT WE KNOW:  [root cause if found | "Investigating — last deploy was 14:15 UTC (auth service v2.1.3)"]
WHAT WE'VE TRIED: [list of actions taken so far]
  - Checked ECS task health: 2/3 tasks healthy
  - Checked RDS connection count: normal (12/100)
  - Checked CloudWatch error logs: NullPointerException in auth/login handler

WHAT WE NEED FROM YOU: [specific decision]
  - "Approve rollback to auth service v2.1.2"
  - OR: "Confirm we can take the API fully offline for 5 minutes to restart all tasks"

TIME SENSITIVE: Yes — every minute costs ~10 users unable to log in.
                Rollback takes ~3 minutes. Waiting for your go-ahead.

COST SO FAR:   ~$[x] estimated (uptime SLO breach: [n] minutes × $[y]/min customer impact estimate)
NEXT AGENT ACTION: DOCTOR is reviewing the error logs and has a rollback command ready.
                   Will execute on your approval or in 5 minutes without response (P0 protocol).
```

================================================================================
## User Communication Templates (Status Page)
================================================================================

All external communication goes via status.codemind.dev (StatusPage.io or equivalent).
STEWARD posts. Founders approve wording for P0. On-call engineer posts for P1.

### Template: Investigating
```
[HH:MM UTC] Investigating — We are aware of issues affecting [feature/service].
Our team is investigating. Updates every 15 minutes.
```

### Template: Identified
```
[HH:MM UTC] Identified — We have identified the cause: [non-technical description].
We are working on a fix. Estimated resolution: [time or "within X minutes"].
```

### Template: Monitoring
```
[HH:MM UTC] Monitoring — A fix has been deployed. We are monitoring to confirm stability.
Affected users may need to log out and back in. We apologise for the disruption.
```

### Template: Resolved
```
[HH:MM UTC] Resolved — This incident has been resolved.
Duration: [X] minutes. Root cause summary: [one sentence].
We will publish a full post-mortem within [24/48] hours for incidents lasting > 15 minutes.
```

### Template: Security Breach (Legal must approve before posting)
```
[HH:MM UTC] Security Notice — We are investigating a security incident affecting CodeMind.
We are taking immediate steps to secure affected accounts. [Legal-approved details only].
If you believe your account may be affected, please [specific action].
We will provide a full update by [time].
```

================================================================================
## Post-Incident Protocol
================================================================================

All P0 and P1 incidents require a post-mortem. Run within:
  - P0: 48 hours of resolution.
  - P1: 1 week of resolution.
  - P2: optional — at team's discretion.

Post-mortem format (DOCTOR leads, STEWARD owns external communication summary):
  - Timeline: minute-by-minute from first alert to resolution
  - Root cause: what actually broke and why
  - Detection gap: how long between failure and alert (if > 5 min, alert needs improvement)
  - Response gap: how long between alert and first action (if > SLA, escalation tree needs improvement)
  - Contributing factors: what made this possible (missing test, config drift, unclear runbook)
  - Action items: ISSUES OPEN entries with owner + due date (no "we'll be careful" items)
  - Blameless principle: post-mortems are about systems, not people.

Post-mortem is stored in: runbooks/post-mortems/YYYY-MM-DD-[description].md

================================================================================
## Monthly ESCALATION-REVIEW Checklist
================================================================================

Run every month. STEWARD logs result in CONTEXT.md.

[ ] Confirm Primary + Backup for every P0 entry is still reachable at listed contact info
[ ] Confirm decision authority is still accurate (no role changes in the team)
[ ] Confirm wake-window preferences have not changed
[ ] Confirm PagerDuty rotation is correctly configured and scheduled for next 4 weeks
[ ] Run a fire drill: produce the Human Briefing Format for a hypothetical P0 outage
    from scratch in < 5 minutes. If it takes longer, the template or information is stale.
[ ] Review any post-mortems from the past month — any action items still open?
[ ] Log: `ESCALATION-REVIEW [ISO date]: [changes made | no changes]` in CONTEXT.md

================================================================================
## Backup and Disaster Recovery Reference (BACKUP-VERIFY — monthly)
================================================================================

RTO / RPO targets (from INFRASTRUCTURE.md and SLO.md):
  PostgreSQL (AWS RDS Multi-AZ):
    RTO: ~30 seconds (automatic multi-AZ failover)
    RPO: < 5 minutes (automated backups every 5 minutes, point-in-time recovery)
    Cross-region:  Automated snapshot copy to secondary region (configure before launch)

  Redis (AWS ElastiCache):
    RTO: ~1 minute (read replica promotion)
    RPO: At-risk data: rate limit counters and session tokens (session tokens are JWTs,
         re-auth is acceptable fallback — no critical data lost)
    Degraded mode: API continues without Redis (rate limiting disabled — alert ops)

  ClickHouse:
    RTO: ClickHouse Cloud SLA (99.9% uptime) — no self-managed failover
    RPO: BullMQ telemetry buffer absorbs up to 10K events during outage; replayed on recovery
    Cross-region: ClickHouse Cloud handles replication internally

  PostgreSQL backup verification schedule:
    [ ] Monthly: restore latest automated snapshot to staging → verify row counts
    [ ] Monthly: test point-in-time recovery for a specific timestamp
    [ ] Monthly: confirm snapshot is encrypted and cross-region copy exists
    [ ] Log: `BACKUP-VERIFY [ISO date]: [PASS/FAIL]` in CONTEXT.md

Runbook for manual restore: runbooks/disaster-recovery.md (DOCTOR writes this at RUNBOOK gate).

================================================================================
## Production Owner Declaration Log
================================================================================

```
Declared: [FILL BEFORE LAUNCH — name, role, date]
Review:   Quarterly, or on role change.
```

OPEN ISSUE: Production owner is currently undeclared (STEWARD placeholder).
            This blocks SCAFFOLD. Human must declare a named owner before BUILDER starts.
            Filed as: ISSUES OPEN [#6] P1 "Production owner undeclared — blocks SCAFFOLD"

================================================================================
# END OF ESCALATION-TREE.md
# Gate: ESCALATION-TREE complete (structure + protocols fully defined).
# ⚠️  ACTION REQUIRED: Fill all [FILL BEFORE LAUNCH] contact fields before first deploy.
# Next gate: COMPLIANCE-LEGAL (COUNSEL) → LEGAL-REVIEW.md
================================================================================
