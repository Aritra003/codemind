import * as path from 'path'
import * as fs   from 'fs/promises'
import { formatError } from '../lib/output/format'
import { startWatch }  from './watcher'
import type { WatchOptions } from './watcher'

export async function runWatch(opts: Record<string, unknown>): Promise<void> {
  const storeDir = path.join(process.cwd(), '.stinkit')

  try {
    await fs.access(path.join(storeDir, 'graph.msgpack'))
  } catch {
    process.stderr.write(
      formatError('NO_GRAPH', 'No graph found.', 'Run `stinkit index` first.') + '\n',
    )
    process.exit(1)
  }

  const rawDebounce = opts['debounce']
  const debounceMs  = rawDebounce ? parseInt(String(rawDebounce), 10) : 2000

  const watchOptions: WatchOptions = { debounceMs }
  if (typeof opts['scope'] === 'string') watchOptions.scope = opts['scope']

  if (opts['thinkOnCritical']) {
    process.stderr.write('  ⚠ --think-on-critical is coming soon. Running in standard mode.\n')
  }

  await startWatch(watchOptions)
}
