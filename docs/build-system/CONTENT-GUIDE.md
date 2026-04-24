# CONTENT-GUIDE.md — CodeMind Brand Voice + Copy Standards
# Mode: CONTENT | Agent: QUILL
# Last updated: 2026-04-23
# Rule: No user-facing string ships without a QUILL-approved entry here or explicit QUILL sign-off.
#       BUILDER uses these strings verbatim. No paraphrase. No "close enough."
================================================================================

## Brand Voice

Voice (3 words):      **Direct** | **Precise** | **Honest**
Anti-voice (3 words): **Hype** | **Corporate** | **Apologetic**

```
Direct:     Short sentences. Active verbs. The developer has 30 seconds.
            Every word earns its place. No filler. No hedging.

Precise:    Numbers over vague claims. "247 affected paths" not "many paths."
            "94% completeness" not "almost complete." Be exact or say you don't know.

Honest:     Acknowledge limits. When AI enriches output, say so.
            When graph has gaps, say so. When something is uncertain, say uncertain.
            Never overclaim. This is how you earn trust with senior developers.

Not hype:   Never "revolutionary," "game-changing," "blazing-fast," "AI-powered magic."
            Developers have seen it all. Hype is the fastest way to lose credibility.

Not corporate: Never "leverage," "robust solution," "seamlessly integrate," "empower your team."
               Humans speak in plain English. So does CodeMind.

Not apologetic: "Something went wrong on our end" is honest.
                "We're so sorry for the inconvenience!" is noise.
                One clear statement > three apologetic qualifiers.
```

Reading level: Grade 9–10 (technical audience — precise is fine, jargon for its own sake is not).
               Short sentences win. Prefer: "Run `codemind index` to start." over "To initiate
               the indexing process, execute the `codemind index` command."

================================================================================
## Canonical Terminology
================================================================================

Enforce these names consistently everywhere: web UI, CLI help text, emails, docs.
BUILDER must use these exact strings. Deviations require QUILL approval.

| Concept | Correct | Never use |
|---|---|---|
| The CLI analysis command | `check` | "scan," "analyze," "inspect" |
| The AI-enriched check | `deep analysis` | "AI analysis," "smart check," "Opus mode" |
| Graph completeness | "graph completeness" | "accuracy," "coverage" (reserved for test coverage) |
| Affected downstream code | "dependents" | "dependencies" (those are what you depend ON) |
| The code graph data structure | "graph" | "map," "model," "codebase graph" |
| The product | "CodeMind" | "codemind" (unless in CLI command context), "CM" |
| Subscription tiers | "Free," "Pro," "Team," "Enterprise" | all lowercase, "Basic," "Starter" |
| The graph index file | "graph index" | "cache," "database," "local store" |
| Pre-commit integration | "pre-commit hook" | "git hook," "commit hook" |
| Blast radius | "blast radius" | "impact," "risk surface," "affected area" |
| CLI command for drift | `see` | "compare," "diff," "check diagram" |
| CLI command for tracing | `trace` | "debug," "trace back," "find root cause" |
| CLI command for graph | `graph` | "visualize," "map" |
| The cloud product | "CodeMind Cloud" | "the dashboard," "the app," "the server" |
| API authentication key | "API key" | "token," "secret key" (for external API keys — internal tokens use "token") |
| Deep analysis usage limit | "deep analysis calls" | "tokens," "credits," "AI uses" |

================================================================================
## Web UI Copy — Authentication
================================================================================

### Registration page
```
Page heading:        "Create your account"
Subheading:          "Start analyzing your codebase in minutes."
Email label:         "Work email"
Password label:      "Password"
Password hint:       "Minimum 12 characters"
CTA button:          "Create account"
Already have one:    "Already have an account? Sign in"
Terms line:          "By creating an account, you agree to our Terms of Service and Privacy Policy."
```

### Login page
```
Page heading:        "Sign in"
Email label:         "Email"
Password label:      "Password"
CTA button:          "Sign in"
Forgot link:         "Forgot password?"
No account yet:      "New to CodeMind? Create an account"
```

