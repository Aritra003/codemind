# runbooks/gdpr-purge.md — GDPR Data Purge Runbook
# SLO coverage: SLO-B03 (100% completion within 30 days — legal obligation)
# Agent: DOCTOR | Last updated: 2026-04-23
# Trigger: ANY gdpr_purge job in "failed" state → P0 IMMEDIATELY
# Legal: GDPR Article 17 — 30-day deadline is not an SLO. It is a legal obligation.
================================================================================

## ⚠️  P0 IMMEDIATELY — No Grace Period

A failed GDPR purge job is NOT a normal incident. It has legal consequences.
GDPR Article 17 (right to erasure) requires data deletion within 30 days.
Missed deadline → regulatory reporting obligation → potential ICO / DPA fine.

On ANY gdpr_purge failure:
  1. Page STEWARD immediately (ESCALATION-TREE.md P0-04)
  2. STEWARD contacts Legal Counsel (P0-05) within 1 hour
  3. DOCTOR takes technical lead on purge completion
  4. Do NOT close the incident until purge is successfully completed AND verified

================================================================================
## Architecture Reminder

Purge flow:
  1. User deletes account → AccountDeleted domain event
  2. 30-day delayed BullMQ job created: gdpr-purge queue, delay = 30 days
  3. At 30 days: job runs and hard-deletes:
     - identity.users (hard delete — all PII)
     - identity.api_keys (all keys for user)
     - identity.team_members (membership records)
     - billing.subscriptions (non-invoice records)
     - Redis: all user keys (session:, refresh:, rate:, usage:, subscription:)
  4. billing.invoices: ANONYMISED, not deleted (7-year retention for financial compliance)
     Replace: userId with '[deleted]', email with '[deleted]'
  5. ClickHouse telemetry: anonymous by design (install_id = UUID, no userId link)
     No action needed for ClickHouse.

Database backups: GDPR purge must also remove user data from backup snapshots.
  Protocol: mark the userId in a `pending_backup_purge` table.
  On next full backup rotation (within 35 days of account deletion):
  verify the user's data is no longer in the new backup.
  This is an eventual-consistency approach — acceptable if rotation is < 35 days.

================================================================================
## Symptoms of a Failed Purge

PagerDuty alert: gdpr_purges_failed_total incrementing (fires on any failure)

CloudWatch log filter: `gdpr_purge_failed`
  ```
  { $.event = "gdpr_purge_failed" }
  ```

BullMQ failed queue: gdpr-purge queue has jobs in "failed" state.

SLO breach warning: any purge job with createdAt > 25 days ago still in pending/failed state
  → 5-day warning before 30-day legal deadline

================================================================================
## Immediate Mitigation

Step 1 — Identify the failed job:
  ```bash
  # BullMQ inspection
  # Via Bull Board admin UI (if configured): http://admin.codemind.dev/queues
  # Or via code:
  npx ts-node packages/server/scripts/inspect-gdpr-queue.ts
  # Shows: jobId, userId, scheduledAt, attempts, lastError
  ```

Step 2 — Read the error:
  CloudWatch Logs → /codemind/prod/api → filter: `jobId: [jobId]`
  Most common errors:
    a. DB connection failure → retry manually (see Step 3)
    b. User not found (already deleted?) → verify and close
    c. Foreign key constraint → a related table wasn't cleaned first → see Step 4
    d. Redis key purge partial failure → see Step 5

Step 3 — Manual retry (for transient errors):
  ```bash
  npx ts-node packages/server/scripts/retry-gdpr-purge.ts --jobId [jobId]
  # This re-enqueues the job immediately (no 30-day delay)
  # Monitor logs for completion: grep "gdpr_purge_completed"
  ```

