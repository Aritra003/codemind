/** ~/.stinkit/config.yaml shape. Parsed with js-yaml at CLI startup. */
export interface UserConfig {
  /** User's own Anthropic API key — never logged, never sent to StinKit servers. */
  anthropic_api_key?: string

  telemetry: TelemetryConfig
  ai:        AIConfig
  limits:    LimitConfig
}

export interface TelemetryConfig {
  enabled: boolean     // opt-in (ANALYTICS-SCHEMA.md)
  install_id: string   // random UUID, generated on first run, never changes
}

export interface AIConfig {
  /** Monthly token budget in input tokens. Default: 500_000. */
  monthly_token_budget: number
  /** Max retries on transient AI errors. Default: 2. */
  max_retries: number
}

export interface LimitConfig {
  /** Max nodes to include in AI context. Default: 200. */
  ai_context_max_nodes: number
}

export const DEFAULT_CONFIG: UserConfig = {
  telemetry: {
    enabled:    false,
    install_id: '',       // generated on first run
  },
  ai: {
    monthly_token_budget: 500_000,
    max_retries:          2,
  },
  limits: {
    ai_context_max_nodes: 200,
  },
}
