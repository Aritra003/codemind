import { Command } from 'commander'
import { registerCheckCommand }     from './commands/check'
import { registerIndexCommand }     from './commands/index-cmd'
import { registerSeeCommand }       from './commands/see'
import { registerTraceCommand }     from './commands/trace'
import { registerGraphCommand }     from './commands/graph'
import { registerServeCommand }     from './commands/serve'
import { registerAuditCommand }     from './commands/audit'
import { registerAskCommand }       from './commands/ask'
import { registerPlanCommand }      from './commands/plan'
import { loadConfig }               from './lib/config'
import { validateEnvCli }           from './lib/validate-env'

async function main(): Promise<void> {
  validateEnvCli()

  const config = await loadConfig()

  const program = new Command()
    .name('codemind')
    .description('Know the blast radius of every change before it ships.')
    .version('0.1.0')
    .option('--json', 'Output machine-readable JSON instead of formatted text')
    .option('--verbose', 'Show detailed output including unresolved call sites')

  registerIndexCommand(program, config)
  registerCheckCommand(program, config)
  registerAuditCommand(program, config)
  registerSeeCommand(program, config)
  registerTraceCommand(program, config)
  registerGraphCommand(program, config)
  registerServeCommand(program, config)
  registerAskCommand(program, config)
  registerPlanCommand(program, config)

  program
    .command('watch')
    .description('Monitor file changes and show blast radius alerts in real-time')
    .option('--scope <dir>',         'Only watch files in this directory')
    .option('--debounce <ms>',       'Debounce delay in milliseconds', '2000')
    .option('--think-on-critical',   'Coming soon: auto deep-analysis on CRITICAL changes')
    .action(async (opts: Record<string, unknown>) => {
      const { runWatch } = await import('./watch/watch-runner')
      await runWatch(opts)
    })

  // Default action: status dashboard when invoked with no subcommand
  program.action(async () => {
    const json = (program.opts() as { json?: boolean }).json ?? false
    const { runStatus } = await import('./commands/status-runner')
    await runStatus(json)
  })

  // Install pre-commit hook
  program
    .command('--install-hook')
    .description('Install the CodeMind pre-commit hook in .git/hooks/pre-commit')
    .action(async () => {
      const { installPreCommitHook } = await import('./hooks/install')
      await installPreCommitHook()
    })

  await program.parseAsync(process.argv)
}

main().catch((err: unknown) => {
  process.stderr.write(`\n  ✗ Unexpected error: ${String(err)}\n`)
  process.exit(1)
})