### Password reset — request
```
Page heading:        "Reset your password"
Body:                "Enter your email and we'll send you a reset link."
Email label:         "Email"
CTA button:          "Send reset link"
Back link:           "Back to sign in"
Confirmation:        "Check your email. If an account exists for that address, we've sent a reset link."
```
Note: Confirmation is intentionally vague (does not confirm whether email exists — prevents enumeration).

### Password reset — set new password
```
Page heading:        "Choose a new password"
Password label:      "New password"
Confirm label:       "Confirm new password"
CTA button:          "Update password"
Success:             "Password updated. Sign in with your new password."
```

### Email verification
```
Heading:             "Check your email"
Body:                "We sent a verification link to [email]. Click it to activate your account."
Resend link:         "Didn't receive it? Resend verification email"
```

================================================================================
## Web UI Copy — Onboarding (3-step)
================================================================================

### Step 1: Install CLI
```
Heading:    "Install the CLI"
Body:       "CodeMind runs locally on your machine. Your code never leaves your environment."
Code block: "npm install -g codemind"
Or:         "npx codemind"
Step label: "1 of 3"
CTA:        "I've installed it →"
```

### Step 2: Index your repo
```
Heading:    "Index your repo"
Body:       "Run this in your project root. Takes 10–45 seconds depending on size."
Code block: "cd your-project && codemind index"
Hint:       "What's indexing? CodeMind builds a graph of your codebase — functions,
             dependencies, and call paths. It runs locally. No code is uploaded."
CTA:        "My repo is indexed →"
```

### Step 3: Run your first check
```
Heading:    "Run your first check"
Body:       "Stage a change and see its blast radius before you commit."
Code block: "git add authService.ts\ncodemind check authService.ts"
Hint:       "Or install the pre-commit hook to run automatically on every commit:"
Code:       "codemind --install-hook"
CTA:        "I'm set up →"
Skip link:  "Set this up later"
```

================================================================================
## Web UI Copy — Dashboard
================================================================================

### Empty states

**No API keys created:**
```
Illustration:  key icon (outlined, not filled)
Heading:       "No API keys yet"
Body:          "Create an API key to authenticate the CLI with your CodeMind account."
CTA:           "Create API key"
```

**No team members (solo account):**
```
Illustration:  person + plus icon
Heading:       "You're the only one here"
Body:          "Invite your team to share graph insights and coordinate changes."
CTA:           "Invite team member"
Secondary:     "Upgrade to Team to invite members"  (shown only on Free tier)
```

**No invoices yet:**
```
Heading:       "No invoices yet"
Body:          "Your billing history will appear here after your first payment."
```

**No activity (new account):**
```
Heading:       "No checks yet"
Body:          "Run `codemind check` in your terminal to start seeing results here."
```

### Billing + subscription copy

**Usage meter:**
```
Label:         "Deep analysis calls"
Format:        "12 / 50 used this month"
Near limit:    "42 / 50 used — 8 remaining"   (warning color at 84%+)
At limit:      "50 / 50 used — limit reached"  (critical color)
Tooltip:       "Deep analysis runs `codemind check --think`, powered by Claude claude-opus-4-7."
```

**Upgrade prompt (at limit):**
```
Heading:       "You've reached your deep analysis limit"
Body:          "Upgrade to Pro for 50 calls per month, or Team for unlimited."
Primary CTA:   "Upgrade to Pro"
Secondary CTA: "Compare plans"
Dismiss:       "Continue on Free"
```

**Cancellation confirmation modal:**
```
Heading:       "Cancel your Pro subscription?"
Body:          "Your Pro features remain active until [end of billing period date].
                After that, your account returns to the Free plan."
Primary CTA:   "Cancel subscription"   (destructive — outlined, not filled)
Secondary CTA: "Keep Pro"
```

**Downgrade impact note:**
```
"Your API keys and team data are kept. Deep analysis history is retained for 30 days."
```

