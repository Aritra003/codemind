# GDPR-REGISTER.md — Article 30 Processing Register
# Mode: SECURITY (SENTINEL) | Owner: COUNSEL (sign-off required before launch)
# GDPR Article 30: organisations must maintain a written record of processing activities.
# Last updated: 2026-04-23
# Status: DRAFT — COUNSEL must review and sign off before first EU user is onboarded.
================================================================================

## Controller Details
  Name:        StinKit Inc. (TBD — legal entity to be formed)
  Contact:     privacy@stinkit.dev (TBD — must exist before EU launch)
  DPO:         Not appointed (< 250 employees threshold). Revisit at 50K MAU.

## Processor Relationships
  Anthropic (Opus 4.7)       — AI inference. Data sent: structural metadata only (node IDs, function names). DPA: Anthropic's standard DPA. No source code transmitted. (SENTINEL INV-005 enforced)
  AWS (RDS, ElastiCache)     — Infrastructure. Data stored: identity PII + billing data. DPA: AWS DPA. Region: us-east-1 + eu-west-1.
  ClickHouse Cloud           — Analytics. Data stored: anonymous usage events (no PII). DPA: ClickHouse DPA.
  Stripe                     — Payment processing. Data processed: payment card data (never stored by StinKit), subscription metadata. DPA: Stripe DPA. Stripe is controller for payment data.
  Resend (email)             — Transactional email. Data processed: email address for delivery only. DPA: Resend DPA.
  GitHub / Google (OAuth)    — Authentication. Data received: email, OAuth ID. DPA: Standard OAuth terms.

================================================================================
## Processing Activities
================================================================================

### PA-01: User Account Management
  Purpose:        Provide authenticated access to StinKit cloud features
  Legal basis:    Contract (Article 6(1)(b)) — necessary to deliver the service
  Data subjects:  Registered users
  Data categories:
    - Email address (identity)
    - Display name (optional — user-provided)
    - Password hash (bcrypt — not recoverable)
    - OAuth provider + provider ID
    - Account creation timestamp
    - Last login timestamp
  Retention:      Active: duration of account. Soft-deleted: 30 days then hard purge.
  Recipients:     AWS RDS (processor). No third-party sharing.
  Transfers:      EU users: eu-west-1 region. Standard Contractual Clauses with AWS.
  DSAR rights:    Access, Rectification, Erasure, Portability supported. See PA-06.

### PA-02: API Key Management
  Purpose:        Authenticate CLI and MCP calls to the cloud API
  Legal basis:    Contract (Article 6(1)(b))
  Data subjects:  Registered users
  Data categories:
    - Key name (user-provided label)
    - Key hash (bcrypt — not the raw key)
    - Key creation + last use timestamps
    - Key scopes (permissions granted)
  Retention:      Revoked keys: 90 days then purge (needed for audit trail).
  Recipients:     AWS RDS only.

### PA-03: Team and Collaboration Features
  Purpose:        Enable team-based features (shared hotspot views, multi-member billing)
  Legal basis:    Contract (Article 6(1)(b))
  Data subjects:  Team admins + team members
  Data categories:
    - Team membership (user_id → team_id + role)
    - Invitation email addresses (before account creation)
    - Role assignments and change history (not stored separately — captured in audit log)
  Retention:      Team membership: until removed or team deleted. Invitation: 24-hour TTL.
  Recipients:     AWS RDS only.

### PA-04: Billing and Subscription
  Purpose:        Process payments and manage subscription tiers
  Legal basis:    Contract (Article 6(1)(b)) + Legal obligation (Article 6(1)(c)) for invoicing
  Data subjects:  Paying users and team admins
  Data categories:
    - Subscription tier + status
    - Billing period dates
    - Invoice amounts and status
    - Stripe customer ID (reference only — Stripe is controller for card data)
    - Usage counters (deep analysis count per period)
  Retention:      Invoice records: 7 years (legal/tax obligation).
                  Subscription history: 7 years.
                  Usage meters: 2 years.
  Recipients:     AWS RDS (processor), Stripe (co-controller for payment data).
  Note:           StinKit never sees or stores credit card numbers. Stripe handles all card data.

