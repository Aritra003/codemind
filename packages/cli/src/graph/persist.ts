/**
 * ONLY file in packages/cli that may import msgpackr (DL-007 + fitness-check.sh).
 * CodeGraph serialisation: Map<NodeId, GraphNode> → Array<[NodeId, GraphNode]> for msgpack.
 */
import * as fs   from 'fs/promises'
import * as path from 'path'
import { pack, unpack } from 'msgpackr'
import type { CodeGraph } from '@stinkit/shared'

const GRAPH_FILE = 'index.msgpack'

export async function saveGraph(storeDir: string, graph: CodeGraph): Promise<void> {
  const graphDir = path.join(storeDir, 'graph')
  await fs.mkdir(graphDir, { recursive: true })

  const serializable = {
    ...graph,
    nodes: [...graph.nodes.entries()],   // Map → Array<[id, node]>
  }

  const packed  = pack(serializable)
  const outPath = path.join(graphDir, GRAPH_FILE)
  const tmpPath = outPath + '.tmp'

  await fs.writeFile(tmpPath, packed)
  await fs.rename(tmpPath, outPath)     // atomic
}

export async function loadGraph(storeDir: string): Promise<{ graph: CodeGraph; ageMs: number } | null> {
  const outPath = path.join(storeDir, 'graph', GRAPH_FILE)

  let buf: Buffer
  let stat: Awaited<ReturnType<typeof fs.stat>>
  try {
    [buf, stat] = await Promise.all([fs.readFile(outPath), fs.stat(outPath)])
  } catch {
    return null   // file missing — normal on first run
  }

  const raw = unpack(buf) as ReturnType<typeof Object.assign>
  const graph: CodeGraph = {
    ...raw,
    nodes: new Map(raw.nodes as [string, unknown][]),   // restore Map
  }

  const ageMs = Math.max(0, Date.now() - stat.mtimeMs)

  return { graph, ageMs }
}