### Team management
```
Invite CTA:           "Invite member"
Role options:         "Member" / "Admin"
Role descriptions:
  Member:             "Can view graph, run checks, read team data"
  Admin:              "Can invite members, manage billing, manage API keys"
Pending invite label: "Invite sent"
Remove member:        "Remove from team"
Remove confirm:       "Remove [name] from [Team name]? They'll lose access immediately."
Last admin block:     "You're the last admin. Transfer admin rights before leaving."
```

================================================================================
## Error Messages
================================================================================

Format: [What happened] + [Why, briefly] + [What to do next]
Rule: Never blame the user. Never use "invalid" without explaining what makes it invalid.

### Authentication errors
```
Wrong password/email:   "Incorrect email or password. Check both and try again."
Account locked:         "Account temporarily locked after too many failed attempts.
                         Try again in 30 minutes, or reset your password."
Token expired:          "Your session has expired. Sign in again to continue."
Token invalid:          "This link has expired or already been used. Request a new one."
OAuth failed:           "We couldn't sign you in with GitHub. Try again, or use email instead."
Email not verified:     "Verify your email first. Check your inbox for the verification link."
```

### Form validation errors
```
Email format:           "Enter a valid email address."
Password too short:     "Password must be at least 12 characters."
Passwords don't match:  "Passwords don't match. Re-enter your new password."
Required field:         "This field is required."
Team name taken:        "That team name is already taken. Try a different one."
```

### API / system errors
```
403 Forbidden:          "You don't have permission to do that. Ask your team admin if you need access."
404 Not found:          "We couldn't find what you were looking for. It may have been deleted."
429 Rate limited:       "Too many requests. Wait a moment and try again."
500 Server error:       "Something went wrong on our end. We've been notified. Try again in a few minutes."
503 Unavailable:        "CodeMind is briefly unavailable. We're working on it. Check status.codemind.dev."
Stripe error:           "We couldn't process your payment. Check your card details, or try a different card."
Stripe unavailable:     "Payment processing is temporarily unavailable. Try again in a few minutes."
```

### API key errors
```
Key revoked:            "This API key has been revoked. Create a new one in your dashboard."
Key scope denied:       "This API key doesn't have permission for this action."
Key not found:          "API key not found. It may have been revoked."
```

================================================================================
## Loading States
================================================================================

Never use generic "Loading..." — always describe what is loading.

```
Fetching subscription:  "Loading your plan..."
Loading team members:   "Loading team..."
Saving settings:        "Saving..."
Creating API key:       "Creating key..."
Revoking API key:       "Revoking..."
Sending invite:         "Sending invite..."
Processing payment:     "Processing payment..."
Cancelling:             "Cancelling subscription..."
Exporting data:         "Preparing your data export..."
```

================================================================================
## CLI Copy — Help Text + Prompts
================================================================================

### First-run telemetry prompt
```
Help improve CodeMind? Send anonymous usage data.
No code, no file paths, no personal data — only feature usage counts.

  [Y] Yes, help improve CodeMind
  [n] No thanks

You can change this any time in ~/.codemind/config.yaml
```

### Pre-commit hook install prompt
```
Install the CodeMind pre-commit hook?
Runs `codemind check` on staged files before every commit.
The hook never blocks your commit — it warns, then exits 0.

  [Y] Install hook
  [n] Skip for now
```

### Index success
```
  ✓ Index complete
    1,247 nodes · 8,432 edges · 94% completeness · 4.8s
    6% of call sites unresolved (event emitters, DI) — run with --verbose for detail
```

### Index warning (low completeness)
```
  ⚠ Index complete with gaps
    1,247 nodes · 68% completeness
    High number of dynamic call sites detected. Results may undercount blast radius.
    Declare dynamic connections in .codemind/connections.yaml to improve accuracy.
    Run: codemind --help connections
```

### Check — no changes staged
```
  No staged files. Stage changes with `git add` before running `codemind check`.
```

### Graph stale warning
```
  ⚠ Graph is 8 days old. Results may not reflect recent changes.
  Run `codemind index` to refresh.
```

### Deep analysis limit reached (CLI)
```
  ✗ Deep analysis limit reached (50/50 this month).
  Upgrade to Pro for 50 calls/month: codemind.dev/upgrade
  Or run `codemind check` without --think for instant local analysis.
```

