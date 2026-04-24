import type { UserConfig } from '@codemind/shared'
import { runTraceCore } from '../../../commands/trace'
import { formatTraceResult } from '../../output/format'

export const TOOL_DEF = {
  name:        'codemind_trace',
  description: 'Trace a production error or symptom to root-cause commits.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      error:     { type: 'string',  description: 'Error message or stack trace to trace' },
      narrative: { type: 'boolean', description: 'Generate an Opus narrative explanation' },
      lookback:  { type: 'number',  description: 'Days of git history to search (default 90)' },
    },
    required: ['error'],
  },
}

export async function handle(
  args: Record<string, unknown>,
  config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const error     = String(args['error'] ?? '')
  const narrative = args['narrative'] === true
  const lookback  = typeof args['lookback'] === 'number' ? args['lookback'] : 90
  const result    = await runTraceCore(
    error,
    { narrative, lookback, json: false, report: false },
    config,
  )
  return { content: [{ type: 'text', text: formatTraceResult(result, false) }] }
}
