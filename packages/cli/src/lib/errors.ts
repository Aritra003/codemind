export class StinKitError extends Error {
  constructor(
    public readonly code:  string,
    message:               string,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = 'StinKitError'
    // Restore prototype chain broken by extending Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AITimeoutError extends StinKitError {
  constructor(message: string) {
    super('AI_TIMEOUT', message, 'Check your network connection or try again.')
    this.name = 'AITimeoutError'
  }
}

export class GraphStaleError extends StinKitError {
  constructor(ageDays: number) {
    super(
      'GRAPH_STALE',
      `Code graph is ${ageDays} days old.`,
      'Run `stinkit index` to rebuild.',
    )
    this.name = 'GraphStaleError'
  }
}

export class GraphMissingError extends StinKitError {
  constructor(repoRoot: string) {
    super(
      'GRAPH_MISSING',
      `No code graph found for ${repoRoot}.`,
      'Run `stinkit index` to build the graph first.',
    )
    this.name = 'GraphMissingError'
  }
}

export class InjectionAttemptError extends StinKitError {
  constructor(detectedPattern: string) {
    super(
      'INJECTION_ATTEMPT',
      `Prompt injection attempt detected: ${detectedPattern}`,
      'Input has been sanitized and the event has been logged.',
    )
    this.name = 'InjectionAttemptError'
  }
}

export class UnsupportedFormatError extends StinKitError {
  constructor(format: string) {
    super(
      'UNSUPPORTED_FORMAT',
      `Image format not supported: ${format}`,
      'Convert to PNG or JPG before using stinkit see.',
    )
    this.name = 'UnsupportedFormatError'
  }
}
