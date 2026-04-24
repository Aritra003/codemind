import pino from 'pino'

const isDev  = process.env['NODE_ENV'] !== 'production'
const level  = process.env['LOG_LEVEL'] ?? (isDev ? 'info' : 'warn')

export const logger = pino(
  {
    level,
    // PII redaction — matches OBSERVABILITY.md logger config
    redact: {
      paths: ['*.password', '*.key', '*.token', '*.secret', '*.authorization', '*.email', '*.ip'],
      censor: '[REDACTED]',
    },
  },
  isDev
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, destination: 2 } })
    : pino.destination(2),   // always write to stderr — never pollute stdout JSON
)
