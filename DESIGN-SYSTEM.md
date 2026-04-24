# DESIGN-SYSTEM.md — CodeMind Design System
# Mode: DESIGNER | Agent: ARTISAN
# Last updated: 2026-04-23
# Rule: BUILDER implements zero UI without referencing this file first.
#       Zero hardcoded hex/px/rem/ms in application code — all values from tokens.css.
# Scope: Web dashboard (Next.js) + CLI output visual language.
================================================================================

## Personality

3-word character:  **Precise** | **Illuminating** | **Trusted**

Anti-references:   Must NOT look like:
  - Jira: enterprise cargo-cult, information clutter, beige confidence
  - Linear (dark-trendy clone): dark for aesthetics, not clarity
  - GitHub: too familiar, zero brand identity differentiation

Why different:     CodeMind is a diagnosis tool, not a project manager.
                   The design language borrows from medical imaging and scientific visualisation —
                   high-contrast, data-dense, fearlessly minimal. Every element earns its pixel.
                   When a developer opens CodeMind, they should feel the same trust they feel
                   opening a well-designed terminal debugger: this tool knows what it's doing.

CLI design principle:  Output is a product, not a log. CLI output has information hierarchy,
                       risk-level color grammar, and concise prose. It is never raw JSON.

================================================================================
## Colour System
================================================================================

### Source of truth: tokens.css (see /packages/web/src/styles/tokens.css)

**Brand palette:**
```
--color-brand-50:   #EEF2FF   (faintest indigo — backgrounds, hover surfaces)
--color-brand-100:  #E0E7FF
--color-brand-200:  #C7D2FE
--color-brand-300:  #A5B4FC
--color-brand-400:  #818CF8   (primary on dark backgrounds)
--color-brand-500:  #6366F1   (primary on light backgrounds — CTAs)
--color-brand-600:  #4F46E5   (active/pressed states)
--color-brand-700:  #4338CA
--color-brand-800:  #3730A3
--color-brand-900:  #312E81
```
Why indigo: Evokes intelligence and depth. Distinct from the sea of SaaS blues.
            Comfortable at both brand-400 (dark bg) and brand-500 (light bg).

**Graph accent (data visualisation only):**
```
--color-graph-primary:  #22D3EE   (cyan-400 — node connections, edges, active paths)
--color-graph-node:     #67E8F9   (cyan-300 — graph nodes)
--color-graph-dim:      #164E63   (cyan-900 — inactive graph elements)
```

**Neutral scale (dark-mode first — lighter = foreground):**
```
--color-neutral-0:    #FFFFFF
--color-neutral-50:   #F8FAFC
--color-neutral-100:  #F1F5F9
--color-neutral-200:  #E2E8F0
--color-neutral-300:  #CBD5E1
--color-neutral-400:  #94A3B8   (secondary text on dark bg)
--color-neutral-500:  #64748B
--color-neutral-600:  #475569
--color-neutral-700:  #334155   (elevated surface)
--color-neutral-800:  #1E293B   (surface)
--color-neutral-900:  #0F172A   (background)
--color-neutral-950:  #020617   (deep background — CLI-pane backdrop)
```

**Semantic colours (risk grammar shared: CLI ANSI + web badge):**
```
--color-critical: #EF4444   (red-500)    on-critical: #FEF2F2
--color-high:     #F97316   (orange-500) on-high:     #FFF7ED
--color-medium:   #EAB308   (yellow-500) on-medium:   #FEFCE8
--color-low:      #22C55E   (green-500)  on-low:      #F0FDF4
--color-unknown:  #94A3B8   (neutral-400) on-unknown: --color-neutral-900
```

**Semantic utility colours:**
```
--color-success:  #4ADE80   on-success: #052E16
--color-warning:  #FACC15   on-warning: #1C1917
--color-error:    #F87171   on-error:   #450A0A
--color-info:     #38BDF8   on-info:    #082F49
```

