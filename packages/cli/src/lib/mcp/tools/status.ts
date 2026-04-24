import type { UserConfig } from '@codemind/shared'
import { GraphStore } from '../../graph/store'

const VERSION = '0.1.0'

export const TOOL_DEF = {
  name:        'codemind_status',
  description: 'Return the status of the CodeMind graph index and server version.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] as string[] },
}

export async function handle(
  _args: Record<string, unknown>,
  _config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const store   = new GraphStore(`${process.cwd()}/.codemind`)
    const exists  = await store.exists()
    const ageMs   = await store.ageMs()
    const graph   = exists ? await store.load() : null

    const status = {
      version:          VERSION,
      graph_available:  exists,
      graph_age_ms:     ageMs,
      completeness_pct: graph?.completeness_pct ?? null,
    }
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error reading status: ${String(err)}` }] }
  }
}
