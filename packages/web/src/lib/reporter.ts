import type { FileEntry, Graph, GraphEdge } from "./indexer";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityFinding = {
  file: string;
  issue: string;
  severity: Severity;
  language: string;
  snippet?: string;
  description?: string;
  remediation?: string;
};

export type ActionPriority = "P0" | "P1" | "P2";
export type ActionCategory = "security" | "architecture" | "coupling" | "testing" | "cleanup";

export type ActionItem = {
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  whatIsWrong: string;
  whyItMatters: string;
  howToFix: string;
  files: string[];
};

export type HealthArea = { label: string; detail: string };

export type ReportData = {
  repoId: string;
  repoName: string;
  generatedAt: string;
  summary: {
    totalFiles: number;
    totalEdges: number;
    languages: string[];
    securityScore: number;
    riskLevel: Severity;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  actions: ActionItem[];
  healthyAreas: HealthArea[];
  performance: {
    hotspots: { file: string; dependents: number; riskLevel: Severity }[];
    avgBlastRadius: number;
    maxBlastRadius: number;
    orphanedFiles: string[];
  };
  security: { findings: SecurityFinding[] };
  dataFlow: {
    circularDependencies: string[][];
    mostConnected: { file: string; inDegree: number; outDegree: number }[];
  };
  inefficiencies: {
    orphanedFiles: string[];
    overCoupled: { file: string; connections: number }[];
  };
  coverage: { estimatedScore: number; highRiskUncovered: string[] };
};

// ── Security patterns ──────────────────────────────────────────────────────────

type Pattern = { re: RegExp; issue: string; severity: Severity };

const COMMON: Pattern[] = [
  { re: /password\s*[=:]\s*['"][^'"]{4,}['"]/gi,  issue: "Hardcoded password",        severity: "CRITICAL" },
  { re: /api[_-]?key\s*[=:]\s*['"][^'"]{8,}['"]/gi, issue: "Hardcoded API key",       severity: "CRITICAL" },
  { re: /secret\s*[=:]\s*['"][^'"]{8,}['"]/gi,    issue: "Hardcoded secret",           severity: "HIGH" },
  { re: /private[_-]?key\s*[=:]\s*['"][^'"]+['"]/gi, issue: "Hardcoded private key",  severity: "CRITICAL" },
  { re: /BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY/g, issue: "Private key literal in source", severity: "CRITICAL" },
];

const BY_LANG: Record<string, Pattern[]> = {
  typescript: [
    { re: /\beval\s*\(/g,             issue: "eval() — code injection risk",         severity: "CRITICAL" },
    { re: /innerHTML\s*=/g,           issue: "innerHTML — XSS risk",                 severity: "HIGH" },
    { re: /dangerouslySetInnerHTML/g, issue: "dangerouslySetInnerHTML — XSS risk",   severity: "HIGH" },
    { re: /document\.write\s*\(/g,    issue: "document.write() — XSS risk",          severity: "HIGH" },
    { re: /new Function\s*\(/g,       issue: "Dynamic Function() — injection risk",  severity: "HIGH" },
    { re: /child_process/g,           issue: "child_process — command injection risk", severity: "MEDIUM" },
    { re: /Math\.random\(\)/g,        issue: "Math.random() not cryptographically secure", severity: "LOW" },
  ],
  javascript: [
    { re: /\beval\s*\(/g,             issue: "eval() — code injection risk",         severity: "CRITICAL" },
    { re: /innerHTML\s*=/g,           issue: "innerHTML — XSS risk",                 severity: "HIGH" },
    { re: /document\.write\s*\(/g,    issue: "document.write() — XSS risk",          severity: "HIGH" },
    { re: /new Function\s*\(/g,       issue: "Dynamic Function() — injection risk",  severity: "HIGH" },
    { re: /child_process/g,           issue: "child_process — command injection risk", severity: "MEDIUM" },
  ],
  python: [
    { re: /\beval\s*\(/g,             issue: "eval() — code injection risk",         severity: "CRITICAL" },
    { re: /\bexec\s*\(/g,             issue: "exec() — code injection risk",         severity: "CRITICAL" },
    { re: /shell\s*=\s*True/g,        issue: "subprocess shell=True — command injection", severity: "CRITICAL" },
    { re: /os\.system\s*\(/g,         issue: "os.system() — command injection risk", severity: "HIGH" },
    { re: /pickle\.loads?\s*\(/g,     issue: "pickle.load() — arbitrary code execution", severity: "HIGH" },
    { re: /yaml\.load\s*\(/g,         issue: "yaml.load() unsafe — use yaml.safe_load()", severity: "HIGH" },
    { re: /hashlib\.md5\s*\(/g,       issue: "MD5 is cryptographically broken",      severity: "MEDIUM" },
    { re: /hashlib\.sha1\s*\(/g,      issue: "SHA-1 is cryptographically weak",      severity: "MEDIUM" },
    { re: /assert\s+/g,               issue: "assert can be disabled with -O flag",  severity: "LOW" },
  ],
  go: [
    { re: /exec\.Command/g,           issue: "exec.Command — review for injection",  severity: "MEDIUM" },
    { re: /fmt\.Sprintf.*(SELECT|INSERT|UPDATE|DELETE)/gi, issue: "SQL via Sprintf — injection risk", severity: "HIGH" },
    { re: /crypto\/md5/g,             issue: "MD5 is cryptographically broken",      severity: "MEDIUM" },
    { re: /crypto\/sha1/g,            issue: "SHA-1 is cryptographically weak",      severity: "MEDIUM" },
  ],
  java: [
    { re: /Runtime\.getRuntime\(\)\.exec/g, issue: "Runtime.exec() — command injection", severity: "HIGH" },
    { re: /printStackTrace\s*\(\)/g,  issue: "printStackTrace — stack trace disclosure", severity: "LOW" },
    { re: /MD5|SHA-?1(?!\d)/g,        issue: "Weak cryptographic algorithm",         severity: "MEDIUM" },
    { re: /new\s+Random\s*\(\)/g,     issue: "java.util.Random not cryptographically secure", severity: "LOW" },
  ],
  ruby: [
    { re: /\beval\s*\(/g,             issue: "eval() — code injection risk",         severity: "CRITICAL" },
    { re: /\bsystem\s*\(/g,           issue: "system() — command injection risk",    severity: "HIGH" },
    { re: /Marshal\.load/g,           issue: "Marshal.load — arbitrary code execution", severity: "HIGH" },
    { re: /MD5\.hexdigest/g,          issue: "MD5 is cryptographically broken",      severity: "MEDIUM" },
  ],
  rust: [
    { re: /\bunsafe\s*\{/g,           issue: "unsafe block — requires security review", severity: "MEDIUM" },
    { re: /\.unwrap\s*\(\)/g,         issue: "unwrap() may panic — use proper error handling", severity: "LOW" },
  ],
  php: [
    { re: /\beval\s*\(/g,             issue: "eval() — code injection risk",         severity: "CRITICAL" },
    { re: /\bsystem\s*\(/g,           issue: "system() — command injection risk",    severity: "HIGH" },
    { re: /\$_(GET|POST|REQUEST|COOKIE)\b/g, issue: "Direct user input access — validate/sanitize", severity: "MEDIUM" },
    { re: /include\s*\(\s*\$/g,       issue: "Dynamic include — local file inclusion risk", severity: "HIGH" },
    { re: /mysql_query/g,             issue: "mysql_query deprecated — use PDO/MySQLi", severity: "HIGH" },
  ],
  csharp: [
    { re: /Process\.Start/g,          issue: "Process.Start — command injection risk", severity: "MEDIUM" },
    { re: /MD5\.Create|SHA1\.Create/g, issue: "Weak cryptographic algorithm",        severity: "MEDIUM" },
    { re: /new Random\s*\(\)/g,       issue: "System.Random not cryptographically secure", severity: "LOW" },
  ],
  kotlin: [
    { re: /Runtime\.getRuntime\(\)\.exec/g, issue: "Runtime.exec() — command injection", severity: "HIGH" },
    { re: /!!/g,                      issue: "!! operator may throw NullPointerException", severity: "LOW" },
  ],
  swift: [
    { re: /NSTask\(\)|Process\(\)/g,  issue: "Process execution — review for injection", severity: "MEDIUM" },
    { re: /try!/g,                    issue: "try! — will crash on failure, use try?", severity: "LOW" },
  ],
};

// ── Analysis functions ──────────────────────────────────────────────────────────

function scanSecurity(files: FileEntry[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const f of files) {
    const patterns = [...COMMON, ...(BY_LANG[f.language] ?? [])];
    for (const { re, issue, severity } of patterns) {
      re.lastIndex = 0;
      const m = re.exec(f.content);
      if (m) findings.push({ file: f.path, issue, severity, language: f.language, snippet: m[0].slice(0, 80), description: FIX_GUIDE[issue]?.why, remediation: FIX_GUIDE[issue]?.fix });
    }
  }
  return findings;
}

function computeAllBlastRadii(graph: Graph): Map<string, number> {
  const radii = new Map<string, number>();
  for (const node of graph.nodes) {
    let count = 0;
    const visited = new Set<string>();
    const queue = [node.id];
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const e of graph.edges) {
        if (e.to === cur && !visited.has(e.from)) { count++; queue.push(e.from); }
      }
    }
    radii.set(node.id, count);
  }
  return radii;
}

function detectCircularDeps(edges: GraphEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (cycles.length >= 5) return;
    if (stack.has(node)) { cycles.push([...path.slice(path.indexOf(node))]); return; }
    if (visited.has(node)) return;
    visited.add(node); stack.add(node); path.push(node);
    for (const n of adj.get(node) ?? []) dfs(n);
    path.pop(); stack.delete(node);
  }
  for (const node of adj.keys()) dfs(node);
  return cycles;
}

function riskLevel(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function blastRisk(n: number): Severity {
  if (n >= 20) return "CRITICAL";
  if (n >= 10) return "HIGH";
  if (n >= 4)  return "MEDIUM";
  return "LOW";
}

// ── Fix guidance per issue type ────────────────────────────────────────────────

const FIX_GUIDE: Record<string, { why: string; fix: string }> = {
  "Hardcoded password":            { why: "Credentials in source code are exposed to anyone with repo access and persist forever in git history.", fix: "Move to environment variables. Rotate the credential immediately. Add git-secrets or truffleHog as a pre-commit hook." },
  "Hardcoded API key":             { why: "API keys in source are visible to all contributors and anyone who forks. They persist in git history even after deletion.", fix: "Move to environment variables. Rotate the key now if it was ever committed. Add a secret-scanning pre-commit hook." },
  "Hardcoded secret":              { why: "Secrets in source are exposed to everyone with repo access and live in git history indefinitely.", fix: "Use environment variables or a secrets manager (Vault, AWS Secrets Manager). Rotate immediately." },
  "Private key literal in source": { why: "A private key in source gives attackers full cryptographic access. This is an immediate critical breach.", fix: "Remove from source. Rotate the key immediately. Audit all git history commits. Use a secrets manager going forward." },
  "eval() — code injection risk":  { why: "eval() executes arbitrary strings as code. If user input reaches eval(), attackers can run any code on your server/client.", fix: "Replace with JSON.parse() for data, or use a whitelist-based parser. Never pass user-controlled input to eval()." },
  "innerHTML — XSS risk":          { why: "Setting innerHTML with user content allows attackers to inject malicious scripts that run in other users' browsers.", fix: "Use textContent for plain text. For rich content, sanitize with DOMPurify: element.innerHTML = DOMPurify.sanitize(input)." },
  "dangerouslySetInnerHTML — XSS risk": { why: "React's dangerouslySetInnerHTML bypasses its XSS protections. Unsanitized content enables script injection.", fix: "Sanitize input with DOMPurify before passing it. Add eslint-plugin-react 'react/no-danger' rule to block future use." },
  "document.write() — XSS risk":   { why: "document.write() with user content injects raw HTML, enabling XSS and completely replacing the page if called after load.", fix: "Remove document.write(). Use DOM methods (appendChild, insertAdjacentHTML) with sanitized content." },
  "Dynamic Function() — injection risk": { why: "new Function() compiles strings into executable code, same risk as eval() — arbitrary code execution from user input.", fix: "Replace with explicit function definitions. If dynamic logic is needed, use a data-driven approach (config objects, strategy pattern)." },
  "child_process — command injection risk": { why: "Passing user input to shell commands enables attackers to run arbitrary OS commands on your server.", fix: "Use execFile() instead of exec() to avoid shell interpretation. Validate/whitelist all input before use in commands." },
  "subprocess shell=True — command injection": { why: "shell=True passes the command through /bin/sh, making it vulnerable to shell metacharacter injection.", fix: "Use shell=False and pass arguments as a list: subprocess.run(['cmd', arg], shell=False). Never build shell strings from user input." },
  "os.system() — command injection risk": { why: "os.system() passes commands to the shell, enabling injection if any part is user-controlled.", fix: "Replace with subprocess.run(['cmd', arg], shell=False, capture_output=True). Validate all arguments." },
  "pickle.load() — arbitrary code execution": { why: "Pickle can execute arbitrary Python during deserialization. Unpickling untrusted data is equivalent to running attacker code.", fix: "Replace with JSON or MessagePack for data exchange. If pickle is required, only unpickle data from trusted, signed sources." },
  "yaml.load() unsafe — use yaml.safe_load()": { why: "yaml.load() can instantiate arbitrary Python objects, leading to remote code execution on malicious YAML input.", fix: "Replace yaml.load(data) with yaml.safe_load(data). safe_load only constructs standard Python objects." },
  "MD5 is cryptographically broken": { why: "MD5 is vulnerable to collision attacks — two different inputs can produce the same hash. Broken since 2004 for security use.", fix: "Use SHA-256 or SHA-3 for integrity checks. For passwords, use bcrypt, scrypt, or Argon2." },
  "SHA-1 is cryptographically weak": { why: "SHA-1 collision attacks are practical (SHAttered, 2017). It should not be used for any new security-sensitive hashing.", fix: "Replace with SHA-256 or SHA-3. For passwords, use bcrypt, scrypt, or Argon2." },
  "Math.random() not cryptographically secure": { why: "Math.random() is a pseudo-random number generator — its output is predictable. Using it for tokens/IDs enables enumeration attacks.", fix: "Use crypto.getRandomValues() (browser) or crypto.randomBytes() (Node.js) for security tokens, IDs, and session keys." },
  "unsafe block — requires security review": { why: "Rust's unsafe blocks bypass memory safety guarantees. A mistake here can introduce use-after-free, buffer overflows, or data races.", fix: "Audit each unsafe block. Document why it's necessary and what invariants it upholds. Consider safe abstractions (e.g. from crates.io)." },
  "unwrap() may panic — use proper error handling": { why: "unwrap() on None/Err panics at runtime, crashing your application. In production this causes downtime.", fix: "Use pattern matching, ?, or provide a meaningful default with unwrap_or(). Only unwrap() in tests." },
  "Runtime.exec() — command injection": { why: "Passing user input to Runtime.exec() enables OS command injection.", fix: "Use ProcessBuilder with explicit argument lists. Validate and whitelist all input used in commands." },
  "printStackTrace — stack trace disclosure": { why: "Printing stack traces to logs exposes your internal class names, file paths, and library versions to potential attackers.", fix: "Use a structured logger (SLF4J, Log4j2). Log the exception message at ERROR level and the stack trace at DEBUG/TRACE only." },
};

// ── Action generator ───────────────────────────────────────────────────────────

function generateActions(
  findings: SecurityFinding[],
  circles: string[][],
  overCoupled: { file: string; connections: number }[],
  orphanedFiles: string[],
  highRiskUncovered: string[],
): ActionItem[] {
  const actions: ActionItem[] = [];

  // Group security findings by issue type
  const findingsByIssue = new Map<string, SecurityFinding[]>();
  for (const f of findings) {
    const list = findingsByIssue.get(f.issue) ?? [];
    list.push(f);
    findingsByIssue.set(f.issue, list);
  }

  for (const [issue, group] of findingsByIssue) {
    const maxSev = group.reduce<Severity>((acc, f) => {
      const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return order[f.severity] > order[acc] ? f.severity : acc;
    }, "LOW");
    const guide = FIX_GUIDE[issue];
    const priority: ActionPriority = maxSev === "CRITICAL" ? "P0" : maxSev === "HIGH" ? "P1" : "P2";
    actions.push({
      priority,
      category: "security",
      title: issue,
      whatIsWrong: `Found in ${group.length} file${group.length > 1 ? "s" : ""}: ${group.slice(0, 3).map(f => f.file.split("/").pop()).join(", ")}${group.length > 3 ? ` +${group.length - 3} more` : ""}.`,
      whyItMatters: guide?.why ?? "This pattern introduces a security vulnerability that could be exploited by attackers.",
      howToFix: guide?.fix ?? "Review each occurrence and apply the language-specific secure alternative.",
      files: group.map(f => f.file),
    });
  }

  for (const cycle of circles) {
    const short = cycle.map(f => f.split("/").pop()).join(" → ");
    actions.push({
      priority: "P1",
      category: "architecture",
      title: `Circular dependency: ${short} → (cycle)`,
      whatIsWrong: `Files ${cycle.slice(0, 2).join(" and ")} import each other directly or transitively, creating a dependency cycle.`,
      whyItMatters: "Circular dependencies make modules impossible to reason about in isolation, prevent tree-shaking, cause initialization-order bugs, and make refactoring risky.",
      howToFix: "Extract the shared logic into a third module that neither side imports from the other. Or invert the dependency using an interface/callback pattern so one direction becomes a data contract instead of a hard import.",
      files: cycle,
    });
  }

  if (overCoupled.length > 0) {
    const worst = overCoupled.slice(0, 3);
    actions.push({
      priority: "P1",
      category: "coupling",
      title: `${overCoupled.length} over-coupled file${overCoupled.length > 1 ? "s" : ""} — high connection count`,
      whatIsWrong: `${worst.map(f => `${f.file.split("/").pop()} (${f.connections} connections)`).join(", ")} have too many direct dependencies. These are central nodes that everything depends on.`,
      whyItMatters: "Over-coupled files are blast-radius multipliers — a change or bug here cascades to all dependents. They also signal that responsibilities are not well separated (God Object anti-pattern).",
      howToFix: "Apply the Single Responsibility Principle. Split the file into smaller modules grouped by concern. Introduce an abstraction layer (interface, facade, service) so consumers depend on contracts, not implementations.",
      files: overCoupled.map(f => f.file),
    });
  }

  if (highRiskUncovered.length > 0) {
    actions.push({
      priority: "P1",
      category: "testing",
      title: `${highRiskUncovered.length} high-blast-radius files have no detected test coverage`,
      whatIsWrong: `Files with the highest number of dependents — including ${highRiskUncovered.slice(0, 3).map(f => f.split("/").pop()).join(", ")} — show no evidence of test files targeting them.`,
      whyItMatters: "High blast-radius files are the highest-risk change points in the codebase. A silent regression in these files propagates to all dependents before anyone notices.",
      howToFix: "Add unit tests for the public interface of each file. Prioritize by blast radius: highest dependents first. Aim for contract tests that verify behaviour, not implementation details.",
      files: highRiskUncovered.slice(0, 10),
    });
  }

  if (orphanedFiles.length > 0) {
    actions.push({
      priority: "P2",
      category: "cleanup",
      title: `${orphanedFiles.length} orphaned files — no imports, not imported`,
      whatIsWrong: `${orphanedFiles.slice(0, 3).map(f => f.split("/").pop()).join(", ")}${orphanedFiles.length > 3 ? ` and ${orphanedFiles.length - 3} more` : ""} are completely disconnected from the rest of the codebase.`,
      whyItMatters: "Orphaned files inflate the codebase, confuse contributors, and may contain outdated code that gets accidentally imported in the future causing subtle bugs.",
      howToFix: "Review each file: if it is genuinely unused, delete it. If it is an entry point (CLI, test runner, config), document why it has no imports. If it was forgotten during a refactor, either integrate it or remove it.",
      files: orphanedFiles.slice(0, 10),
    });
  }

  return actions.sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// ── Healthy areas detector ─────────────────────────────────────────────────────

function detectHealthyAreas(
  findings: SecurityFinding[],
  circles: string[][],
  overCoupled: { file: string; connections: number }[],
  orphanedFiles: string[],
  securityScore: number,
  coverageScore: number,
): HealthArea[] {
  const areas: HealthArea[] = [];
  if (findings.filter(f => f.severity === "CRITICAL").length === 0)
    areas.push({ label: "No critical security issues", detail: "Zero CRITICAL-severity patterns detected across all scanned files." });
  if (circles.length === 0)
    areas.push({ label: "No circular dependencies", detail: "The dependency graph is acyclic — modules can be reasoned about in isolation." });
  if (overCoupled.length === 0)
    areas.push({ label: "Good coupling discipline", detail: "No files exceed the connection threshold. Modules appear well-separated." });
  if (orphanedFiles.length === 0)
    areas.push({ label: "Clean dependency graph", detail: "Every file is either imported or imports something — no dead code detected." });
  if (securityScore >= 80)
    areas.push({ label: `Strong security score (${securityScore}/100)`, detail: "The overall security posture is healthy with few or no high-severity findings." });
  if (coverageScore >= 80)
    areas.push({ label: `Good coverage health (${coverageScore}%)`, detail: "High-risk files are covered by the estimated test footprint." });
  return areas;
}

// ── Main entry ────────────────────────────────────────────────────────────────

export function generateReport(files: FileEntry[], graph: Graph, repoId: string, repoName: string): ReportData {
  const findings = scanSecurity(files);
  const radii = computeAllBlastRadii(graph);
  const circles = detectCircularDeps(graph.edges);

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const e of graph.edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
  }

  const hotspots = [...radii.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([file, dependents]) => ({ file, dependents, riskLevel: blastRisk(dependents) }));

  const allRadii = [...radii.values()];
  const avgBlastRadius = allRadii.length ? Math.round(allRadii.reduce((a, b) => a + b, 0) / allRadii.length) : 0;
  const maxBlastRadius = allRadii.length ? Math.max(...allRadii) : 0;

  const orphanedFiles = graph.nodes
    .filter(n => !inDegree.has(n.id) && !outDegree.has(n.id))
    .map(n => n.id).slice(0, 20);

  const overCoupled = graph.nodes
    .map(n => ({ file: n.id, connections: (inDegree.get(n.id) ?? 0) + (outDegree.get(n.id) ?? 0) }))
    .filter(n => n.connections > 5)
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  const mostConnected = graph.nodes
    .map(n => ({ file: n.id, inDegree: inDegree.get(n.id) ?? 0, outDegree: outDegree.get(n.id) ?? 0 }))
    .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
    .slice(0, 10);

  const crit = findings.filter(f => f.severity === "CRITICAL").length;
  const high = findings.filter(f => f.severity === "HIGH").length;
  const med  = findings.filter(f => f.severity === "MEDIUM").length;
  const low  = findings.filter(f => f.severity === "LOW").length;

  const securityScore = Math.max(0, 100 - crit * 15 - high * 8 - med * 3 - low - circles.length * 5);
  const langs = [...new Set(files.map(f => f.language))];

  const highRiskUncovered = hotspots.filter(h => h.riskLevel === "CRITICAL" || h.riskLevel === "HIGH").map(h => h.file);
  const coverageScore = Math.max(0, 100 - highRiskUncovered.length * 5);

  const actions = generateActions(findings, circles, overCoupled, orphanedFiles, highRiskUncovered);
  const healthyAreas = detectHealthyAreas(findings, circles, overCoupled, orphanedFiles, securityScore, coverageScore);

  return {
    repoId, repoName,
    generatedAt: new Date().toISOString(),
    summary: { totalFiles: files.length, totalEdges: graph.edges.length, languages: langs, securityScore, riskLevel: riskLevel(100 - securityScore), criticalCount: crit, highCount: high, mediumCount: med, lowCount: low },
    actions,
    healthyAreas,
    performance: { hotspots, avgBlastRadius, maxBlastRadius, orphanedFiles },
    security: { findings },
    dataFlow: { circularDependencies: circles, mostConnected },
    inefficiencies: { orphanedFiles, overCoupled },
    coverage: { estimatedScore: coverageScore, highRiskUncovered },
  };
}
