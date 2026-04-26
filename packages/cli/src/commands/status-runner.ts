import chalk from 'chalk'
import { GraphStore }    from '../lib/graph/store'
import { formatSeparator, formatCompletenessWarning } from '../lib/output/format'

function formatAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000)
  if (seconds < 60)  return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export async function runStatus(json = false): Promise<void> {
  const repoRoot = process.cwd()
  const store    = new GraphStore(`${repoRoot}/.stinkit`)

  const graph  = await store.load()
  const ageMs  = graph ? (await store.ageMs() ?? 0) : 0

  if (json) {
    const payload = graph
      ? {
          status:           'ok',
          node_count:       graph.node_count,
          edge_count:       graph.edge_count,
          completeness_pct: graph.completeness_pct,
          languages:        graph.languages,
          age_ms:           ageMs,
        }
      : { status: 'no_graph' }
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n')
    return
  }

  process.stdout.write('\n')
  process.stdout.write(chalk.bold('StinKit') + chalk.dim(` — ${repoRoot}`) + '\n')
  process.stdout.write(formatSeparator() + '\n')

  if (!graph) {
    process.stdout.write(chalk.yellow('  No graph found. Run ') + chalk.white('stinkit index') + chalk.yellow(' to build the code graph.') + '\n')
    process.stdout.write(formatSeparator() + '\n')
    process.stdout.write('\n')
    return
  }

  const langStr = graph.languages.length > 0 ? `  (${graph.languages.join(', ')})` : ''

  process.stdout.write(
    `  Graph:     ${chalk.bold(graph.node_count.toString())} nodes  ` +
    `${chalk.bold(graph.edge_count.toString())} edges${langStr}\n`
  )
  process.stdout.write(`  ${formatCompletenessWarning(graph)}\n`)
  process.stdout.write(`  Freshness: ${chalk.dim(formatAge(ageMs))}\n`)
  process.stdout.write(formatSeparator() + '\n')
  process.stdout.write(
    chalk.dim(`\n  Try:  ${chalk.white('stinkit check')}           blast radius of staged changes\n`) +
    chalk.dim(`        ${chalk.white('stinkit graph --hotspots')}  rank files by risk\n`) +
    chalk.dim(`        ${chalk.white('stinkit index')}             refresh the graph\n`)
  )
  process.stdout.write('\n')
}
