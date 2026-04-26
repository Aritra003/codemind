import type { UserConfig } from '@stinkit/shared'
import { runCheckCore } from '../../../commands/check'
import { formatCheckResult } from '../../output/format'

export const TOOL_DEF = {
  name:        'stinkit_check',
  description: 'Show the blast radius of changed files against the code graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      files: { type: 'array', items: { type: 'string' }, description: 'Changed file paths (defaults to git-staged)' },
      think: { type: 'boolean', description: 'Enable deep Opus analysis' },
    },
    required: [] as string[],
  },
}

export async function handle(
  args: Record<string, unknown>,
  config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const files = Array.isArray(args['files']) ? (args['files'] as string[]) : []
  const think = args['think'] === true
  const result = await runCheckCore(
    files,
    { think, report: false, json: false, verbose: false, estimateCost: false },
    config,
  )
  return { content: [{ type: 'text', text: formatCheckResult(result, false) }] }
}
