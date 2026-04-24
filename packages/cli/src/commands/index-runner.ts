import ora  from 'ora'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { UserConfig } from '@codemind/shared'
import { GraphIndexer } from '../lib/graph/indexer'
import { GraphStore }   from '../lib/graph/store'
import { formatSuccess, formatError, formatCompletenessWarning } from '../lib/output/format'
import { logger }       from '../lib/logger'

const SKILL_CONTENT = `# CodeMind — Claude Code Skill

> This skill teaches Claude Code when and how to use CodeMind's MCP tools for codebase analysis.
> Install: \`codemind index\` auto-places this at \`.claude/skills/codemind.md\`

## Available Tools

| Tool | What It Does | When to Use |
|---|---|---|
| \`codemind_status\` | Check if the code index exists and is current | Before any other CodeMind tool |
| \`codemind_check\` | Analyze blast radius of a code change | Before committing or pushing shared code |
| \`codemind_graph\` | Visualise the code graph or rank hotspots | When planning a refactor or reviewing architecture |
| \`codemind_see\` | Compare an architecture diagram to actual code | When reviewing or planning architecture changes |
| \`codemind_trace\` | Trace a production error to its root-cause commit | When debugging errors that aren't immediately obvious |
| \`codemind_watch_status\` | Check if the watch daemon is running and get latest alerts | When the developer has \`codemind watch\` running in the background |

## Decision Rules

### Always run \`codemind_status\` first
Before calling any other CodeMind tool, check that the index exists and is fresh. If status reports the index is older than 7 days, suggest the developer run \`codemind index\` before proceeding.

### When to use \`codemind_check\`
USE when:
- Developer is modifying shared code (utilities, middleware, services, core modules, API endpoints)
- Developer asks "what will break if I change this?"
- Developer is preparing a PR for review

SKIP when:
- Changes are limited to test files, documentation, or config with no code callers
- The change is adding a new file that nothing depends on yet

HOW to call:
\`\`\`
codemind_check({ files: ["src/auth/middleware.ts"] })
\`\`\`
Omit files to analyze all currently staged git changes.

## Background monitoring

- \`codemind_watch_status\` tells you if the watch daemon is running and if any recent changes were flagged as HIGH or CRITICAL risk.
- If watch detected a HIGH or CRITICAL change, suggest the developer run \`codemind check --file <path> --think\` for the flagged file.
- You do NOT need to start or stop the watch daemon — the developer manages that in their terminal with \`codemind watch\`.
- The watch daemon runs at zero API cost by default (fast graph traversal only, no LLM calls).

## Constraints

- All CodeMind tools query a LOCAL index on the developer's machine. No data is sent externally except to the Claude API when \`--think\` is used.
- The index must exist. If \`codemind_status\` returns an error, guide the developer to run \`codemind index\` first.
- Graph traversal depth defaults to 4. For very large repos, results may be truncated to keep response times fast.
`

export async function runIndex(
  opts: { force: boolean; include: string },
  _config: UserConfig
): Promise<void> {
  const repoRoot = process.cwd()
  const storeDir = `${repoRoot}/.codemind`
  const store    = new GraphStore(storeDir)
  const indexer  = new GraphIndexer()

  // Warn early if not inside a git repository — features that rely on git won't work
  const hasGit = await fs.stat(path.join(repoRoot, '.git')).then(() => true).catch(() => false)
  if (!hasGit) {
    process.stderr.write(
      '  ⚠  No .git directory found. Coverage tracking and incident correlation will be unavailable.\n' +
      '     Run `git init` to enable all CodeMind features.\n'
    )
  }

  const spinner  = ora('Building code graph…').start()

  try {
    const includeGlobs = opts.include ? opts.include.split(',').map(s => s.trim()) : []

    const graph = await indexer.index(
      { repoRoot, include: includeGlobs, force: opts.force },
      (progress) => {
        spinner.text = `[${progress.phase}] ${progress.files_done}/${progress.files_total} files`
        if (progress.current_file) spinner.text += ` — ${progress.current_file}`
      }
    )

    await store.save(graph)
    spinner.succeed(`Graph built — ${graph.node_count} nodes, ${graph.edge_count} edges`)
    process.stdout.write(formatSuccess(`Saved to ${storeDir}/graph/index.msgpack\n`))
    process.stdout.write(formatCompletenessWarning(graph) + '\n')

    // Create Claude Code skill file so Claude knows how to use CodeMind in this repo
    const skillDir  = path.join(repoRoot, '.claude', 'skills')
    const skillPath = path.join(skillDir, 'codemind.md')
    try {
      await fs.access(skillPath)
    } catch {
      await fs.mkdir(skillDir, { recursive: true })
      await fs.writeFile(skillPath, SKILL_CONTENT, 'utf8')
      process.stdout.write(formatSuccess('Created Claude Code skill file at .claude/skills/codemind.md\n'))
    }

    if (graph.node_count === 0) {
      process.stderr.write(
        '  ⚠  Zero nodes found. CodeMind currently supports TypeScript and JavaScript (.ts, .tsx, .js, .jsx).\n' +
        '     Make sure you are running `codemind index` from your project root.\n'
      )
    }

    if (graph.completeness_pct < 70) {
      process.stdout.write(
        '  Tip: declare dynamic calls in .codemind/connections.yaml to improve completeness.\n'
      )
    }
  } catch (err) {
    spinner.fail('Graph build failed')
    logger.error({ err }, 'index command failed')
    process.stderr.write(formatError('INDEX_FAILED', 'Could not build graph.', String(err)) + '\n')
    process.exit(1)
  }
}
