import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig } from '@stinkit/shared'

const mockSetRequestHandler = vi.hoisted(() => vi.fn())
const mockConnect           = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@modelcontextprotocol/sdk/server', () => ({
  Server: vi.fn(() => {
    const obj: Record<string, unknown> = {
      setRequestHandler: mockSetRequestHandler,
      connect:           mockConnect,
    }
    // Fire onclose immediately when assigned — simulates instant client disconnect
    // so startMcpServer's keepalive Promise resolves and tests don't hang.
    Object.defineProperty(obj, 'onclose', {
      set(fn: () => void) { fn() },
      configurable: true,
    })
    return obj
  }),
}))
vi.mock('@modelcontextprotocol/sdk/server/stdio', () => ({
  StdioServerTransport: vi.fn(() => ({})),
}))

import { startMcpServer } from '../../../src/lib/mcp/server'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

describe('startMcpServer', () => {
  beforeEach(() => {
    mockSetRequestHandler.mockClear()
    mockConnect.mockClear()
  })

  it('registers two request handlers (ListTools + CallTools)', async () => {
    await startMcpServer(CONFIG)
    expect(mockSetRequestHandler).toHaveBeenCalledTimes(2)
  })

  it('calls connect to start the transport', async () => {
    await startMcpServer(CONFIG)
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })

  it('ListTools handler returns exactly 8 tools', async () => {
    await startMcpServer(CONFIG)
    const listHandler = mockSetRequestHandler.mock.calls[0]?.[1] as () => Promise<{ tools: unknown[] }>
    const result = await listHandler()
    expect(result.tools).toHaveLength(8)
  })

  it('each tool name starts with "stinkit_"', async () => {
    await startMcpServer(CONFIG)
    const listHandler = mockSetRequestHandler.mock.calls[0]?.[1] as () => Promise<{ tools: Array<{ name: string }> }>
    const { tools } = await listHandler()
    for (const tool of tools) {
      expect(tool.name).toMatch(/^stinkit_/)
    }
  })

  it('CallTools handler returns error content for unknown tool', async () => {
    await startMcpServer(CONFIG)
    const callHandler = mockSetRequestHandler.mock.calls[1]?.[1] as (
      req: { params: { name: string; arguments: Record<string, unknown> } }
    ) => Promise<{ content: Array<{ type: string; text: string }> }>
    const result = await callHandler({ params: { name: 'unknown_tool', arguments: {} } })
    expect(result.content[0]!.text).toContain('unknown_tool')
  })
})
