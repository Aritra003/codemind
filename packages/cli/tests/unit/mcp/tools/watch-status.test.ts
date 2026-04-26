import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig } from '@stinkit/shared'

vi.mock('fs/promises')

import * as fsMod from 'fs/promises'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/watch-status'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const RUNNING_STATUS = {
  running:          true,
  started_at:       '2026-04-24T14:30:00Z',
  changes_analyzed: 14,
  high_alerts:      2,
  last_change: {
    file:       'src/auth/middleware.ts',
    risk:       'HIGH',
    dependents: 38,
    at:         '2026-04-24T14:34:22Z',
  },
}

describe('watch-status TOOL_DEF', () => {
  it('has name stinkit_watch_status', () => {
    expect(TOOL_DEF.name).toBe('stinkit_watch_status')
  })

  it('has empty inputSchema (no required args)', () => {
    expect(TOOL_DEF.inputSchema.required).toHaveLength(0)
  })
})

describe('handle', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns parsed status when watch-status.json exists', async () => {
    vi.mocked(fsMod.readFile).mockResolvedValue(JSON.stringify(RUNNING_STATUS) as never)
    const result = await handle({}, CONFIG)
    expect(result.content).toHaveLength(1)
    const parsed = JSON.parse(result.content[0]!.text) as typeof RUNNING_STATUS
    expect(parsed.running).toBe(true)
    expect(parsed.changes_analyzed).toBe(14)
    expect(parsed.high_alerts).toBe(2)
  })

  it('returns last_change data when present', async () => {
    vi.mocked(fsMod.readFile).mockResolvedValue(JSON.stringify(RUNNING_STATUS) as never)
    const result = await handle({}, CONFIG)
    const parsed = JSON.parse(result.content[0]!.text) as typeof RUNNING_STATUS
    expect(parsed.last_change?.file).toBe('src/auth/middleware.ts')
    expect(parsed.last_change?.risk).toBe('HIGH')
  })

  it('returns running:false when file does not exist', async () => {
    vi.mocked(fsMod.readFile).mockRejectedValue(new Error('ENOENT'))
    const result = await handle({}, CONFIG)
    const parsed = JSON.parse(result.content[0]!.text) as { running: boolean }
    expect(parsed.running).toBe(false)
  })

  it('returns running:false when file contains malformed JSON', async () => {
    vi.mocked(fsMod.readFile).mockResolvedValue('not-json' as never)
    const result = await handle({}, CONFIG)
    const parsed = JSON.parse(result.content[0]!.text) as { running: boolean }
    expect(parsed.running).toBe(false)
  })

  it('result content is valid JSON', async () => {
    vi.mocked(fsMod.readFile).mockRejectedValue(new Error('ENOENT'))
    const result = await handle({}, CONFIG)
    expect(() => JSON.parse(result.content[0]!.text)).not.toThrow()
  })
})
