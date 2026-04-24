import type { Command } from 'commander'
import type { UserConfig } from '@codemind/shared'

export interface GraphOptions {
  hotspots: boolean
  focus:    string
  depth:    number
  json:     boolean
  output:   string     // --output <file>: write JSON to file
  export:   string     // --export <format>: mermaid | json | dot
  scope:    string     // --scope <prefix>: filter to a directory prefix
}

export function registerGraphCommand(program: Command, config: UserConfig): void {
  program
    .command('graph')
    .description('Visualise the code graph in the terminal or export it')
    .option('--hotspots',            'Rank nodes by blast radius (highest risk first)')
    .option('--focus <node>',        'Show subgraph centred on this function/file')
    .option('--depth <n>',           'Traversal depth for --focus', '2')
    .option('--output <file>',       'Write graph JSON to file (for external tools)')
    .option('--export <format>',     'Export format: mermaid | json | dot')
    .option('--scope <prefix>',      'Limit export/hotspots to files under this path prefix')
    .option('--json',                'Output machine-readable JSON instead of formatted text')
    .action(async (opts: Partial<GraphOptions>, cmd: import('commander').Command) => {
      const json = opts.json ?? (cmd.parent?.opts() as { json?: boolean })?.json ?? false
      const { runGraph } = await import('./graph-runner')
      await runGraph({ ...opts, json }, config)
    })
}
