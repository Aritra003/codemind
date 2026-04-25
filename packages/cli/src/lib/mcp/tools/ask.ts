import type { UserConfig } from '@codemind/shared'
import { runAskCore } from '../../../commands/ask'

export const TOOL_DEF = {
  name:        'codemind_ask',
  description: 'Ask a natural language question about codebase architecture. Uses the code graph + Opus to explain how code connects, what depends on what, and what is safe to change. Use when the developer asks HOW something works, WHY code is structured a certain way, or WHERE to start reading unfamiliar code.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Natural language question about the codebase architecture or structure' },
    },
    required: ['question'],
  },
}

export async function handle(
  args:   Record<string, unknown>,
  config: UserConfig,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const question = typeof args['question'] === 'string' ? args['question'] : ''
  if (!question) return { content: [{ type: 'text', text: 'Error: question is required' }] }

  const result = await runAskCore(question, config)
  if (result.status === 'failed') {
    return { content: [{ type: 'text', text: `Error: ${result.error.message}${result.error.hint ? ` (${result.error.hint})` : ''}` }] }
  }

  return { content: [{ type: 'text', text: result.data.answer }] }
}
