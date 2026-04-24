import type { AIClient } from '../lib/ai/client'
import type { ForensicsTrace } from '../commands/trace'

const INV_004_DISCLAIMER = '\n\nNote: confidence capped at 80% (INV-004).'

export async function generateNarrative(
  ai:    AIClient,
  trace: Pick<ForensicsTrace, 'ranked_commits' | 'origin_classification' | 'code_paths'>,
): Promise<string> {
  const text = await ai.narrateTrace(trace)
  return text + INV_004_DISCLAIMER
}