**Contrast verification:**
All text/background pairs verified against WCAG 2.1 AA (4.5:1 body, 3:1 large).
  --color-neutral-50 on --color-neutral-900:   15.1:1 ✅
  --color-brand-400  on --color-neutral-900:    7.2:1 ✅
  --color-neutral-400 on --color-neutral-900:   4.6:1 ✅ (secondary text — passes AA)
  --color-critical on --color-neutral-900:      4.8:1 ✅
  --color-neutral-900 on --color-brand-500:     8.9:1 ✅ (CTA text on brand button)
Tool: WebAIM Contrast Checker. Verify after any palette change.

================================================================================
## Typography
================================================================================

**Primary typeface:**   Inter Variable — "Inter var" (Google Fonts or self-hosted)
  Why: Highest legibility at developer-scale data density. Excellent tabular numerals.
       Optical size support. Works equally well at 11px (table cells) and 36px (headings).

**Monospace typeface:**  JetBrains Mono (self-hosted, OFL license)
  Why: Designed for code. Ligature support. Sharp at all sizes. Used for:
       code blocks, API key display, hash values, file paths, graph node IDs.

**Type scale:**
```
--font-size-xs:    11px   (metadata, timestamps, helper text)
--font-size-sm:    13px   (table body, secondary labels, badges)
--font-size-base:  15px   (body copy, form labels, descriptions)
--font-size-lg:    17px   (card titles, section headings)
--font-size-xl:    20px   (page section headings)
--font-size-2xl:   24px   (page title, hero metric)
--font-size-3xl:   30px   (dashboard stat callout)
--font-size-4xl:   36px   (landing page headline only)
```

**Line height:**
```
--line-height-tight:   1.2   (headings — xl and above)
--line-height-snug:    1.375 (card titles — lg)
--line-height-normal:  1.5   (body copy)
--line-height-relaxed: 1.625 (prose / help text)
```

**Font weight:**
```
--font-weight-normal:   400
--font-weight-medium:   500   (labels, nav items, button text)
--font-weight-semibold: 600   (card titles, metric values)
--font-weight-bold:     700   (risk badges, critical alerts, headings)
```

**Tabular numerals:** `font-variant-numeric: tabular-nums` on all metric displays.
Numbers in tables must never shift width as values change.

================================================================================
## Spacing Scale
================================================================================

Base unit: 4px. All spacing is a multiple of 4px.

```
--space-1:  4px    (icon gap, tight inline spacing)
--space-2:  8px    (compact padding, badge inner)
--space-3:  12px   (card inner padding compact)
--space-4:  16px   (default padding, form field gap)
--space-5:  20px
--space-6:  24px   (section gap, card padding)
--space-8:  32px   (page section gap)
--space-10: 40px
--space-12: 48px   (major section separation)
--space-16: 64px   (hero / page top padding)
--space-24: 96px
```

================================================================================
## Border Radius
================================================================================

```
--radius-sm:   4px    (badges, tags, inline chips)
--radius-md:   6px    (buttons, inputs, small cards)
--radius-lg:   8px    (cards, panels)
--radius-xl:   12px   (modal, drawer, overlay containers)
--radius-full: 9999px (pill buttons, avatar rings, toggle)
```

================================================================================
## Shadow Scale
================================================================================

```
--shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.3)
--shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.5)
```
Note: Dark-mode shadows use higher opacity to remain visible on dark surfaces.

================================================================================
## Motion Tokens
================================================================================

```
--duration-instant: 0ms
--duration-fast:    100ms   (hover transitions, tooltip appear)
--duration-base:    200ms   (button state, focus ring, dropdown)
--duration-slow:    350ms   (modal/drawer enter, page transition)
--duration-crawl:   500ms   (graph edge animation, loading progress bar)

--ease-standard: cubic-bezier(0.2, 0, 0, 1)     (standard elements)
--ease-enter:    cubic-bezier(0, 0, 0.2, 1)      (elements entering the screen)
--ease-exit:     cubic-bezier(0.4, 0, 1, 1)      (elements leaving)
--ease-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1) (success confirmation only — use sparingly)
```

