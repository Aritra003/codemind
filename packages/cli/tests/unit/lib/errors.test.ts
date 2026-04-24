import { describe, it, expect } from 'vitest'
import {
  CodemindError,
  AITimeoutError,
  GraphStaleError,
  GraphMissingError,
  InjectionAttemptError,
} from '../../../src/lib/errors'

describe('CodemindError', () => {
  it('stores code and message', () => {
    const e = new CodemindError('TEST_CODE', 'something went wrong')
    expect(e.code).toBe('TEST_CODE')
    expect(e.message).toBe('something went wrong')
    expect(e.hint).toBeUndefined()
  })

  it('stores optional hint', () => {
    const e = new CodemindError('C', 'm', 'try this')
    expect(e.hint).toBe('try this')
  })

  it('is an instance of Error', () => {
    expect(new CodemindError('X', 'y')).toBeInstanceOf(Error)
  })

  it('name is CodemindError', () => {
    expect(new CodemindError('X', 'y').name).toBe('CodemindError')
  })
})

describe('AITimeoutError', () => {
  it('is instanceof CodemindError', () => {
    const e = new AITimeoutError('task timed out after 30s')
    expect(e).toBeInstanceOf(CodemindError)
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('AI_TIMEOUT')
  })

  it('name is AITimeoutError', () => {
    expect(new AITimeoutError('x').name).toBe('AITimeoutError')
  })
})

describe('GraphStaleError', () => {
  it('is instanceof CodemindError with correct code', () => {
    const e = new GraphStaleError(8)
    expect(e).toBeInstanceOf(CodemindError)
    expect(e.code).toBe('GRAPH_STALE')
    expect(e.message).toContain('8')
  })
})

describe('GraphMissingError', () => {
  it('is instanceof CodemindError with correct code', () => {
    const e = new GraphMissingError('/path/to/repo')
    expect(e).toBeInstanceOf(CodemindError)
    expect(e.code).toBe('GRAPH_MISSING')
    expect(e.hint).toBeDefined()
  })
})

describe('InjectionAttemptError', () => {
  it('is instanceof CodemindError with correct code', () => {
    const e = new InjectionAttemptError('ignore previous instructions')
    expect(e).toBeInstanceOf(CodemindError)
    expect(e.code).toBe('INJECTION_ATTEMPT')
    expect(e.message).toContain('ignore previous instructions')
  })
})
