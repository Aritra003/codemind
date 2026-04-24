# PIPELINE-PROFILES.md — Lifecycle Overview
# Load: Read(".claude/modes/PIPELINE-PROFILES.md") for profile selection and graduation paths.
# Purpose: onboarding map only. No gates, no checklists, no execution content.
#          For execution detail: load the owning pipeline file for your profile.
# Author: Ashish Khandelwal, Arup Kolay | Apex Runtime v1.5
================================================================================

## PROFILE SELECTION — which file to load given your situation

```
No CONTEXT.md + no src/ exists
  └─ GREENFIELD codebase
       └─ Full system going to production?    → PRODUCTION profile
          Load: GREENFIELD-PIPELINE.md → PIPELINE HEADER section
          Then: MODE: [name] section per gate
       └─ Exploratory / time-constrained?     → Use FAST-START SKIP SET
          Load: GREENFIELD-PIPELINE.md → FAST-START SKIP SET section
          Log a GATE SKIP entry per deferred gate. Same pipeline, documented skips.

No CONTEXT.md + src/ exists + no Apex artefacts (no ARCHITECTURE.md or no .claude/)
  └─ BROWNFIELD codebase (not built by Apex)
       └─ Single path — no profiles          → BROWNFIELD pipeline
          Load: BROWNFIELD.md

No CONTEXT.md + src/ exists + Apex artefacts present
  (ARCHITECTURE.md exists AND .claude/ folder present)
  └─ APEX-BUILT codebase
       └─ Adding a new feature?              → FEATURE profile
          Load: APEX-BUILT.md → PROFILE: FEATURE section
       └─ Fixing a P0/P1 production issue?  → HOTFIX profile
          Load: APEX-BUILT.md → PROFILE: HOTFIX section

CONTEXT.md exists
  └─ Read Pipeline profile field → load accordingly
       PRODUCTION → GREENFIELD-PIPELINE.md (standard lazy-load)
       FEATURE    → APEX-BUILT.md → PROFILE: FEATURE section
       HOTFIX     → APEX-BUILT.md → PROFILE: HOTFIX section
```

================================================================================
## PROFILE SUMMARY

| Profile | Codebase | File | When |
|---|---|---|---|
| PRODUCTION | GREENFIELD | GREENFIELD-PIPELINE.md | New system going to production |
| FAST-START | GREENFIELD | GREENFIELD-PIPELINE.md + skip set | Exploratory / time-constrained build |
| BROWNFIELD | Non-Apex src/ | BROWNFIELD.md | Unknown/legacy codebase |
| FEATURE | APEX-BUILT | APEX-BUILT.md | Incremental addition to Apex system |
| HOTFIX | APEX-BUILT | APEX-BUILT.md | P0/P1 production fix |

================================================================================
## GRADUATION PATHS BETWEEN STATES

**GREENFIELD → APEX-BUILT**
A GREENFIELD / PRODUCTION build graduates to APEX-BUILT automatically once
LAUNCH-READY is passed and the system has production users.
No explicit graduation step needed — the codebase now has ARCHITECTURE.md and
.claude/ folder, which satisfies the APEX-BUILT detection criteria.
Next session after first production deploy: SESSION STARTUP detects APEX-BUILT.
Set Pipeline profile to FEATURE for subsequent feature work.

**FAST-START (exploratory) → APEX-BUILT**
A fast-start build is NOT production-ready by definition.
To graduate to APEX-BUILT FEATURE for production work:
1. TITAN reviews the build and determines if BROWNFIELD INTAKE is needed.
   - If the exploratory build is well-structured and close to Apex conventions:
     run outstanding DEFERRED skips (those with trigger "before first production user"),
     then treat as APEX-BUILT FEATURE from that point.
   - If the exploratory build is poorly structured or has significant gaps:
     run BROWNFIELD INTAKE on your own codebase, then proceed as APEX-BUILT.
2. TITAN documents the graduation decision in ARCHITECTURE.md DECISIONS LOCKED.
Hard rule: a fast-start build cannot silently become production. Graduation requires
TITAN sign-off. "We'll clean it up later" is not a graduation path.

**BROWNFIELD → APEX-BUILT**
A BROWNFIELD codebase graduates to APEX-BUILT once:
1. COMPLIANCE-GAP TIER 3 is complete (all new code meets full Apex standards)
2. ARCHITECTURE.md has been produced (TITAN during INTAKE or post-INTAKE)
3. TITAN formally documents the graduation in ARCHITECTURE.md DECISIONS LOCKED:
   `[ISO date] graduation: codebase meets APEX-BUILT criteria — FEATURE profile active`
After graduation: subsequent feature work uses APEX-BUILT FEATURE profile.
BROWNFIELD-DEBT mode continues running until TECH-DEBT.md is cleared.

================================================================================
## WHICH LAUNCH-READY APPLIES

| Profile | Launch gate |
|---|---|
| PRODUCTION | Full LAUNCH-READY.md — all 13 agent sign-offs required |
| FEATURE | Full LAUNCH-READY.md — all 13 agent sign-offs required |
| HOTFIX | COMPRESSED-LAUNCH-READY — 3 pre-deploy + 10 post-deploy within 24h |
| FAST-START | No LAUNCH-READY until DEFERRED skips resolved and graduation complete |
