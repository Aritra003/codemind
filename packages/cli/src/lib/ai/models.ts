/**
 * AI task routing table — locked in ARCHITECTURE.md DL-010.
 * Never hardcode model strings elsewhere. All model selection goes through selectModel().
 *
 * ROUTING PRINCIPLE (resolved TITAN flag, 2026-04-24):
 *   Deep analysis / vision / long-form narration → Opus 4.7
 *   Bounded classification (fixed label set, no reasoning chain) → Haiku 4.5
 * This supersedes the ARCHITECTURE.md blanket-Opus default which was a conservative
 * first-draft. Explicit per-task justifications are in each entry below.
 */

export type AITask =
  | 'think-blast-radius'
  | 'vision-extract-diagram'
  | 'vision-resolve-entities'
  | 'forensics-triage'
  | 'forensics-narrate'
  | 'audit-think'
  | 'ask-question'
  | 'plan-refactor'

export interface ModelConfig {
  model:              string
  maxTokens:          number
  cacheSystemPrompt?: boolean
  vision?:            boolean
}

export const MODEL_ROUTING: Record<AITask, ModelConfig> = {
  // Deep structural analysis + risk narrative — needs reasoning. Opus.
  'think-blast-radius': {
    model:             'claude-opus-4-7',
    maxTokens:         2048,
    cacheSystemPrompt: true,
  },

  // Multimodal diagram parsing — vision required. Opus.
  'vision-extract-diagram': {
    model:     'claude-opus-4-7',
    maxTokens: 1024,
    vision:    true,
  },

  // DECISION LOCKED 2026-04-24: Haiku (not Opus).
  // Task: match diagram label strings → graph node names. Bounded classification,
  // no reasoning chain. Haiku accurate + ~60× cheaper than Opus.
  'vision-resolve-entities': {
    model:     'claude-haiku-4-5-20251001',
    maxTokens: 512,
  },

  // DECISION LOCKED 2026-04-24: Haiku (not Opus).
  // Task: classify error input into CODE|INFRA|CONFIG|NETWORK|UNKNOWN (5 labels).
  // Fixed-label classifier — Haiku achieves high accuracy at ~60× lower cost than Opus.
  'forensics-triage': {
    model:             'claude-haiku-4-5-20251001',
    maxTokens:         256,
    cacheSystemPrompt: true,
  },

  // Causal chain narration — long-form reasoning over commit history. Opus.
  'forensics-narrate': {
    model:             'claude-opus-4-7',
    maxTokens:         2048,
    cacheSystemPrompt: true,
  },

  // Audit report narrative — executive summary + working-well analysis. Opus.
  'audit-think': {
    model:             'claude-opus-4-7',
    maxTokens:         1024,
    cacheSystemPrompt: true,
  },

  // Graph-powered codebase Q&A — structural reasoning over graph context. Opus.
  'ask-question': {
    model:             'claude-opus-4-7',
    maxTokens:         4096,
    cacheSystemPrompt: true,
  },

  // Sequenced refactoring plan from dependency graph. Opus.
  'plan-refactor': {
    model:             'claude-opus-4-7',
    maxTokens:         8192,
    cacheSystemPrompt: true,
  },
}

export function selectModel(task: AITask): ModelConfig {
  return MODEL_ROUTING[task]
}
