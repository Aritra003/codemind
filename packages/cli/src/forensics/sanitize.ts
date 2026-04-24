import { InjectionAttemptError } from '../lib/errors'

const MAX_LEN = 500

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+previous\s+instructions/i,
  /you\s+are\s+now\b/i,
  /\bsystem\s+prompt\b/i,
  /<\|im_start\|>/i,
]

// U+200B/C/D ZWSP/ZWNJ/ZWJ, U+FEFF BOM, U+2060 Word Joiner — injection obfuscation (TD-001)
const ZERO_WIDTH_RE = new RegExp('[​‌‍﻿⁠]', 'g')

export function sanitizeErrorInput(raw: string): string {
  const normalized = raw.normalize('NFC').replace(ZERO_WIDTH_RE, '')
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) throw new InjectionAttemptError(pattern.toString())
  }
  return normalized.length > MAX_LEN ? normalized.slice(0, MAX_LEN) : normalized
}
