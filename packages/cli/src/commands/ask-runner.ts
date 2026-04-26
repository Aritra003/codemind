import ora from 'ora'
import chalk from 'chalk'
import type { UserConfig } from '@stinkit/shared'
import { runAskCore }  from './ask'
import { formatError } from '../lib/output/format'
import { logger }      from '../lib/logger'

export async function runAsk(question: string, config: UserConfig): Promise<void> {
  if (!config.anthropic_api_key) {
    process.stderr.write(
      formatError('NO_API_KEY', '`ask` requires an Anthropic API key.', 'Set ANTHROPIC_API_KEY in ~/.stinkit/config.yaml or as env var.') + '\n',
    )
    process.exit(1)
  }

  const spinner = ora('Querying graph…').start()

  try {
    const result = await runAskCore(question, config)

    if (result.status === 'failed') {
      spinner.fail('Ask failed')
      process.stderr.write(formatError(result.error.code, result.error.message, result.error.hint) + '\n')
      process.exit(1)
    }

    spinner.stop()

    const { answer, tokensUsed, model, nodesUsed } = result.data

    process.stdout.write('\n')
    process.stdout.write(chalk.cyan(' ╭──────────────────────────────────────────────────────────╮\n'))
    process.stdout.write(chalk.cyan(' │  STINKIT ASK') + ' '.repeat(47) + chalk.cyan('│\n'))
    const q = question.length > 55 ? question.slice(0, 52) + '…' : question
    process.stdout.write(chalk.cyan(` │  ${chalk.bold(q)}`) + ' '.repeat(Math.max(0, 57 - q.length)) + chalk.cyan('│\n'))
    process.stdout.write(chalk.cyan(' ╰──────────────────────────────────────────────────────────╯\n'))
    process.stdout.write('\n')

    if (nodesUsed === 0) {
      process.stdout.write(chalk.yellow('  No relevant code found for your question. Try being more specific.\n'))
      process.stdout.write(chalk.dim(`  (graph has ${result.meta.completeness_pct}% completeness)\n`))
    } else {
      for (const line of answer.split('\n')) {
        process.stdout.write(`  ${line}\n`)
      }
    }

    process.stdout.write('\n')
    const note = `ℹ Graph completeness: ${result.meta.completeness_pct}%`
    process.stdout.write(chalk.dim(`  ${note}\n`))
    process.stdout.write(chalk.dim(`  ⏱ ${tokensUsed} tokens · ${model}\n`))

    logger.info({ question, nodesUsed, tokensUsed, model }, 'ask_complete')
  } catch (err) {
    spinner.fail('Ask failed')
    logger.error({ err }, 'ask command failed')
    process.stderr.write(formatError('ASK_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}
