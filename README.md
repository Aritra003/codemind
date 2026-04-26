<p align="center">
  <img src="docs/assets/stinkit-logo.png" alt="StinKit" width="72" />
</p>

<h1 align="center">StinKit</h1>
<h3 align="center">Ship without fear.</h3>

<p align="center">
  Scan your code. See what breaks. Get an audit report.<br/>
  CLI + Web Dashboard + AI Agent Server — one tool, everything connected.
</p>

<p align="center">
  <a href="https://github.com/Aritra003/codemind/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/Tests-407_passing-22C55E?style=flat-square" />
  <img src="https://img.shields.io/badge/Languages-11-6366F1?style=flat-square" />
  <img src="https://img.shields.io/badge/API_Routes-17-6366F1?style=flat-square" />
  <img src="https://img.shields.io/badge/Built_with-Opus_4.7-1a1a2e?style=flat-square" />
</p>

<br/>

<!-- 📸 SCREENSHOT: Full-width hero of the landing page or dashboard overview -->
<p align="center">
  <img src="docs/assets/hero.png" alt="StinKit Dashboard" width="960" />
</p>

---

## What StinKit Does

StinKit indexes your codebase into a dependency graph — every function, every import, every call chain — then lets you query it nine different ways.

**Three surfaces, one graph:**

| Surface | What It Is |
|---------|-----------|
| **CLI** | 9 commands. Runs anywhere. Works offline. |
| **Web Dashboard** | 10 pages. GitHub OAuth. Interactive graph. Audit reports. |
| **MCP Server** | 9 tools. Claude Code, Cursor, or any MCP agent can query your code graph autonomously. |

---

## Install

```bash
# CLI — no account, no cloud, works immediately
npx stinkit
cd your-project && stinkit index

# Web Dashboard — full UI with GitHub integration
git clone https://github.com/Aritra003/codemind.git
cd codemind/packages/web
npm install && npm run dev
# → http://localhost:3000
```

---

## The Dashboard

<!-- 📸 SCREENSHOT: Repos page showing 4+ indexed repos with metadata and freshness badges -->
<p align="center">
  <img src="docs/assets/repos.png" alt="Repository Management" width="960" />
</p>

10 pages. 17 API routes. GitHub OAuth. Webhook auto-re-indexing on every push.

| Page | What You See |
|------|-------------|
| **Overview** | Repo count, recent scans, health stats, quick actions |
| **Repos** | Connect GitHub repos, one-click index, webhook auto-sync on push |
| **Check** | Pick a repo, pick a file, see blast radius + risk level instantly |
| **Ask** | Type a question in English → get an answer referencing real file paths |
| **Plan** | Describe a refactor → get a step-by-step PR plan with risk + effort |
| **Graph** | NOVA Explorer — interactive D3 force-directed graph with bloom, clusters, and node inspector |
| **Diagram** | Live Mermaid preview — scope filter, pan/zoom, download, source tab |
| **See** | Upload an architecture diagram → AI compares it to your actual code |
| **Reports** | Security audit reports with health scores, severity breakdowns, remediation |
| **Settings** | Profile, CLI config reference, API key management |

---

## NOVA Graph Explorer

<!-- 📸 SCREENSHOT: Graph page with a repo loaded, nodes visible with labels, a node clicked showing the HUD panel -->
<p align="center">
  <img src="docs/assets/nova-graph.png" alt="NOVA Graph Explorer" width="960" />
</p>

Interactive force-directed visualization of your entire codebase.

**What makes NOVA different from a basic graph:**
- Every node is **labeled** with the file/function name — not anonymous dots
- Nodes are **sized by blast radius** — high-risk files are visually larger
- **Color-coded by health** — red for critical issues, orange for warnings, green for healthy
- **Click any node** → highlights dependents (blue) and dependencies (green), opens inspector panel showing path, callers, imports, and health status
- **Cluster hulls** — related modules grouped visually
- **Particle animation** on edges showing data flow direction
- **Search + filter** — find by name, filter by language or risk level
- **Dual-canvas bloom** rendering for visual depth

---

## Architecture Diagram Comparison

<!-- 📸 SCREENSHOT: See page with an uploaded diagram on left and analysis results on right -->
<p align="center">
  <img src="docs/assets/see-analysis.png" alt="StinKit See" width="960" />
</p>

Upload a whiteboard photo, Lucidchart export, or any diagram image. Opus 4.7 reads it at 3.75 megapixels, extracts every service and connection, then compares it against your actual code graph.

```bash
stinkit see whiteboard.jpg
```

```
Accuracy ████████████░░░░░░░░ 58%

✗ 2 phantom connections (in diagram, not in code)
⊕ 3 missing connections (in code, not in diagram)
✓ Corrected Mermaid diagram saved
```

