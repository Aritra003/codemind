# MEMORY-TRIAGE.md — Memory Triage Algorithm
# Load: Read(".claude/reference/MEMORY-TRIAGE.md") at every session-end compression
# Referenced from: CLAUDE.md footer
# Run this algorithm whenever CONTEXT.md approaches 180 lines or at natural session end.
================================================================================

## Why This Exists

Without a deterministic triage algorithm, compression is a judgement call. Judgement calls
under time pressure produce inconsistent results: important architectural decisions get
archived, trivial session notes survive, and the system suffers "decision amnesia" — the
failure mode where a LOCKED decision gets re-litigated two sprints later because nobody
can find where it was recorded.

This algorithm removes the judgement call. Every item has a deterministic fate.

---

## THE TRIAGE ALGORITHM

Run in this exact order at session end. Do not skip steps. Do not reorder.

---

### STEP 0 — Assess Context Budget Before Compressing

Before running the triage algorithm, check whether compression is the right action
or whether a new session would serve better.

```
Current estimated token load (from CONTEXT.md SESSION CONTEXT BUDGET):  ~[n]K / 200K
Budget status: [GREEN | YELLOW | RED]
```

**If GREEN (<40%):** compression is not needed. Run triage only if CONTEXT.md >220 lines.

**If YELLOW (40–70%):** run triage now. Compression will recover headroom.
After compression: update SESSION CONTEXT BUDGET status to GREEN if CONTEXT.md is now <120 lines.
Write LAST SESSION SUMMARY. Recommend new session before the next major task.

**If RED (>70%):** do NOT attempt full triage — it requires loading additional context to evaluate
items, which worsens the problem. Instead:
1. Write LAST SESSION SUMMARY immediately (requires no additional file loads)
2. Write one line to CONTEXT.md: `COMPRESSION DEFERRED — context RED at [ISO date]. Resume in new session.`
3. Release any open DEPENDENCY LOCKS
4. Stop. The next session will begin fresh and run full triage in STEP 1–6.

---

### STEP 1 — Promote Decisions to LOCKED

**Trigger:** any item in `DECISIONS THIS SESSION` that meets ALL three criteria:
1. Has been acted on (code was written based on it, or an ADR references it)
2. Has not been contradicted by a later decision in the same session
3. Would cause significant rework if reversed without warning

**Action:** write to `ARCHITECTURE.md → DECISIONS LOCKED section` (not CONTEXT.md).
CONTEXT.md carries only a pointer to ARCHITECTURE.md for DECISIONS LOCKED.
Create corresponding ADR in docs/adr/ if one doesn't exist (TITAN responsibility).

**Do NOT promote if:**
- Decision is tentative ("we might use X")
- Decision has a stated review trigger that hasn't been hit yet
- Decision was overridden by a later REQUIREMENT CHANGELOG entry in the same session

**Promotion format in ARCHITECTURE.md DECISIONS LOCKED:**
```
[ISO date] [domain]: [decision in one line]
Rationale: [one sentence — why this was chosen over alternatives]
ADR: docs/adr/[NNN]-[slug].md | Reversibility: [easy | hard | irreversible]
```

---

### STEP 2 — Write Knowledge Base Entries

**Trigger — MANDATORY KB entry (write before session ends):**
- Any P0 or P1 incident was resolved this session
- BREAKER found a FAIL on something BUILDER rated HIGH confidence (confidence miscalibration)
- A bug was discovered that was caused by a missing or wrong assumption about a library/schema
- A security vulnerability was found (even if resolved)
- A refactor revealed a systemic pattern (e.g. "the DB layer had N+1 queries in 4 places")

**Trigger — CONDITIONAL KB entry (write if >30 min of session time was spent on it):**
- A non-obvious solution was found for a recurring class of problem
- An integration behaved differently than documented (hallucination trap for future sessions)
- A performance optimisation had unexpected upstream effects

**KB entry format:**
```
[SEVERITY: CRITICAL|HIGH|MED|LOW] [domain-tag] [date]
Lesson:  [what was learned — one sentence]
Pattern: [reusable principle — one sentence, generalisable beyond this project]
Trigger: [what situation should prompt a BUILDER to re-read this entry]
Source:  [incident ID | session date | post-mortem ref]
Status:  [ACTIVE | STABLE | RESOLVED]  ← optional; default ACTIVE
```

