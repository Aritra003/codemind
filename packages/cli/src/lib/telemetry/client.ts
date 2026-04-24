import type { TelemetryConfig } from '@codemind/shared'

const BATCH_SIZE    = 50
const FLUSH_INTERVAL_MS = 60_000
const ENDPOINT      = 'https://telemetry.codemind.dev/v1/events'

export interface TelemetryEvent {
  event_name:  string
  install_id:  string
  properties:  Record<string, unknown>
  timestamp:   number
}

export class TelemetryClient {
  private readonly enabled:    boolean
  private readonly installId:  string
  private readonly queue:      TelemetryEvent[] = []
  private flushTimer:          ReturnType<typeof setTimeout> | null = null

  constructor(config: TelemetryConfig) {
    this.enabled   = config.enabled
    this.installId = config.install_id
  }

  /** Enqueue an event. Fire-and-forget — never awaited by callers. */
  emit(eventName: string, properties: Record<string, unknown> = {}): void {
    if (!this.enabled) return
    this.queue.push({
      event_name:  eventName,
      install_id:  this.installId,
      properties,
      timestamp:   Date.now(),
    })
    this.scheduleFlush()
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.queue.length === 0) return
    const batch = this.queue.splice(0, BATCH_SIZE)
    try {
      await this.sendBatch(batch)
    } catch {
      // Intentionally swallowed — telemetry never surfaces errors to users
    }
  }

  async flushAndClose(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => { void this.flush() }, FLUSH_INTERVAL_MS)
    this.flushTimer.unref()   // never keep the process alive waiting for telemetry
  }

  private async sendBatch(events: TelemetryEvent[]): Promise<void> {
    await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ events }),
      signal:  AbortSignal.timeout(5_000),
    })
  }
}
