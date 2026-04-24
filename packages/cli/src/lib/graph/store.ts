import type { CodeGraph } from '@codemind/shared'
import { saveGraph, loadGraph } from '../../graph/persist'

export class GraphStore {
  constructor(private readonly storeDir: string) {}

  async load(maxAgeMs?: number): Promise<CodeGraph | null> {
    const loaded = await loadGraph(this.storeDir)
    if (!loaded) return null
    if (maxAgeMs !== undefined && loaded.ageMs > maxAgeMs) return null
    return loaded.graph
  }

  async save(graph: CodeGraph): Promise<void> {
    await saveGraph(this.storeDir, graph)
  }

  async exists(): Promise<boolean> {
    return (await loadGraph(this.storeDir)) !== null
  }

  async ageMs(): Promise<number | null> {
    const loaded = await loadGraph(this.storeDir)
    return loaded ? loaded.ageMs : null
  }
}