### Offline mode notice
```
  (offline) No network connection. Running local analysis only.
  Deep analysis (--think) requires a connection. All other features work offline.
```

================================================================================
## Email Templates
================================================================================

From name:      CodeMind
From address:   hello@codemind.dev (transactional), noreply@codemind.dev (receipts)
Tone:           Direct + warm. Shorter than you think. Developers skim emails.

### Welcome email (on registration)
```
Subject:   "Welcome to CodeMind"
Body:
Hi,

You're all set. Here's how to get started in 3 minutes:

1. Install the CLI:
   npm install -g codemind

2. Index your repo:
   cd your-project && codemind index

3. Run your first check:
   codemind check src/authService.ts

That's it. The pre-commit hook is optional but recommended:
   codemind --install-hook

Questions? Reply to this email.

— The CodeMind team
```

### Team invite email
```
Subject:   "[inviter name] invited you to [team name] on CodeMind"
Body:
Hi,

[inviter name] has invited you to join the [team name] team on CodeMind.

[Accept invitation →]  (button)

This invite expires in 7 days. If you don't have a CodeMind account, you'll
create one when you accept.

If you weren't expecting this, ignore this email.

— The CodeMind team
```

### Password reset email
```
Subject:   "Reset your CodeMind password"
Body:
Hi,

Someone requested a password reset for this email address.

[Reset password →]  (button, expires in 1 hour)

If you didn't request this, your account is safe — ignore this email.

— The CodeMind team
```

### Payment receipt
```
Subject:   "CodeMind receipt for [Month Year]"
Body:
Hi,

Your payment of $[amount] for CodeMind [Pro|Team] has been processed.

Plan:       [Pro|Team]
Amount:     $[amount]
Date:       [date]
Invoice:    [invoice number]

View full invoice: [link]
Manage billing: codemind.dev/billing

— The CodeMind team
```

### Trial ending (3 days before)
```
Subject:   "Your CodeMind trial ends in 3 days"
Body:
Hi,

Your free trial ends on [date]. After that, you'll move to the Free plan
unless you upgrade.

Free plan limits:
  • 5 deep analysis calls per month (down from unlimited during trial)
  • No team features

[Keep Pro →]  (button)

If you're happy with the Free plan, no action needed.

— The CodeMind team
```

### Usage limit warning (80% used)
```
Subject:   "You've used 80% of your deep analysis calls"
Body:
Hi,

You've used [X] of your [Y] deep analysis calls this month.

Deep analysis runs when you use `codemind check --think`. It gives you
Opus-powered blast radius insights beyond what the fast check provides.

[Upgrade to Pro →]  (if on Free)
[View usage →]      (if on Pro)

Your limit resets on [reset date].

— The CodeMind team
```

================================================================================
## AI Output Attribution Copy (CV-004 — COUNSEL requirement)
================================================================================

All CLI sections enriched by AI must use this exact prefix. See DESIGN-SYSTEM.md CLI section.

```
"✦ AI analysis  (Claude [model-id])"
```

Web dashboard equivalent (for any AI-generated content):
```
Label: "✦ AI-enhanced"
Tooltip: "This analysis was generated by Claude claude-opus-4-7. Results are advisory.
          Confidence is capped at 80%. Verify critical findings before acting."
```

================================================================================
## QUILL VETO CHECKLIST (BUILDER pre-flight)
================================================================================

Before any UI string or CLI message ships, confirm:

[ ] Button label is verb + specific outcome (not "Submit", "OK", "Yes")
[ ] Error message: explains what happened + what to do next
[ ] Empty state: illustration hint + explanation + primary action CTA
[ ] Loading state: describes what is loading (not just "Loading...")
[ ] Terminology matches CANONICAL TERMINOLOGY table above
[ ] AI-generated sections use the ✦ attribution prefix
[ ] No placeholder, lorem ipsum, or "TODO: copy" text in any deliverable

================================================================================
# END OF CONTENT-GUIDE.md
# Gate: CONTENT complete.
# Next gate: RUNBOOK (DOCTOR) → runbooks/ directory
================================================================================
