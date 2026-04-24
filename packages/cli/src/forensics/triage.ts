import type { AIClient } from '../lib/ai/client'

const VALID_DOMAINS = new Set(['CODE', 'INFRA', 'CONFIG', 'NETWORK', 'UNKNOWN'])

export async function triageError(
  ai:             AIClient,
  sanitizedInput: string,
): Promise<{ symbols: string[]; likely_domain: string }> {
  const result      = await ai.triageError(sanitizedInput)
  const likelyDomain = VALID_DOMAINS.has(result.likely_domain) ? result.likely_domain : 'UNKNOWN'
  return { symbols: result.symbols, likely_domain: likelyDomain }
}
