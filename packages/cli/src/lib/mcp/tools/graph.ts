import type { UserConfig } from '@stinkit/shared'
import { GraphStore } from '../../graph/store'

export const TOOL_DEF = {
  name:        'stinkit_graph',
  description: 'Return a JSON summary of the indexed code graph.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] as string[] },
}

export async function handle(
  _args: Record<string, unknown>,
  _config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const store = new GraphStore(`${process.cwd()}/.stinkit`)
    const graph = await store.load()

    if (!graph) {
      return { content: [{ type: 'text', text: 'No graph found. Run `stinkit index` first.' }] }
    }

    const ageMs   = await store.ageMs()
    const summary = {
      node_count:       graph.node_count,
      edge_count:       graph.edge_count,
      languages:        graph.languages,
      completeness_pct: graph.completeness_pct,
      age_ms:           ageMs,
    }
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error reading graph: ${String(err)}` }] }
  }
}
