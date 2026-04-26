# StinKit

A local code graph with X-ray vision. Reads your architecture diagrams with Opus 4.7, analyzes blast radius in <2s, and monitors your codebase in real-time. Offline-first. Open source.

## Install

```
npx stinkit
```

## Quick Start

```bash
stinkit index              # build the local code graph
stinkit check --file src/auth.ts   # blast radius + risk score
stinkit see diagram.png    # compare diagram to live graph
stinkit watch              # real-time monitoring as you code
```

## Commands

| Command | Description |
|---|---|
| `index` | Parse the codebase and build the local code graph |
| `check` | Analyze blast radius and risk score for a file or function |
| `see` | Read an architecture diagram and diff it against the live graph |
| `trace` | Show the dependency chain between two files or symbols |
| `graph` | Output the full code graph as JSON or DOT |
| `watch` | Monitor for high-risk changes in real-time as you code |
| `serve` | Start the MCP server for Claude Code integration |

## What Makes This Different

- **Offline-first** — works without an API key. Opus 4.7 is the enrichment layer, not the engine.
- **Radically honest** — shows local completeness %, never claims 100%.
- **X-ray vision** — reads architecture diagrams at 3.75MP and tells you where reality diverged (`stinkit see`).
- **Real-time monitoring** — `stinkit watch` alerts on high-risk changes as you code.

## Built With

Opus 4.7 · tree-sitter · TypeScript · MCP · Claude Code Hackathon 2026

## License

MIT
