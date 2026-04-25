import * as fs from 'fs/promises'
import { walkFiles } from '../graph/walker'
import type { Finding } from './report-types'

interface Pattern {
  type: Finding['type']
  severity: Finding['severity']
  re: RegExp
  message: string
}

const PATTERNS: Pattern[] = [
  {
    type: 'hardcoded_api_key',
    severity: 'CRITICAL',
    re: /(?:apiKey|api_key|API_KEY|secret|SECRET|token|TOKEN|password|PASSWORD)\s*[:=]\s*['"`][A-Za-z0-9_\-.]{20,}['"`]/,
    message: 'Potential hardcoded credential',
  },
  {
    type: 'hardcoded_secret',
    severity: 'CRITICAL',
    re: /(?:sk-ant-|sk-proj-|eyJ[A-Za-z0-9]{10}|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_)[A-Za-z0-9_\-.]{4,}/,
    message: 'Known API key format detected',
  },
  {
    type: 'dangerouslySetInnerHTML',
    severity: 'HIGH',
    re: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/,
    message: 'dangerouslySetInnerHTML — potential XSS vector',
  },
  {
    type: 'innerHTML',
    severity: 'HIGH',
    re: /\.innerHTML\s*=/,
    message: 'Direct innerHTML assignment — potential XSS',
  },
  {
    type: 'child_process',
    severity: 'HIGH',
    re: /(?:require\s*\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"])/,
    message: 'child_process import — command injection surface',
  },
  {
    type: 'weak_randomness',
    severity: 'MEDIUM',
    re: /Math\.random\s*\(\s*\)/,
    message: 'Math.random() is not cryptographically secure',
  },
]

const SKIP_LINE_RE = /^\s*(?:\/\/|\/\*|\*|#)/

export async function scanRepo(repoRoot: string): Promise<Finding[]> {
  const files = await walkFiles({ repoRoot, include: [], respectGitignore: false })
  const findings: Finding[] = []

  for (const file of files) {
    if (file.absolutePath.includes('.test.') || file.absolutePath.includes('.spec.')) continue
    let content: string
    try { content = await fs.readFile(file.absolutePath, 'utf8') } catch { continue }

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (SKIP_LINE_RE.test(line)) continue
      for (const p of PATTERNS) {
        if (p.re.test(line)) {
          findings.push({ type: p.type, severity: p.severity, file: file.relativePath, line: i + 1, message: p.message })
        }
      }
    }
  }

  return findings
}
