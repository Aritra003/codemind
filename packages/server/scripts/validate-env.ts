/**
 * Startup environment validation — runs before the server binds to any port.
 * Fails fast on missing required vars. Logs a startup readiness report.
 *
 * Rule: every new external service dependency added to INFRASTRUCTURE.md
 *       must have its required env vars declared here before deploy.
 */

import { logger } from '../src/lib/logger'

interface EnvSpec {
  required: readonly string[]
  optional: readonly string[]
  redacted: readonly string[]  // present in log as [SET] or [MISSING], never value
}

const ENV_SPEC: EnvSpec = {
  required: [
    // Server
    'NODE_ENV',
    'PORT',
    // Database
    'DATABASE_URL',
    // Redis
    'REDIS_URL',
    // Authentication
    'JWT_SECRET',
    // Stripe
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    // Email
    'RESEND_API_KEY',
    'EMAIL_FROM',
    // ClickHouse (telemetry)
    'CLICKHOUSE_URL',
    'CLICKHOUSE_DATABASE',
    // GitHub OAuth
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
    // App URLs
    'APP_URL',
    'API_URL',
  ],

  optional: [
    // Observability — required in prod, optional in dev/test
    'SENTRY_DSN',
    'LOG_LEVEL',
    'PINO_TRANSPORT',
    // Rate limiting — default to permissive if not set (with warning)
    'RATE_LIMIT_MAX_REQUESTS_PER_MINUTE',
    // HaveIBeenPwned — required in prod (SV-001), optional in dev
    'HIBP_API_KEY',
  ],

  redacted: [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'CLICKHOUSE_URL',
    'GITHUB_CLIENT_SECRET',
    'HIBP_API_KEY',
    'REDIS_URL',
  ],
}

interface ValidationResult {
  missing: string[]
  present: string[]
  warnings: string[]
}

function validate(): ValidationResult {
  const missing: string[] = []
  const present: string[] = []
  const warnings: string[] = []

  for (const key of ENV_SPEC.required) {
    if (!process.env[key]) {
      missing.push(key)
    } else {
      present.push(key)
    }
  }

  // Optional with warnings
  if (!process.env['SENTRY_DSN'] && process.env['NODE_ENV'] === 'production') {
    warnings.push('SENTRY_DSN not set — error tracking disabled in production')
  }
  if (!process.env['HIBP_API_KEY'] && process.env['NODE_ENV'] === 'production') {
    warnings.push('HIBP_API_KEY not set — HaveIBeenPwned check disabled (SV-001 veto not resolved)')
  }
  if (!process.env['RATE_LIMIT_MAX_REQUESTS_PER_MINUTE']) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS_PER_MINUTE not set — using default 100')
  }

  return { missing, present, warnings }
}

function formatForLog(key: string): string {
  if (ENV_SPEC.redacted.includes(key)) {
    return process.env[key] ? '[SET]' : '[MISSING]'
  }
  return process.env[key] ?? '[MISSING]'
}

export function validateEnv(): void {
  const { missing, present, warnings } = validate()
  const isProduction = process.env['NODE_ENV'] === 'production'

  // Log the startup readiness report (INFO level — visible in CloudWatch)
  logger.info({
    event: 'startup_env_validation',
    environment: process.env['NODE_ENV'],
    present_count: present.length,
    missing_count: missing.length,
    warnings_count: warnings.length,
    vars: Object.fromEntries(
      [...ENV_SPEC.required, ...ENV_SPEC.optional].map((key) => [key, formatForLog(key)])
    ),
  }, 'Environment validation')

  for (const warning of warnings) {
    logger.warn({ event: 'env_warning', message: warning }, warning)
  }

  if (missing.length > 0) {
    logger.error(
      {
        event: 'startup_env_missing',
        missing_vars: missing,
        hint: 'Set missing vars in Secrets Manager and redeploy. See packages/server/.env.example',
      },
      `Server startup aborted — ${missing.length} required environment variable(s) missing: ${missing.join(', ')}`
    )
    // Hard fail — never start with missing required vars
    process.exit(1)
  }

  // Production-specific checks
  if (isProduction) {
    const dangerousDefaults: Array<[string, string]> = [
      ['JWT_SECRET', 'changeme'],
      ['JWT_SECRET', 'secret'],
      ['JWT_SECRET', 'dev'],
      ['JWT_SECRET', 'development'],
    ]
    for (const [key, insecureValue] of dangerousDefaults) {
      if (process.env[key] === insecureValue) {
        logger.error(
          { event: 'startup_insecure_secret', key },
          `FATAL: ${key} is set to an insecure default value in production. Aborting.`
        )
        process.exit(1)
      }
    }

    // Validate DATABASE_URL format (must not be pointing to localhost in prod)
    const dbUrl = process.env['DATABASE_URL'] ?? ''
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      logger.error(
        { event: 'startup_local_db_in_prod', hint: 'DATABASE_URL points to localhost in production' },
        'FATAL: DATABASE_URL points to localhost — not acceptable in production.'
      )
      process.exit(1)
    }

    logger.info(
      { event: 'startup_env_valid', environment: 'production' },
      'All required environment variables present. Server starting.'
    )
  }
}