**Generate a ground-truth diagram** from your code:
```bash
stinkit see --generate --scope src/services/
```

**Supports:** PNG · JPG · SVG · PDF · WebP · BMP · TIFF · Mermaid

---

## Professional Audit Reports

<!-- 📸 SCREENSHOT: Report detail page showing health score donut, severity cards, and a finding expanded -->
<p align="center">
  <img src="docs/assets/audit-report.png" alt="Codebase Audit Report" width="960" />
</p>

Security audit reports structured like a Deloitte engagement — not a flat list of warnings.

**What's in a report:**
- **Executive Summary** — what was found, what's at risk, what to do first
- **Health Score** — 0-100 with SVG donut chart
- **Severity Framework** — impact × probability matrix explaining how severity is assigned
- **Grouped Findings** — identical issues deduplicated into single cards with all affected files listed together (not 97 separate cards for the same pattern)
- **Each finding includes:** description, why it matters, how to fix (with code examples), effort estimate, and what happens if you ignore it
- **Remediation Roadmap** — TODAY → THIS SPRINT → NEXT SPRINT → ONGOING
- **What's Working Well** — balanced reports build trust
- **Print to PDF** — clean white-background layout

```bash
stinkit audit --report              # HTML report, opens in browser
stinkit audit --report --think      # Opus 4.7 writes the narrative
```

---

## Codebase Q&A

<!-- 📸 SCREENSHOT: Ask page with a question and an answer showing file paths and call chains -->
<p align="center">
  <img src="docs/assets/ask-page.png" alt="StinKit Ask" width="960" />
</p>

Ask questions in plain English. StinKit queries the structural graph for context, then Opus 4.7 explains the architecture using real file names and dependency counts.

```bash
stinkit ask "What would break if I removed the cache layer?"
stinkit ask "Where should a new developer start reading this code?"
stinkit ask "Which files are most dangerous to change?"
```

---

## AI Refactoring Planner

<!-- 📸 SCREENSHOT: Plan page showing a refactoring goal and the tiered PR output -->
<p align="center">
  <img src="docs/assets/plan-page.png" alt="StinKit Plan" width="960" />
</p>

Describe what you want to change. StinKit analyzes every affected file, determines the safe order, and generates a migration plan with PR boundaries, risk levels, effort estimates, and rollback points.

```bash
stinkit plan "Replace session management with JWT tokens"
```

```
Affected: 23 files · 4 tiers · 3 suggested PRs

PR 1: "Add test coverage" — 2 files, LOW risk, 2-3 hours
PR 2: "Introduce JWT alongside sessions" — 3 files, MEDIUM risk, 5-7 hours
PR 3: "Migrate callers, remove old code" — 18 files, HIGH risk, 4-6 hours

Rollback points after each PR. Total: 13-19 hours.
```

---

## Blast Radius Check

<!-- 📸 SCREENSHOT: Check page with a repo and file selected, showing result with risk bar and metric cards -->
<p align="center">
  <img src="docs/assets/check-page.png" alt="Blast Radius Check" width="960" />
</p>

Know what breaks before you commit. Under 2 seconds. Fully offline.

```bash
stinkit check --file src/auth/middleware.ts
```

```
Risk ██████████████░░░░░░ HIGH
38 direct dependents · 2 coverage gaps · incident history
⏱ 0.48s
```

**Pre-commit hook** — blocks commits if risk is CRITICAL:
```bash
stinkit check --install-hook
```

---

## All 9 CLI Commands

```
stinkit index             Build the code graph (fast, offline)
stinkit check <file>      What breaks if you change this file?
stinkit ask "<question>"  Ask about your codebase in plain English
stinkit plan "<goal>"     AI refactoring plan with PR boundaries
stinkit see <image>       Compare a diagram to actual code
stinkit trace <file>      Trace errors to the commit that caused them
stinkit watch             Real-time alerts when you save risky changes
stinkit audit --report    Professional HTML security audit
stinkit serve             Start MCP server for AI agent integration
```

All commands support `--json` for scripting and CI integration.

---

## 11 Languages

| Language | CLI (tree-sitter) | Web (regex) |
|----------|:-:|:-:|
| TypeScript | ✓ | ✓ |
| JavaScript | ✓ | ✓ |
| Python | — | ✓ |
| Go | — | ✓ |
| Java | — | ✓ |
| Ruby | — | ✓ |
| Rust | — | ✓ |
| C# | — | ✓ |
| PHP | — | ✓ |
| Kotlin | — | ✓ |
| Swift | — | ✓ |

---

## MCP Server — AI Agent Integration

9 tools. One config. Your AI coding agent checks blast radius before editing code.

