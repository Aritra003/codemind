import { describe, it, expect } from 'vitest'
import {
  StinKitError,
  AITimeoutError,
  GraphStaleError,
  GraphMissingError,
  InjectionAttemptError,
} from '../../../src/lib/errors'

describe('StinKitError', () => {
  it('stores code and message', () => {
    const e = new StinKitError('TEST_CODE', 'something went wrong')
    expect(e.code).toBe('TEST_CODE')
    expect(e.message).toBe('something went wrong')
    expect(e.hint).toBeUndefined()
  })

  it('stores optional hint', () => {
    const e = new StinKitError('C', 'm', 'try this')
    expect(e.hint).toBe('try this')
  })

  it('is an instance of Error', () => {
    expect(new StinKitError('X', 'y')).toBeInstanceOf(Error)
  })

  it('name is StinKitError', () => {
    expect(new StinKitError('X', 'y').name).toBe('StinKitError')
  })
})

describe('AITimeoutError', () => {
  it('is instanceof StinKitError', () => {
    const e = new AITimeoutError('task timed out after 30s')
    expect(e).toBeInstanceOf(StinKitError)
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('AI_TIMEOUT')
  })

  it('name is AITimeoutError', () => {
    expect(new AITimeoutError('x').name).toBe('AITimeoutError')
  })
})

describe('GraphStaleError', () => {
  it('is instanceof StinKitError with correct code', () => {
    const e = new GraphStaleError(8)
    expect(e).toBeInstanceOf(StinKitError)
    expect(e.code).toBe('GRAPH_STALE')
    expect(e.message).toContain('8')
  })
})

describe('GraphMissingError', () => {
  it('is instanceof StinKitError with correct code', () => {
    const e = new GraphMissingError('/path/to/repo')
    expect(e).toBeInstanceOf(StinKitError)
    expect(e.code).toBe('GRAPH_MISSING')
    expect(e.hint).toBeDefined()
  })
})

describe('InjectionAttemptError', () => {
  it('is instanceof StinKitError with correct code', () => {
    const e = new InjectionAttemptError('ignore previous instructions')
    expect(e).toBeInstanceOf(StinKitError)
    expect(e.code).toBe('INJECTION_ATTEMPT')
    expect(e.message).toContain('ignore previous instructions')
  })
})
