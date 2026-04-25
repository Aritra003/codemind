import type { Finding, Severity, PriorityTier } from './report-types'

export interface ThemeDef {
  id:           string
  title:        string
  types:        string[]
  severity:     Severity
  priorityTier: PriorityTier
  effort:       string
  whatFound:    (f: Finding[]) => string
  whyDangerous: string
  whatToDo:     string
  whatIfNot:    string
}

function uniq(findings: Finding[]): number {
  return new Set(findings.map(f => f.file)).size
}

export const THEME_DEFS: ThemeDef[] = [
  {
    id: 'credential-exposure', title: 'Credential Exposure',
    types: ['hardcoded_api_key', 'hardcoded_secret'], severity: 'CRITICAL', priorityTier: 'TODAY',
    effort: '30 min – 1 hour per instance',
    whatFound: (f) => `${f.length} hardcoded credential${f.length > 1 ? 's' : ''} found across ${uniq(f)} file${uniq(f) > 1 ? 's' : ''}.`,
    whyDangerous: 'Any developer with repo access — or anyone who discovers it in a leak, CI log, or git history — can use this key to make API calls at your expense, read your data, or impersonate your service. Keys committed to source appear in Docker image layers, build artifacts, and log files permanently unless history is purged.',
    whatToDo: '1. Rotate all exposed keys immediately at the provider dashboard.\n2. Move to environment variables: process.env.MY_KEY.\n3. Add .env to .gitignore and create a .env.example with placeholder values.\n4. Install a pre-commit hook using gitleaks or detect-secrets to block future commits.\n5. Purge git history: bfg --replace-text secrets.txt && git push --force.',
    whatIfNot: 'Fails SOC2 CC6.1 and ISO 27001 A.9. Any future audit will flag this as critical. Keys in public repos are scraped by automated bots within minutes of being pushed.',
  },
  {
    id: 'xss-surface', title: 'Cross-Site Scripting (XSS) Surface',
    types: ['dangerouslySetInnerHTML', 'innerHTML'], severity: 'HIGH', priorityTier: 'THIS_SPRINT',
    effort: '15 – 30 min per instance',
    whatFound: (f) => `${f.length} direct HTML injection point${f.length > 1 ? 's' : ''} across ${uniq(f)} file${uniq(f) > 1 ? 's' : ''}.`,
    whyDangerous: 'If any part of the injected string comes from user input or an external source, an attacker can execute arbitrary JavaScript in the user\'s browser — stealing sessions, credentials, and redirecting to malicious pages. Stored XSS (content saved to DB) affects every subsequent viewer.',
    whatToDo: '1. npm install dompurify @types/dompurify\n2. Before: dangerouslySetInnerHTML={{ __html: content }}\n   After:  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}\n3. For direct assignments: element.innerHTML = DOMPurify.sanitize(val)\n4. Add Content-Security-Policy header blocking inline scripts as defense-in-depth.',
    whatIfNot: 'Users can be redirected to phishing pages. Session tokens can be stolen. Stored XSS (content saved to a database) affects all users who view the infected content.',
  },
  {
    id: 'circular-deps', title: 'Circular Dependencies',
    types: ['circular_dependency'], severity: 'MEDIUM', priorityTier: 'NEXT_SPRINT',
    effort: '2 – 4 hours per cycle',
    whatFound: (f) => `${f.length} circular dependency chain${f.length > 1 ? 's' : ''} detected.`,
    whyDangerous: 'You cannot safely refactor any file in a circular chain without risking breakage in all others. Node.js returns partially-initialized modules for circular imports, causing cryptic undefined errors at runtime. TypeScript project references cannot span circular boundaries.',
    whatToDo: '1. Visualize: npx madge --circular --extensions ts,tsx src/\n2. Identify the "core" module imported by all others in the cycle.\n3. Extract shared types into a new third module that neither A nor B imports from each other.\n4. Use dependency injection instead of direct imports where possible.\n5. Add eslint-plugin-import with import/no-cycle rule to block future regressions.',
    whatIfNot: 'Build times will keep increasing. New developers will spend hours debugging mysterious undefined values. TypeScript compilation may produce incorrect type errors in these files.',
  },
  {
    id: 'blast-radius-concentration', title: 'Blast Radius Concentration',
    types: ['over_coupled', 'missing_test_coverage'], severity: 'HIGH', priorityTier: 'THIS_SPRINT',
    effort: '1 – 3 hours per file',
    whatFound: (f) => `${f.length} high-blast-radius file${f.length > 1 ? 's' : ''} with no test coverage.`,
    whyDangerous: 'A single bug in a hub file with 50+ transitive dependents cascades across the entire application. Without test coverage, there is no safety net — a developer has no way to know what they broke until production.',
    whatToDo: '1. Add unit tests covering the public API of each high-blast-radius file.\n2. Target 80% line coverage for all files with >20 transitive dependents.\n3. Add integration tests exercising the most common call paths through each hub.\n4. Consider splitting large hub files into smaller, more focused modules.',
    whatIfNot: 'A single regression in a hub file can break 100+ features simultaneously. Deployment confidence decreases as the codebase grows harder to change safely.',
  },
  {
    id: 'orphaned-code', title: 'Orphaned Code',
    types: ['orphaned_file'], severity: 'LOW', priorityTier: 'NEXT_SPRINT',
    effort: '5 – 15 min per file',
    whatFound: (f) => `${f.length} file${f.length > 1 ? 's' : ''} with no known importers — possibly dead code.`,
    whyDangerous: 'Orphaned files increase cognitive load and bundle size. Security vulnerabilities in dead code are invisible — nobody knows to patch them. They create false context for AI tools and new developers.',
    whatToDo: '1. Verify each file is truly unreachable (check dynamic imports, CLI entry points, test fixtures).\n2. If confirmed dead: delete the file and run the full test suite.\n3. If a future entry point: add a comment explaining when it will be wired up.\n4. Add ts-prune or eslint-plugin-unused-imports to CI to catch future orphans.',
    whatIfNot: 'Bundle size will grow. New developers will study dead code and build incorrect mental models of the architecture.',
  },
  {
    id: 'command-injection', title: 'Command Injection Risk',
    types: ['child_process'], severity: 'HIGH', priorityTier: 'THIS_SPRINT',
    effort: '30 min – 1 hour per instance',
    whatFound: (f) => `${f.length} child_process usage${f.length > 1 ? 's' : ''} in ${uniq(f)} file${uniq(f) > 1 ? 's' : ''}.`,
    whyDangerous: 'If any argument passed to exec() or execSync() contains unsanitized user input, an attacker can inject shell commands. Even if input is trusted today, future refactoring may introduce the vulnerability without anyone noticing the security boundary was crossed.',
    whatToDo: '1. Prefer execFile() or spawn() with an argument array — no shell interpolation.\n2. Validate all arguments against an allowlist before passing to any child process.\n3. Set shell: false on spawn().\n4. Run Semgrep or Snyk targeting child_process patterns as part of CI.',
    whatIfNot: 'Remote code execution if any argument comes from user input. Server compromise. Fails OWASP A03:2021 (Injection).',
  },
  {
    id: 'weak-randomness', title: 'Weak Randomness',
    types: ['weak_randomness'], severity: 'MEDIUM', priorityTier: 'THIS_SPRINT',
    effort: '15 – 30 min per instance',
    whatFound: (f) => `${f.length} use${f.length > 1 ? 's' : ''} of Math.random() in ${uniq(f)} file${uniq(f) > 1 ? 's' : ''}.`,
    whyDangerous: 'Math.random() is not cryptographically secure. If used for security tokens, session IDs, verification codes, or nonces, an attacker can predict the output and forge values.',
    whatToDo: '1. Replace with crypto.randomBytes() or crypto.randomUUID() for any security-sensitive use.\n2. For non-security randomness (UI, A/B tests, simulations) Math.random() is acceptable — add a comment to mark it as non-security.\n3. Add eslint-plugin-security to flag Math.random() usages in CI.',
    whatIfNot: 'Predictable tokens can be forged. Session hijacking becomes trivial if session IDs are generated with Math.random().',
  },
]