### PA-05: Opt-in Usage Telemetry
  Purpose:        Understand product usage patterns; improve the product
  Legal basis:    Consent (Article 6(1)(a)) — explicit opt-in at first run
  Data subjects:  Users who opted in (CLI install)
  Data categories:
    - install_id (random UUID — not linked to identity without additional processing)
    - Event names (e.g., check_fast_completed)
    - Event properties (counts, durations, risk levels — see ANALYTICS-SCHEMA.md)
    - Client version
    - Timestamps
  Retention:      90 days hot (ClickHouse). 2 years cold (S3). Delete after 2 years.
  Recipients:     ClickHouse Cloud (processor).
  Note:           By design, install_id is not linked to user identity (email/user_id).
                  Telemetry is truly anonymous unless user explicitly links their account.
  Withdrawal:     User can opt out at any time: `stinkit config set telemetry false`
                  On opt-out: stop emitting. No retroactive deletion (data is anonymous).

### PA-06: Data Subject Rights Management
  Purpose:        Comply with GDPR Articles 15-22 (access, rectification, erasure, portability)
  Legal basis:    Legal obligation (Article 6(1)(c))
  Process:
    Access (Art. 15):      User can download their data via GET /api/v1/auth/me + GET /billing/invoices
                           Full export: POST /api/v1/auth/data-export (planned — add to API-DESIGN)
    Rectification (Art. 16): PUT /api/v1/auth/me for email + display_name
    Erasure (Art. 17):     DELETE /api/v1/auth/account (planned — add to API-DESIGN, see SV-001 note)
                           Implementation: soft-delete user row + queue BullMQ gdpr-purge job.
                           Job purges: all identity rows, all billing rows (except invoices — 7yr legal hold),
                           all team memberships, all active tokens. Completes within 30 days (INV-008).
    Portability (Art. 20): POST /api/v1/auth/data-export → JSON file of user data
    Objection (Art. 21):   Telemetry opt-out (above). No automated profiling in v1.
  Response SLA:   30 days per GDPR Article 12.
  Contact:        privacy@stinkit.dev

================================================================================
## Data Residency
================================================================================
  EU users:          eu-west-1 (Ireland) — AWS RDS + ElastiCache
  US users:          us-east-1 (Virginia) — AWS RDS + ElastiCache
  ClickHouse Cloud:  Region TBD — must be confirmed before EU launch. EU cluster required.
  Anthropic API:     US-based. Data in transit only (structural metadata, no source code).
                     Standard contractual clauses required for EU users sending data to Anthropic.
                     (SENTINEL: confirm with COUNSEL whether function names constitute personal data)

================================================================================
## COUNSEL SIGN-OFF CHECKLIST (required before first EU user)
================================================================================

  [ ] Legal entity formed with appropriate jurisdiction
  [ ] privacy@stinkit.dev mailbox operational
  [ ] DPA signed with: AWS, ClickHouse, Anthropic, Stripe, Resend
  [ ] Privacy Policy published at stinkit.dev/privacy (covers all PA-01 through PA-05)
  [ ] Terms of Service published (covers contract basis for PA-01 through PA-04)
  [ ] Cookie Policy (if analytics cookies used on web dashboard)
  [ ] Consent mechanism for telemetry implemented and tested
  [ ] Data export + deletion endpoints implemented (add to API-DESIGN.md before BUILDER)
  [ ] EU-West-1 region confirmed for EU user routing
  [ ] Standard Contractual Clauses confirmed for Anthropic API data transfer
  [ ] Article 30 register reviewed and signed by counsel

================================================================================
# END OF GDPR-REGISTER.md
# Status: DRAFT. COUNSEL gate required before EU launch.
================================================================================
