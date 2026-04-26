import type { Command } from 'commander'
import type { UserConfig } from '@stinkit/shared'

export interface AuditOptions {
  report:  boolean
  output?: string
  think:   boolean
  json:    boolean
}

export function registerAuditCommand(program: Command, config: UserConfig): void {
  program
    .command('audit')
    .description('Generate a professional engineering audit report (8 sections, grouped by theme)')
    .option('--report',          'Generate an HTML report and open it in the browser')
    .option('--output <path>',   'Save the HTML report to this path (implies --report)')
    .option('--think',           'Use Claude Opus 4.7 to write executive summary narrative (~$0.50)')
    .option('--json',            'Output machine-readable JSON instead of formatted text')
    .action(async (opts: Partial<AuditOptions>) => {
      const { runAudit } = await import('./audit-runner')
      await runAudit({
        report: !!(opts.report || opts.output),
        ...(opts.output ? { output: opts.output } : {}),
        think:  opts.think ?? false,
        json:   opts.json  ?? false,
      }, config)
    })
}
