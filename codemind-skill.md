# CodeMind — Claude Code Skill

> This skill teaches Claude Code when and how to use CodeMind's MCP tools for codebase analysis.
> Install: `codemind setup` auto-places this at `.claude/skills/codemind.md`

## Available Tools

| Tool | What It Does | When to Use |
|---|---|---|
| `codemind_status` | Check if the code index exists and is current | Before any other CodeMind tool |
| `codemind_impact` | Analyze blast radius of a code change | Before committing or pushing shared code |
| `codemind_drift` | Compare an architecture diagram to actual code | When reviewing or planning architecture changes |
| `codemind_forensics` | Trace a production error to its root-cause commit | When debugging errors that aren't immediately obvious |

## Decision Rules

### Always run `codemind_status` first
Before calling any other CodeMind tool, check that the index exists and is fresh. If status reports the index is older than 7 days, suggest the developer run `codemind reindex` before proceeding.

### When to use `codemind_impact`
USE when:
- Developer is modifying shared code (utilities, middleware, services, core modules, API endpoints)
- Developer is changing files that have high caller counts
- Developer asks "what will break if I change this?"
- Developer is preparing a PR for review
- A file being edited has caused incidents before (check historical_context in results)

SKIP when:
- Changes are limited to test files, documentation, or config with no code callers
- The change is adding a new file that nothing depends on yet
- Developer explicitly says the change is trivial

HOW to call:
```
codemind_impact({ file_path: "src/auth/middleware.ts" })
```
Or omit file_path to analyze all currently staged git changes.

HOW to interpret:
- LOW (0-30): Safe. Mention the score briefly, don't slow the developer down.
- MEDIUM (31-60): Call out specific coverage gaps and suggest which tests to write. Developer can proceed.
- HIGH (61-80): Strongly recommend writing tests first. Show the failure scenarios from the analysis. Ask for confirmation before proceeding.
- CRITICAL (81-100): Do not proceed without explicit developer confirmation. Present the full blast radius report, coverage gaps, and historical context. Recommend staged deployment.

### When to use `codemind_drift`
USE when:
- An architecture diagram is referenced or uploaded in the conversation
- Developer asks "how does our system actually work?" or "is this diagram accurate?"
- Planning a major refactor and need to understand actual service topology
- Onboarding context — understanding how services connect

SKIP when:
- Question is about a single file or function (use normal code reading instead)
- No architecture diagram is available as an image file

HOW to call:
```
codemind_drift({ image_path: "/path/to/architecture.png", scope: "src/services/" })
```
The image_path must point to a file on disk (PNG, JPG, or PDF). Scope is optional.

HOW to interpret:
- Lead with the accuracy percentage: "Your diagram is 62% accurate."
- Highlight phantom connections (shown in diagram but don't exist in code) — these represent outdated assumptions the team is acting on.
- Highlight missing connections (exist in code but not in diagram) — these represent undocumented dependencies.
- Offer to output the corrected Mermaid diagram.

### When to use `codemind_forensics`
USE when:
- Developer pastes an error message or stack trace
- Production incident investigation is happening
- Developer asks "what caused this?" or "when did this break?"
- The root cause isn't immediately obvious from the stack trace alone

SKIP when:
- Error has an obvious cause (missing env var, typo, syntax error)
- Error is from a dependency, not from the team's own code
- Developer already knows the cause and just needs help fixing it

HOW to call:
```
codemind_forensics({ error_message: "TypeError: Cannot read property 'token' of undefined", lookback_days: 14 })
```
Provide the full error message and stack trace if available.

HOW to interpret:
- Focus on the highest-confidence probable cause commit
- Present the causal chain as a NARRATIVE, not raw data: "Commit abc123 by Sarah on April 20 changed the token validation logic. This invalidated the session cache, which caused the payment webhook to timeout."
- Always include the prevention recommendation: what test would have caught this?
- If confidence is below 50%, say so explicitly — don't present speculation as certainty.

## Constraints

- All CodeMind tools query a LOCAL index on the developer's machine. No data is sent externally except to the Claude API for reasoning.
- The index must exist. If `codemind_status` returns an error, guide the developer to run `codemind setup` first.
- `codemind_drift` requires an image file on disk. It cannot process URLs or images from the conversation context.
- `codemind_forensics` works best with recent git history. Default lookback is 14 days. Increase with `lookback_days` if the incident may be older.
- Graph traversal depth defaults to 4. For very large repos, reduce to 2-3 to keep response times under 5 seconds.

## Example Conversation Patterns

**Pattern 1: Pre-commit check**
Developer: "I just refactored the auth module, is it safe to push?"
→ Call `codemind_status` → if fresh, call `codemind_impact` with the auth file → present risk analysis

**Pattern 2: Architecture review**  
Developer: "Here's our architecture diagram, is it still accurate?" (uploads image)
→ Call `codemind_drift` with the image path → present accuracy score and divergences

**Pattern 3: Incident investigation**
Developer: "Production is returning 500 errors on the payment endpoint, here's the stack trace: ..."
→ Call `codemind_forensics` with the error → present causal chain and prevention steps

**Pattern 4: Planning a refactor**
Developer: "I want to replace our session management. What's the impact?"
→ Call `codemind_impact` on the session management files → if HIGH/CRITICAL, also call `codemind_drift` to see if the architecture diagram reflects the actual session flow