**For CRITICAL severity and entries tagged [security], [auth], [payments], [pii]:**
Write to KNOWLEDGE-BASE.md as normal. These entries will graduate to KNOWLEDGE-ARCHIVE.md
after 3 sprints, where they are kept permanently. Do not write directly to
KNOWLEDGE-ARCHIVE.md from Step 2 — all new entries enter through the working reference first.

**What does NOT go into the KB:**
- Routine decisions (these go in DECISIONS LOCKED or ADRs)
- Project-specific trivia with no generalisation value
- Observations that are already covered by an existing KB entry (update, don't duplicate)

---

### STEP 3 — Triage ISSUES OPEN (max 10)

Apply this scoring to every open issue. Keep top 10 by score. Archive the rest.

**Scoring formula (calculate for each issue):**
```
Score = (severity_weight × 3) + (recency_weight × 2) + (blocking_weight × 4)

severity_weight:  P0=4 | P1=3 | P2=2 | P3=1
recency_weight:   opened this session=3 | opened this sprint=2 | older=1
blocking_weight:  blocks current work=2 | blocks next sprint=1 | future=0
```

**Keep:** top 10 by score. If tie: prefer higher severity.
**Archive to CONTEXT-ARCHIVE.md:** everything below rank 10.
**Delete (do not archive):** issues marked RESOLVED this session.

**Archive format:**
```
## ARCHIVED [ISO date]
[original issue entry]
Archive reason: [score below cutoff | resolved | superseded by #N]
```

---

### STEP 4 — Compress RECENTLY COMPLETED

**Keep:** last 5 completed items. Archive the rest.
**Archive trigger:** any item beyond position 5 in the list.

Before archiving, check: does this completed item need a KB entry (per Step 2 criteria)?
If yes: write the KB entry first, then archive the completion record.

**Archive format:**
```
## COMPLETED ARCHIVE [ISO date of archival]
[original completion entry]
```

---

### STEP 5 — Update REQUIREMENT CHANGELOG Status

For each ACTIVE entry in the REQUIREMENT CHANGELOG:

**Promote to IMPLEMENTED** if:
- The code change it describes has been built, tested (Tier 2 green), and committed
- Format: change `Status: ACTIVE` → `Status: IMPLEMENTED [ISO date]`
- Then immediately archive: move the entry to CONTEXT-ARCHIVE.md under
  `## REQUIREMENT CHANGELOG ARCHIVE [ISO date]` in the same compression pass.
  Remove it from CONTEXT.md. The audit trail is preserved in the archive — not in
  the working file. CONTEXT.md holds only ACTIVE entries.

**Keep as ACTIVE** if:
- The change is still in progress or not yet reflected in code
- The change affects future work in this sprint

**Flag as CONFLICTED** if:
- A subsequent REQUIREMENT CHANGELOG entry contradicts this one
- Format: `Status: CONFLICTED — superseded by entry [ISO date of newer entry]`
- Surface conflict to human if the conflicted entry had already been IMPLEMENTED
  (this means previously built code may need revision)

---

### STEP 6 — Validate Final CONTEXT.md Size

After running Steps 1–5, count the lines in CONTEXT.md.

**If >220 lines:**
Re-run the triage more aggressively:
- Reduce ISSUES OPEN to 7 (not 10)
- Collapse RECENTLY COMPLETED to 3
- Condense multi-line decision entries to single lines

**If still >220 lines after second pass:**
Archive the entire current CONTEXT.md to CONTEXT-ARCHIVE.md with today's date as header,
then write a fresh CONTEXT.md containing only:
- Phase/Agent/Pipeline profile/QUALITY_GATES/Production owner header block
- SESSION CONTEXT BUDGET (reset estimates)
- DECISIONS LOCKED pointer (one line — no content, just the pointer to ARCHITECTURE.md)
- All ACTIVE REQUIREMENT CHANGELOG entries (these drive current work)
- Top 5 ISSUES OPEN by score
- Next 3 actions
- LAST SESSION SUMMARY

This is the "hard reset" path. It should be rare if Steps 1–5 are run consistently.

---

## DECISION PROMOTION DECISION TREE

```
Is this decision acted on (code written or ADR exists)?
  └─ NO  → Keep in DECISIONS THIS SESSION. Do not promote yet.
  └─ YES → Has it been contradicted this session?
              └─ YES → Discard the earlier version. Keep only the final state.
              └─ NO  → Would reversing it without warning cause >2h of rework?
                          └─ NO  → Keep in DECISIONS THIS SESSION. Review next session.
                          └─ YES → PROMOTE TO DECISIONS LOCKED + create/update ADR.
```

---

## BUG FIX → KB ENTRY DECISION TREE

```
Was a bug fixed this session?
  └─ NO  → Skip
  └─ YES → Was it caused by a wrong assumption about external behaviour
           (library, API, schema, ORM, framework)?
              └─ YES → MANDATORY KB entry [HIGH] tagged [domain, hallucination-trap]
              └─ NO  → Was it a logic error that took >30 min to find?
                          └─ YES → CONDITIONAL KB entry [MED] tagged [domain]
                          └─ NO  → Was it a security issue of any severity?
                                      └─ YES → MANDATORY KB entry [HIGH] tagged [security, domain]
                                      └─ NO  → No KB entry needed. Close the issue.
```

---

## STEP 7 — Sprint Boundary Merge (multi-developer only)

**Trigger:** when a feature branch is merged to main/trunk via PR.
**Skip entirely** for solo developer projects — this step does not apply.
**Run after** Steps 1–6 on the branch context file.

The goal is to produce a clean root CONTEXT.md that reflects the merged state of all
parallel work, without silently overwriting any developer's decisions or findings.

Work through each section in this exact order:

---

**REQUIREMENT CHANGELOG**
Merge both branches' changelogs by date order (oldest entry first).
For each entry: check if any entry in the other branch's changelog contradicts it
on the same feature area. Contradiction = same requirement, different resolution.
If contradiction found:
  Flag: `MERGE CONFLICT — REQUIREMENT: [description] | Branch A: [value] | Branch B: [value]`
  Surface to ORACLE before proceeding. ORACLE resolves which version is authoritative.
  Do not pick a winner automatically. Do not proceed with a conflict open.

---

**DECISIONS LOCKED**
Take the union of all DECISIONS LOCKED from both branches.
For each decision present in both branches with different values:
  Flag: `MERGE CONFLICT — DECISION: [key] | Branch A: [value] | Branch B: [value]`
  Surface to TITAN immediately. This is an architectural conflict — requires an ADR.
  Block the PR merge until TITAN produces the ADR.
For decisions present in only one branch: promote directly to ARCHITECTURE.md DECISIONS LOCKED.
Note: DECISIONS LOCKED live in ARCHITECTURE.md, not in root CONTEXT.md.

---

**DECISIONS THIS SESSION**
Apply Step 1 promotion criteria to every entry from both branches independently.
Promote qualifying entries to DECISIONS LOCKED. Discard the rest.
Never merge raw session decisions directly into DECISIONS LOCKED without Step 1 criteria.
Merging "decided to use JWT" from a session into DECISIONS LOCKED requires it to meet
all three criteria: acted on + not contradicted + reversal costs >2h rework.

---

**ISSUES OPEN**
Combine both branches' ISSUES OPEN lists into one list.
Re-score every item using the triage formula: (severity×3) + (recency×2) + (blocking×4).
Keep top 10 in root CONTEXT.md. Archive the rest to CONTEXT-ARCHIVE.md.
Mark any issue that was resolved on the merging branch as RESOLVED with date.

---

**AGENT QUALITY METRICS**
Aggregate the counts across both branches for the merged sprint:
  VERIFY pass rate:  weighted average — (branch A passes + branch B passes) / (total runs both)
  Miscalibrations:   sum of both branches
  KB entries:        sum of both branches
  Bug escapes:       sum of both branches
Apply threshold rules from CONTEXT.md after aggregation — the merged totals may trigger
DEBT-AUDIT or LOW confidence adjustments that neither branch triggered alone.

---

**EXECUTION PLAN**
Discard the merging branch's EXECUTION PLAN entirely — it was specific to that feature.
Root EXECUTION PLAN is not updated at merge time.
The next PLANNER session for a new feature writes a fresh EXECUTION PLAN from scratch.

---

**DEPENDENCY LOCKS**
Verify: the merging branch has zero open DEPENDENCY LOCKS before PR is allowed to merge.
Open locks at merge time = a file in an inconsistent state. Block the merge.
After verifying all locks released: no DEPENDENCY LOCK entries from the branch carry
into root CONTEXT.md.

---

**SESSION-SCOPED SECTIONS (discard)**
These sections are branch- and session-scoped. Do not merge into root CONTEXT.md:
  LAST SESSION SUMMARY | SESSION CONTEXT BUDGET | COMPLIANCE-REPORT NOTES
  Phase | Agent | Files done | File in progress | Blocked on | Next 3 actions

---

**Branch context archival**
After completing Steps 1–6 above:
1. Prepend to CONTEXT-{feature}.md: `# ARCHIVED: PR #[N] merged [ISO date]`
2. Append the full CONTEXT-{feature}.md to CONTEXT-ARCHIVE.md
3. Delete CONTEXT-{feature}.md from the branch
4. The root CONTEXT.md now reflects the clean merged state

---

## KB COMPRESSION (SCHOLAR runs quarterly, or when KNOWLEDGE-BASE.md >180 lines)

Purpose: keep KNOWLEDGE-BASE.md as a usable working reference (<200 lines).
         Permanent entries graduate to KNOWLEDGE-ARCHIVE.md — not accumulated here.

### Step A — Graduate stable entries to KNOWLEDGE-ARCHIVE.md

An entry graduates when ALL three conditions are true:
1. It has been in KNOWLEDGE-BASE.md for ≥2 sprints (not new)
2. Its pattern is now actively applied — no new surprises from this class of issue
3. It is not an open, unresolved vulnerability or active regression risk

Graduation does NOT apply to:
- Entries tagged [security], [auth], [payments], [pii] still being actively modified
  on this project (keep in working reference while relevant code is changing)
- CRITICAL entries raised in the last 3 sprints (too recent to be stable)
- Any entry explicitly marked `Status: ACTIVE` by the writing agent

After 3 sprints: ALL CRITICAL and security-tagged entries graduate regardless of
active-modification status. They are kept permanently in KNOWLEDGE-ARCHIVE.md.

Graduation procedure:
1. Copy the full entry to KNOWLEDGE-ARCHIVE.md under `## ARCHIVED ENTRIES`
2. Append `Graduated: [ISO date]` to the entry's Source line in the archive
3. Add one line to ARCHIVE INDEX: `[SEVERITY] [domain] [date] | [lesson summary] | Line: [N]`
4. Delete the entry from KNOWLEDGE-BASE.md

### Step B — Merge same-pattern entries in working reference

Within each domain tag: identify entries describing the same root cause or pattern.
Merge into one consolidated entry using the merge format below.
Retain the most recent date. List superseded dates in Sources.
A merged entry replaces the originals — do not keep both.

**Merge format:**
```
[SEVERITY] [domain] [original date – latest date]
Lesson:    [merged lesson covering all related entries]
Pattern:   [single generalised principle]
Trigger:   [combined trigger conditions]
Sources:   [list of original source refs]
Supersedes: [list of entry dates merged into this one]
Status:    STABLE
```

### Step C — Remove resolved LOW entries

Any [LOW] entry confirmed resolved and not recurred in 2 sprints: delete from working
reference. Do not archive — the pattern was not important enough.
If uncertain: keep. Deletion is irreversible in the working reference.

### Step D — Validate size

Target: KNOWLEDGE-BASE.md <160 lines after compression.
If still >180 lines after Steps A–C:
  Graduate more aggressively — any entry ≥1 sprint old that meets conditions 1 and 3
  (even if condition 2 is uncertain) graduates to the archive.
If target still not met: the project has an unusually high lesson accumulation rate.
  Raise the working reference cap to 250 lines for this project.
  Do not force graduation of entries that are genuinely still needed.

### KB entry STATUS field (optional — added to MEMORY-TRIAGE Step 2 format)

Adding `Status:` to entries helps SCHOLAR make graduation decisions:
  ACTIVE:   still directly relevant — do not graduate yet
  STABLE:   pattern is understood and applied — ready to graduate
  RESOLVED: issue is fixed, no recurrence expected — candidate for deletion (LOW) or graduation