```json
{
  "mcpServers": {
    "stinkit": {
      "command": "stinkit",
      "args": ["serve"]
    }
  }
}
```

| Tool | What the Agent Gets |
|------|-------------------|
| `check` | Blast radius + risk level for any file |
| `ask` | Answers about code architecture |
| `plan` | Sequenced refactoring plan |
| `see` | Architecture diagram analysis |
| `trace` | Root cause analysis for errors |
| `graph` | Raw graph data, hotspots, exports |
| `status` | Index health and completeness |
| `watch-status` | Recent file changes and risk alerts |
| `adversarial` | Security pattern scanning |

A skill file (`.claude/skills/stinkit.md`) is auto-generated during indexing — it teaches the agent when and how to use each tool.

---

## Radically Honest

Every output shows what StinKit knows and what it doesn't.

```
Local completeness: 75% · 7,158 external excluded · 956 ambiguous local calls
Known blind spots: event emitters, DI containers
```

Other tools claim 100%. We show you the real number.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                      STINKIT                          │
├──────────────────┬─────────────────┬──────────────────┤
│   CLI (9 cmds)   │  Web (10 pages) │  MCP (9 tools)  │
├──────────────────┴─────────────────┴──────────────────┤
│                  ANALYSIS ENGINE                      │
│   Blast Radius · Coverage · Risk · Security · Cycles  │
├───────────────────────────────────────────────────────┤
│                    CODE GRAPH                         │
│   tree-sitter (CLI) · regex (Web) · 11 languages      │
├───────────────────────────────────────────────────────┤
│               OPUS 4.7 (optional)                     │
│   Vision · Q&A · Planning · Audit Narrative           │
└───────────────────────────────────────────────────────┘
```

---

## What Makes StinKit Different

| | GitNexus | Greptile | CodeRabbit | **StinKit** |
|---|:-:|:-:|:-:|:-:|
| Architecture diagram comparison | ✗ | ✗ | ✗ | **✓** |
| Plain English codebase Q&A | ✗ | Partial | ✗ | **✓** |
| AI refactoring planner | ✗ | ✗ | ✗ | **✓** |
| Professional audit report | ✗ | ✗ | ✗ | **✓** |
| Full web dashboard | ✓ | ✗ | ✗ | **✓** |
| Real-time watch mode | ✗ | ✗ | ✗ | **✓** |
| Completeness metric | ✗ | ✗ | ✗ | **✓** |
| Pre-commit hook | ✗ | ✗ | ✗ | **✓** |
| License | PolyForm NC | Closed | Closed | **MIT** |

---

## Numbers

| | |
|---|---|
| **167** | source files |
| **407** | tests passing |
| **17** | API routes |
| **10** | dashboard pages |
| **9** | CLI commands |
| **9** | MCP tools |
| **11** | languages supported |
| **0** | dollars to run |

---

## API Routes

<details>
<summary>17 endpoints — click to expand</summary>

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/repos` | Add a repository |
| GET | `/api/repos` | List user repositories |
| GET | `/api/repos/list-github` | Browse GitHub repos |
| POST | `/api/repos/[id]/index` | Trigger indexing |
| GET | `/api/repos/[id]/graph` | Fetch graph JSON |
| POST | `/api/repos/[id]/webhook` | Set up push webhook |
| DELETE | `/api/repos/[id]/webhook` | Remove webhook |
| POST | `/api/webhooks/github` | Receive push events (HMAC verified) |
| POST | `/api/check` | Blast radius calculation |
| POST | `/api/ask` | Claude-powered Q&A |
| POST | `/api/plan` | Claude-powered refactoring plan |
| POST | `/api/see` | Vision analysis of diagrams |
| POST | `/api/see/generate` | Generate Mermaid from graph |
| GET | `/api/reports` | List audit reports |
| GET | `/api/reports/[id]` | Report detail |
| GET/POST | `/api/apikeys` | API key management |
| PATCH | `/api/profile` | Update profile |

</details>

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `g` `h` | Go to Overview |
| `g` `c` | Go to Check |
| `g` `a` | Go to Ask |
| `g` `p` | Go to Plan |
| `g` `g` | Go to Graph |
| `g` `r` | Go to Reports |
| `?` | Show all shortcuts |

---

## Contributing

Pull requests welcome. MIT licensed — use for anything, including commercial.

```bash
git clone https://github.com/Aritra003/codemind.git
cd codemind
npm install
npm test
```

---

## Author

**Aritra Sarkhel** — Engineer & Founder

[GitHub](https://github.com/Aritra003)

Built with Opus 4.7 for the Claude Code Hackathon 2026.

---

<p align="center">
  <strong>MIT License</strong> — Free forever.<br/>
  © 2026 Atnia Solutions Pvt Limited
</p>
