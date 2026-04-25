export function safeParseJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    return match ? (JSON.parse(match[0]) as T) : fallback
  } catch { return fallback }
}
