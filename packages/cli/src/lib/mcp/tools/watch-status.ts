import type { UserConfig } from '@codemind/shared'
import * as path from 'path'
import * as fs   from 'fs/promises'
import type { WatchStatus } from '../../../watch/watcher'

export const TOOL_DEF = {
  name:        'codemind_watch_status',
  description: 'Check if CodeMind watch is running and get its latest alerts. Returns running status, change count, high-risk alert count, and the most recent flagged file.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] as string[] },
}

const NOT_RUNNING: WatchStatus = {
  running:          false,
  started_at:       '',
  changes_analyzed: 0,
  high_alerts:      0,
}

export async function handle(
  _args:   Record<string, unknown>,
  _config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const statusPath = path.join(process.cwd(), '.codemind', 'watch-status.json')
  try {
    const raw    = await fs.readFile(statusPath, 'utf8')
    const status = JSON.parse(raw) as WatchStatus
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
  } catch {
    return { content: [{ type: 'text', text: JSON.stringify(NOT_RUNNING, null, 2) }] }
  }
}
