import type { UserConfig } from '@codemind/shared'
import { runSeeCore } from '../../../commands/see'
import { formatSeeResult } from '../../output/format'

export const TOOL_DEF = {
  name:        'codemind_see',
  description: 'Compare an architecture diagram against the live code graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      diagram: { type: 'string', description: 'Path to the architecture diagram (PNG or JPG)' },
    },
    required: ['diagram'],
  },
}

export async function handle(
  args: Record<string, unknown>,
  config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const diagram = String(args['diagram'] ?? '')
  const result  = await runSeeCore(
    diagram,
    { ui: false, report: false, json: false },
    config,
  )
  return { content: [{ type: 'text', text: formatSeeResult(result, false) }] }
}
