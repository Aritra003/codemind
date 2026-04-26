import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TelemetryClient } from '../../../src/lib/telemetry/client'
import type { TelemetryConfig } from '@stinkit/shared'

const ENABLED_CONFIG:  TelemetryConfig = { enabled: true,  install_id: 'test-id' }
const DISABLED_CONFIG: TelemetryConfig = { enabled: false, install_id: 'test-id' }

describe('TelemetryClient — disabled', () => {
  it('does not queue events when disabled', () => {
    const client = new TelemetryClient(DISABLED_CONFIG)
    client.emit('TEST_EVENT', {})
    // flush on disabled client should not throw and should not call network
    return expect(client.flush()).resolves.toBeUndefined()
  })

  it('flush is a no-op when disabled', async () => {
    const client = new TelemetryClient(DISABLED_CONFIG)
    await expect(client.flush()).resolves.toBeUndefined()
  })
})

describe('TelemetryClient — enabled', () => {
  let client: TelemetryClient
  let sendSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    client = new TelemetryClient(ENABLED_CONFIG)
    // Spy on the private sendBatch via prototype patching
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendSpy = vi.spyOn(client as any, 'sendBatch').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('enqueues events and flushes them', async () => {
    client.emit('K-03', { risk_level: 'LOW' })
    client.emit('K-04', { risk_level: 'CRITICAL' })
    await client.flush()
    expect(sendSpy).toHaveBeenCalledOnce()
    const [batch] = sendSpy.mock.calls[0] as [unknown[]]
    expect(batch).toHaveLength(2)
  })

  it('batches at most 50 events per flush call', async () => {
    for (let i = 0; i < 75; i++) {
      client.emit('TEST', { i })
    }
    await client.flush()
    const [firstBatch] = sendSpy.mock.calls[0] as [unknown[]]
    expect(firstBatch).toHaveLength(50)
  })

  it('drains queue across multiple flush calls', async () => {
    for (let i = 0; i < 75; i++) {
      client.emit('TEST', { i })
    }
    await client.flush()
    await client.flush()
    const allSent = (sendSpy.mock.calls as [unknown[]][]).flatMap(([b]) => b)
    expect(allSent).toHaveLength(75)
  })

  it('never throws even if sendBatch throws', async () => {
    sendSpy.mockRejectedValue(new Error('network failure'))
    client.emit('K-03', {})
    await expect(client.flush()).resolves.toBeUndefined()
  })

  it('includes event_name, install_id, and timestamp in queued event', async () => {
    const before = Date.now()
    client.emit('K-03', { foo: 'bar' })
    await client.flush()
    const [batch] = sendSpy.mock.calls[0] as [Array<{ event_name: string; install_id: string; timestamp: number; properties: unknown }>]
    const event = batch[0]!
    expect(event.event_name).toBe('K-03')
    expect(event.install_id).toBe('test-id')
    expect(event.timestamp).toBeGreaterThanOrEqual(before)
    expect(event.properties).toMatchObject({ foo: 'bar' })
  })
})
