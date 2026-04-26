import type { UserConfig } from '@stinkit/shared'
import { runPlanCore } from '../../../commands/plan'

export const TOOL_DEF = {
  name:        'stinkit_plan',
  description: 'Generate a sequenced, risk-aware refactoring plan. Analyses the code graph to determine safe change order, PR boundaries, effort estimates, and rollback points. Use when the developer wants to refactor, migrate, replace, or restructure code.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      goal: { type: 'string', description: 'Description of the refactoring or migration goal' },
    },
    required: ['goal'],
  },
}

export async function handle(
  args:   Record<string, unknown>,
  config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const goal = typeof args['goal'] === 'string' ? args['goal'] : ''
  if (!goal) return { content: [{ type: 'text', text: 'Error: goal is required' }] }

  const result = await runPlanCore(goal, config)
  if (result.status === 'failed') {
    return { content: [{ type: 'text', text: `Error: ${result.error.message}${result.error.hint ? ` (${result.error.hint})` : ''}` }] }
  }

  const { plan, tiers, affected, model } = result.data
  const header = `Affected: ${affected} files · ${tiers} tier${tiers !== 1 ? 's' : ''} · Graph completeness: ${result.meta.completeness_pct}% · ${model}\n\n`
  return { content: [{ type: 'text', text: header + plan }] }
}