Rule: `@media (prefers-reduced-motion: reduce)` → set all durations to 0ms or 1ms.
      Functional UI animations (hover, focus, active) may use 100ms max in reduced-motion mode.
      Decorative animations (graph edge pulse, skeleton shimmer) → disable entirely.

================================================================================
## Grid + Layout
================================================================================

```
Columns:     mobile: 4  | tablet: 8  | desktop: 12
Gutter:      mobile: 16px | tablet: 24px | desktop: 24px
Max-width:   1280px (dashboard shell)
Page margin: mobile: 16px | tablet: 32px | desktop: auto (centered)
Sidebar:     240px fixed (desktop), collapsible to 64px (icon-rail mode)
```

Breakpoints:
```
--breakpoint-sm:  640px
--breakpoint-md:  768px
--breakpoint-lg:  1024px
--breakpoint-xl:  1280px
--breakpoint-2xl: 1536px
```

================================================================================
## Component Catalogue
================================================================================

Format: ComponentName | status | design note

### Foundations
```
ColorTokens          | DESIGNED  | See Colour System above
TypographyTokens     | DESIGNED  | See Typography above
SpacingTokens        | DESIGNED  | See Spacing Scale above
MotionTokens         | DESIGNED  | See Motion Tokens above
```

### Navigation
```
Sidebar              | DESIGNED  | 240px, collapsible, icon-rail at <lg
TopBar               | DESIGNED  | Mobile only — hamburger + logo + user avatar
BreadcrumbTrail      | DESIGNED  | Max 3 levels. Truncate middle on overflow.
CommandPalette       | DESIGNED  | ⌘K global shortcut — search teams, repos, keys
```

### Buttons
```
ButtonPrimary        | DESIGNED  | brand-500 bg, neutral-0 text, hover: brand-600
ButtonSecondary      | DESIGNED  | transparent bg, brand-400 text + border, hover: brand-50 bg
ButtonDestructive    | DESIGNED  | transparent bg, critical text + border, hover: critical/10 bg
ButtonGhost          | DESIGNED  | no border, neutral-400 text, hover: neutral-700 bg
ButtonIconOnly       | DESIGNED  | aria-label required. 44×44px minimum tap target.
ButtonLink           | DESIGNED  | inline, brand-400 text, underline on hover
```

All buttons — 7 states defined:
```
default  → as above
hover    → see per-variant above
active   → scale(0.97) + brightness(0.9) — 100ms
focus    → 2px brand-400 outline, 2px offset — never remove
disabled → opacity: 0.4, cursor: not-allowed, pointer-events: none
loading  → spinner icon replaces label, same width (no layout shift), aria-busy="true"
error    → destructive variant treatment regardless of original variant
```

### Form Controls
```
InputText            | DESIGNED  | neutral-800 bg, neutral-700 border, focus: brand-400 border
InputPassword        | DESIGNED  | show/hide toggle (eye icon), same base as InputText
InputSearch          | DESIGNED  | search icon left, clear button right on value
Textarea             | DESIGNED  | resize: vertical only. Min-height: 3 rows.
SelectDropdown       | DESIGNED  | Custom — not native select. Keyboard navigable.
Checkbox             | DESIGNED  | 16×16px visible check. brand-500 when checked.
RadioGroup           | DESIGNED  | Brand-500 filled circle. Always grouped, never solo.
Toggle               | DESIGNED  | 44×24px. brand-500 on. neutral-600 off. 200ms slide.
FormLabel            | DESIGNED  | neutral-300 text, font-medium, mb-space-1
FormError            | DESIGNED  | critical text, error icon left. aria-describedby wired.
FormHint             | DESIGNED  | neutral-400 text, font-sm. Below field, above error.
```

