import ora from 'ora'
import chalk from 'chalk'
import type { UserConfig } from '@codemind/shared'
import { runPlanCore }  from './plan'
import { formatError }  from '../lib/output/format'
import { logger }       from '../lib/logger'

export async function runPlan(goal: string, config: UserConfig): Promise<void> {
  if (!config.anthropic_api_key) {
    process.stderr.write(
      formatError('NO_API_KEY', '`plan` requires an Anthropic API key.', 'Set ANTHROPIC_API_KEY in ~/.codemind/config.yaml or as env var.') + '\n',
    )
    process.exit(1)
  }

  const spinner = ora('Analysing dependency graph…').start()

  try {
    const result = await runPlanCore(goal, config)

    if (result.status === 'failed') {
      spinner.fail('Plan failed')
      process.stderr.write(formatError(result.error.code, result.error.message, result.error.hint) + '\n')
      process.exit(1)
    }

    spinner.stop()

    const { plan, tiers, affected, tokensUsed, model } = result.data

    process.stdout.write('\n')
    process.stdout.write(chalk.cyan(' ╭──────────────────────────────────────────────────────────╮\n'))
    process.stdout.write(chalk.cyan(' │  CODEMIND PLAN') + ' '.repeat(46) + chalk.cyan('│\n'))
    const g = goal.length > 55 ? goal.slice(0, 52) + '…' : goal
    process.stdout.write(chalk.cyan(` │  ${chalk.bold(g)}`) + ' '.repeat(Math.max(0, 57 - g.length)) + chalk.cyan('│\n'))
    process.stdout.write(chalk.cyan(' ╰──────────────────────────────────────────────────────────╯\n'))
    process.stdout.write('\n')
    process.stdout.write(chalk.dim(`  Affected: ${affected} files · ${tiers} tier${tiers !== 1 ? 's' : ''} · suggested PRs in plan below\n`))
    process.stdout.write('\n')

    for (const line of plan.split('\n')) {
      if (line.startsWith('STEP ')) {
        process.stdout.write(chalk.bold(`  ${line}\n`))
      } else if (line.startsWith('PR BOUNDARY')) {
        process.stdout.write('\n' + chalk.cyan(`  ${line}\n`))
      } else if (line.trim().startsWith('Rollback:')) {
        process.stdout.write(chalk.yellow(`  ${line}\n`))
      } else {
        process.stdout.write(`  ${line}\n`)
      }
    }

    process.stdout.write('\n')
    process.stdout.write(chalk.dim(`  ℹ Graph completeness: ${result.meta.completeness_pct}%\n`))
    process.stdout.write(chalk.dim(`  ⏱ ${tokensUsed} tokens · ${model}\n`))

    logger.info({ goal, affected, tiers, tokensUsed, model }, 'plan_complete')
  } catch (err) {
    spinner.fail('Plan failed')
    logger.error({ err }, 'plan command failed')
    process.stderr.write(formatError('PLAN_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}
