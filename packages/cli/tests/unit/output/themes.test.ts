import { describe, it, expect } from 'vitest'
import { RISK_SYMBOL, RISK_COLOR, BRAND_COLOR } from '../../../src/lib/output/themes'

const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const

describe('RISK_SYMBOL', () => {
  it('has an entry for every RiskLevel', () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_SYMBOL[level]).toBeDefined()
      expect(typeof RISK_SYMBOL[level]).toBe('string')
    }
  })

  it('symbols are single unicode characters (not multi-char strings)', () => {
    for (const level of RISK_LEVELS) {
      // [...str].length handles emoji/multi-byte correctly
      expect([...RISK_SYMBOL[level]!].length).toBe(1)
    }
  })
})

describe('RISK_COLOR', () => {
  it('has a chalk function for every RiskLevel', () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_COLOR[level]).toBeDefined()
      expect(typeof RISK_COLOR[level]).toBe('function')
    }
  })

  it('color functions return a string when called', () => {
    for (const level of RISK_LEVELS) {
      const result = RISK_COLOR[level]!('test')
      expect(typeof result).toBe('string')
      expect(result).toContain('test')
    }
  })
})

describe('BRAND_COLOR', () => {
  it('is defined and is a function', () => {
    expect(BRAND_COLOR).toBeDefined()
    expect(typeof BRAND_COLOR).toBe('function')
  })

  it('returns a string when called', () => {
    expect(typeof BRAND_COLOR('CodeMind')).toBe('string')
  })
})