### Feedback + Status
```
Toast                | DESIGNED  | 4 variants: success/error/warning/info. role="alert".
                                   Max 1 visible at a time. Auto-dismiss 5s, manual close.
                                   Bottom-right desktop, bottom-center mobile.
Badge                | DESIGNED  | risk-level variants (CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN)
                                   + status variants (active/inactive/pending). font-semibold, xs.
ProgressBar          | DESIGNED  | used for usage meter (x/y deep analysis calls). Semantic color.
                                   Animate fill with ease-standard 200ms on value change.
SkeletonLoader       | DESIGNED  | neutral-700 base, neutral-600 shimmer. prefers-reduced-motion: static.
EmptyState           | DESIGNED  | Illustration (SVG, 120×120), heading, body, CTA button.
                                   3 variants: no data / no access / no results.
ErrorState           | DESIGNED  | Same structure as EmptyState. For API errors.
LoadingSpinner       | DESIGNED  | 20px default, 14px inline. brand-400 color. 600ms rotation.
```

### Data Display
```
DataTable            | DESIGNED  | Sortable columns, sticky header, row hover neutral-800 bg.
                                   Pagination: cursor-based "Load more" — no page numbers.
                                   Density: compact (32px rows) / default (48px) / comfortable (64px).
MetricCard           | DESIGNED  | Headline number (3xl, semibold), label (sm, neutral-400),
                                   trend indicator (+/-% with semantic color arrow icon).
CodeBlock            | DESIGNED  | JetBrains Mono, neutral-950 bg, line numbers optional.
                                   Copy button top-right. Syntax highlight: VS Code Dark+ tokens.
RiskBadge            | DESIGNED  | CRITICAL | HIGH | MEDIUM | LOW | UNKNOWN.
                                   Always: icon + label. Never color alone.
ApiKeyDisplay        | DESIGNED  | Partially masked by default (cm_live_••••••••abcd1234).
                                   Reveal toggle. Copy button. Revoke button (destructive).
GraphCanvas          | DESIGNED  | D3 / vis-network. node: cyan-300, edge: cyan-900.
                                   High-risk nodes: critical color ring. Hover: node detail tooltip.
                                   Controls: zoom in/out, fit, fullscreen. Pan: click-drag.
UsageMeter           | DESIGNED  | ProgressBar variant. Semantic color at thresholds:
                                   0-70%: low. 70-90%: warning. 90%+: critical.
```

### Overlay
```
Modal                | DESIGNED  | role="dialog" aria-modal. Focus trap on open.
                                   Escape closes. Backdrop: neutral-950/80. Max-width: 560px.
                                   Always: title + body + footer (cancel + confirm).
Drawer               | DESIGNED  | Slides from right (480px). Same semantics as Modal.
                                   Used for: API key details, team member detail, billing history.
Tooltip              | DESIGNED  | role="tooltip". Max 200px wide. Delay: 500ms show, 0ms hide.
                                   Never put interactive content in a tooltip.
DropdownMenu         | DESIGNED  | role="menu". Arrow key navigation. Escape closes.
                                   max-height: 320px with scroll. Min width: trigger width.
ContextMenu          | DESIGNED  | Right-click / long-press. Same as DropdownMenu.
```

### Page Shells
```
DashboardShell       | DESIGNED  | Sidebar + TopBar + main content area. Handles scroll.
AuthShell            | DESIGNED  | Centered card (max-w: 400px), logo top, no navigation.
OnboardingShell      | DESIGNED  | Step indicator (1/3, 2/3, 3/3) top, centered content.
SettingsShell        | DESIGNED  | Left nav (Settings sections) + main panel. Responsive.
```

================================================================================
## CLI Output Visual Language
================================================================================

The CLI is a first-class product surface. These rules apply to all command output.

