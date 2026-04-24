/**
 * ONLY file allowed to import @anthropic-ai/sdk (INV-005 + SV-002).
 * All AI calls route through this module. No other file may import Anthropic directly.
 */
// eslint-disable-next-line no-restricted-imports
import Anthropic from '@anthropic-ai/sdk'
import { selectModel } from './models'
import type { UserConfig, BlastRadius } from '@codemind/shared'
import type { ForensicsTrace } from '../../commands/trace'
import { AITimeoutError } from '../errors'

const TIMEOUT_MS = 30_000
const CAP        = 0.8    // INV-004: confidence never exceeds 0.8

export class AIClient {
  private readonly client: Anthropic
  private readonly maxRetries: number

  constructor(private readonly config: UserConfig) {
    const apiKey = config.anthropic_api_key ?? process.env['ANTHROPIC_API_KEY']
    if (!apiKey) throw new AITimeoutError('Anthropic API key required. Set ANTHROPIC_API_KEY or run: codemind config set anthropic_api_key sk-ant-...')
    this.client    = new Anthropic({ apiKey })
    this.maxRetries = config.ai.max_retries
  }

  async analyzeBlastRadius(radius: BlastRadius, summary: GraphSummaryForAI): Promise<AIAnalysis> {
    const { model, maxTokens, cacheSystemPrompt } = selectModel('think-blast-radius')
    const systemText = 'Analyze this code change impact. Respond only with JSON: {"risk_summary":"...","recommendation":"...","confidence":0.7}'
    const msg = await this.callWithRetry('analyzeBlastRadius', () => this.client.messages.create({
      model, max_tokens: maxTokens,
      system:   cacheSystemPrompt ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }] as unknown as Anthropic.Messages.TextBlockParam[] : systemText,
      messages: [{ role: 'user', content: JSON.stringify({ radius: { changed_nodes: radius.changed_nodes.length, direct: radius.direct_dependents.length, transitive: radius.transitive_dependents.length }, summary }) }],
    }))
    const text   = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}'
    const parsed = safeParseJson<{ risk_summary?: string; recommendation?: string; confidence?: number }>(text, {})
    return {
      risk_summary:   parsed.risk_summary   ?? 'Unable to parse response',
      recommendation: parsed.recommendation ?? 'Unable to parse response',
      confidence:     Math.min(parsed.confidence ?? 0.5, CAP),
      tokens_used:    msg.usage.input_tokens + msg.usage.output_tokens,
      model,
    }
  }

  async extractDiagramEntities(imagePath: string): Promise<DiagramExtractionResult> {
    const { model, maxTokens } = selectModel('vision-extract-diagram')
    const imageData = await import('fs/promises').then(fs => fs.readFile(imagePath))
    const msg = await this.callWithRetry('extractDiagramEntities', () => this.client.messages.create({
      model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData.toString('base64') } },
        { type: 'text', text: 'List all named components/modules. Respond JSON: {"entities":[],"confidence":0.8}' },
      ]}],
    }))
    const text   = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}'
    const parsed = safeParseJson<{ entities?: string[]; confidence?: number }>(text, {})
    return {
      entities:   parsed.entities   ?? [],
      confidence: Math.min(parsed.confidence ?? 0.5, CAP),
      retries:    0,
      partial:    false,
    }
  }

  async resolveEntityNames(extracted: string[], graphNodeNames: string[]): Promise<EntityResolutionResult[]> {
    const { model, maxTokens } = selectModel('vision-resolve-entities')
    const msg = await this.callWithRetry('resolveEntityNames', () => this.client.messages.create({
      model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: `Match each label to a graph node. Labels: ${JSON.stringify(extracted)}. Nodes: ${JSON.stringify(graphNodeNames)}. Respond JSON array: [{"diagram_label":"...","matched_node_id":"...","confidence":0.7}]` }],
    }))
    const text   = msg.content[0]?.type === 'text' ? msg.content[0].text : '[]'
    const parsed = safeParseJson<EntityResolutionResult[]>(text, [])
    return parsed.map(r => ({ ...r, confidence: Math.min(r.confidence, CAP) }))
  }

  async narrateTrace(trace: Pick<ForensicsTrace, 'ranked_commits' | 'origin_classification' | 'code_paths'>): Promise<string> {
    const { model, maxTokens, cacheSystemPrompt } = selectModel('forensics-narrate')
    const systemText = 'Narrate the root cause chain from this forensics trace in plain English.'
    const msg = await this.callWithRetry('narrateTrace', () => this.client.messages.create({
      model, max_tokens: maxTokens,
      system:   cacheSystemPrompt ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }] as unknown as Anthropic.Messages.TextBlockParam[] : systemText,
      messages: [{ role: 'user', content: JSON.stringify(trace) }],
    }))
    return msg.content[0]?.type === 'text' ? msg.content[0].text : ''
  }

  async triageError(sanitizedInput: string): Promise<{ symbols: string[]; likely_domain: string }> {
    const { model, maxTokens, cacheSystemPrompt } = selectModel('forensics-triage')
    const systemText = 'Classify this error. Respond JSON: {"symbols":[],"likely_domain":"CODE|INFRA|CONFIG|NETWORK|UNKNOWN"}'
    const msg = await this.callWithRetry('triageError', () => this.client.messages.create({
      model, max_tokens: maxTokens,
      system:   cacheSystemPrompt ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }] as unknown as Anthropic.Messages.TextBlockParam[] : systemText,
      messages: [{ role: 'user', content: sanitizedInput }],
    }))
    const text   = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}'
    const parsed = safeParseJson<{ symbols?: string[]; likely_domain?: string }>(text, {})
    return { symbols: parsed.symbols ?? [], likely_domain: parsed.likely_domain ?? 'UNKNOWN' }
  }

  private async callWithRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let last: Error = new Error('no attempts')
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try { return await this.callWithTimeout(fn, label) } catch (e) {
        last = e as Error
        if (e instanceof AITimeoutError) throw e  // timeout = non-retriable
      }
    }
    throw last
  }

  private callWithTimeout<T>(fn: () => Promise<T>, label: string): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new AITimeoutError(`${label} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      ),
    ])
  }
}

function safeParseJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    return match ? (JSON.parse(match[0]) as T) : fallback
  } catch { return fallback }
}

/** Structural summary passed to Opus — contains NO source code (INV-005). */
export interface GraphSummaryForAI {
  changed_nodes:         Array<{ id: string; name: string; kind: string; file_relative: string }>
  direct_dependents:     Array<{ id: string; name: string; kind: string }>
  transitive_count:      number
  coverage_gap_count:    number
  incident_history:      boolean
  completeness_pct:      number
  top_risk_paths:        string[][]
}

export interface AIAnalysis {
  risk_summary:   string
  recommendation: string
  confidence:     number    // always <= 0.8 (INV-004)
  tokens_used:    number
  model:          string
}

export interface DiagramExtractionResult {
  entities:   string[]
  confidence: number
  retries:    number
  partial:    boolean
}

export interface EntityResolutionResult {
  diagram_label:   string
  matched_node_id: string | null
  confidence:      number
}