Step 4 — Foreign key constraint failure:
  If a related table has a FK reference to users.id that wasn't cleaned:
  Check the error for the specific table.
  Run targeted cleanup in the correct order:
  ```sql
  BEGIN;
  DELETE FROM identity.team_members WHERE user_id = '[userId]';
  DELETE FROM identity.api_keys WHERE user_id = '[userId]';
  -- anonymize billing.invoices first (DO NOT delete — 7-year retention)
  UPDATE billing.invoices SET user_id = '[deleted]' WHERE user_id = '[userId]';
  DELETE FROM billing.subscriptions WHERE user_id = '[userId]';
  DELETE FROM identity.users WHERE id = '[userId]';
  COMMIT;
  ```
  SENTINEL REVIEW REQUIRED before any manual DB write (auth/PII data).

Step 5 — Redis key purge failure:
  ```bash
  # List all keys for the user
  redis-cli -h $REDIS_HOST --scan --pattern "*[userId]*"
  # Manually delete each
  redis-cli -h $REDIS_HOST DEL "session:[userId]" "refresh:[userId]" \
    "rate:[userId]" "usage:[userId]:*" "subscription:[userId]"
  ```

================================================================================
## Verification of Successful Purge

After purge job completes, verify ALL data sources:

[ ] PostgreSQL — identity.users: no row with userId
    ```sql
    SELECT id FROM identity.users WHERE id = '[userId]';
    -- Expected: 0 rows
    ```

[ ] PostgreSQL — identity.api_keys: no rows for userId
    ```sql
    SELECT id FROM identity.api_keys WHERE user_id = '[userId]';
    -- Expected: 0 rows
    ```

[ ] PostgreSQL — identity.team_members: no rows for userId
    ```sql
    SELECT * FROM identity.team_members WHERE user_id = '[userId]';
    -- Expected: 0 rows
    ```

[ ] PostgreSQL — billing.subscriptions: no rows for userId
    ```sql
    SELECT * FROM billing.subscriptions WHERE user_id = '[userId]';
    -- Expected: 0 rows
    ```

[ ] PostgreSQL — billing.invoices: rows exist but with anonymised userId
    ```sql
    SELECT user_id FROM billing.invoices WHERE user_id = '[userId]';
    -- Expected: 0 rows (userId replaced with '[deleted]' marker)
    ```

[ ] Redis: no keys matching user
    ```bash
    redis-cli -h $REDIS_HOST --scan --pattern "*[userId]*" | wc -l
    # Expected: 0
    ```

[ ] CloudWatch log: `gdpr_purge_completed` event present for this jobId

[ ] BullMQ: job in "completed" state, not "failed"

================================================================================
## Communication Protocol

After successful purge:
  - Log in CONTEXT.md: `GDPR PURGE COMPLETED [ISO date]: userId [id] purged [n] rows`
  - Notify Legal Counsel that purge is confirmed complete
  - Update GDPR-REGISTER.md gdpr_purges_completed_total if tracking manually

If 30-day deadline was missed (purge NOT completed in time):
  - STEWARD notifies Legal Counsel immediately (ESCALATION-TREE.md P0-05)
  - Legal determines if notification to data subject is required
  - Legal determines if notification to supervisory authority (ICO/DPA) is required
  - Do NOT communicate with the data subject without Legal approval
  - Document the delay, cause, and resolution for regulatory record

================================================================================
## Prevention Checklist (after any GDPR purge failure)

[ ] Is the BullMQ gdpr-purge queue configured with 5 retries + 60K ms backoff?
[ ] Is the gdpr_purges_failed_total alert wired to PagerDuty (any failure → immediate)?
[ ] Does the runbook correctly list ALL tables that hold userId references?
[ ] Is the backup purge protocol (pending_backup_purge table) implemented?
[ ] Is there a 25-day warning alert for any purge taking longer than expected?

================================================================================
## Post-Mortem Trigger

Any GDPR purge failure = P0 = mandatory post-mortem within 24 hours.
Post-mortem must be provided to Legal for regulatory records.
Prevention actions must include: whatever caused the failure cannot recur.