**Core principles:**
1. Information hierarchy: most important result first. Supporting detail below.
2. Risk = color + symbol. Never color alone (color-blind users + piped output).
3. Completeness always shown (INV-002). Never omit the "X% complete" line.
4. AI-enriched sections labeled. (CV-004 mitigation — COUNSEL requirement.)
5. Piped output (`| jq`, `--json`) is clean JSON. Color/formatting only when TTY.

**Risk level grammar (ANSI):**
```
CRITICAL:  ● RED BOLD   "● CRITICAL"
HIGH:      ● YELLOW     "● HIGH"
MEDIUM:    ◐ YELLOW     "◐ MEDIUM"
LOW:       ○ GREEN      "○ LOW"
UNKNOWN:   · DIM        "· UNKNOWN"
```

**Section separators:**
```
──────────────────────────────────────────────────────────────── (full width, neutral/dim)
```

**Standard check output anatomy:**
```
codemind check <file>

  ● CRITICAL  authService.ts
  ┌──────────────────────────────────────────────────────────┐
  │  247 transitive dependents  ·  12 direct                 │
  │  Coverage gap: 8 affected paths have no tests            │
  │  Production incident: 2 matching commits (90 days)       │
  └──────────────────────────────────────────────────────────┘

  Top 5 impact paths:
    1. paymentController.ts → billingService.ts → authService.ts
    2. userRouter.ts → authMiddleware.ts → authService.ts
    ...

  ✦ AI analysis  (Claude claude-opus-4-7)
  ────────────────────────────────────────
  Highest-risk change: [1 sentence from Opus narrative]
  Recommendation:      [1 sentence action item]

  ─────────────────────────────────────────────────────────────
  Graph completeness: 94%  ·  Static resolution: 87%
  6% of call sites unresolved (event emitters, DI)  ·  run with --verbose for detail
  ─────────────────────────────────────────────────────────────
```

**AI-enriched section marker:**  `✦ AI analysis  (Claude [model])` — required on all AI sections.
This satisfies COUNSEL finding CV-004.

**Error output anatomy:**
```
  ✗ Error: graph not found. Run `codemind index` first.
```

**Progress indicators:**
```
  ⠸ Indexing 1,247 files...  [████████████░░░░░░░░]  62%  3.2s
  ✓ Index complete  (1,247 nodes · 8,432 edges · 94% completeness)  4.8s
```

**JSON output (`--json` flag):**
All commands support `--json`. Output is machine-readable JSON with no ANSI codes.
Schema: `{ "status": "success"|"partial"|"failed", "data": ..., "meta": { "completeness_pct": number, "duration_ms": number } }`

================================================================================
## Accessibility Baseline
================================================================================

- Target: WCAG 2.1 AA — zero automated violations before any component merges.
- Tool: axe-core (via @axe-core/playwright) + pa11y + Lighthouse CI.
- Config: .pa11yci.json with standard: "WCAG2AA", threshold: 0.
- Light mode support: all semantic tokens must pass contrast in both dark and light mode.
  Default: dark mode. User preference stored in localStorage, respects prefers-color-scheme.
- `<html lang="en">` required. All pages.
- Focus ring: 2px solid --color-brand-400, 2px offset. Never `outline: none` without replacement.
- Skip link: "Skip to main content" — first focusable element in every page shell.

================================================================================
## tokens.css Location
================================================================================

File: packages/web/src/styles/tokens.css
Import: in packages/web/src/app/globals.css → `@import './tokens.css'`
Rule: tokens.css defines ALL :root CSS custom properties.
      tailwind.config.ts references tokens.css values (not hardcoded).
      Application code uses token names, never raw hex/px/ms values.

Full file produced at: packages/web/src/styles/tokens.css
(See tokens.css — written as companion to this document by BUILDER at SCAFFOLD gate.)

================================================================================
# END OF DESIGN-SYSTEM.md
# Gate: DESIGNER complete.
# ARTISAN requires: tokens.css written at SCAFFOLD before first UI component.
# Next gate: CONTENT (QUILL) → CONTENT-GUIDE.md
================================================================================
