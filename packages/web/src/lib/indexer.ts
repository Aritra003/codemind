import { Octokit } from "@octokit/rest";
import type { FileEntry } from "./indexer.parse";
import { extractNodeName, extractImports, resolveImport, buildNamespaceMap } from "./indexer.parse";
export type { FileEntry } from "./indexer.parse";

export type GraphNode = {
  id: string; name: string; file: string; type: string; kind: string; language: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorCount?: number; warningCount?: number; hasCircularDep?: boolean;
};
export type GraphEdge = { from: string; to: string; kind: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

const SUPPORTED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx",
  ".py", ".go", ".java", ".rb",
  ".cs", ".rs", ".php",
  ".kt", ".kts", ".swift",
  ".ps1", ".psm1",
  ".dart", ".scala",
  ".cpp", ".cc", ".cxx", ".h", ".hpp",
];

const EXCLUDE_PATTERNS = [
  "node_modules", "__pycache__", "/vendor/", "/target/",
  ".d.ts", "/dist/", "/build/", "/.git/",
  "/test/", "/tests/", "/spec/", "/__tests__/",
  "/docs/", "/doc/", "/examples/", "/example/",
  "/scripts/", "/script/", "/demo/", "/demos/",
  "/fixtures/", "/benchmarks/", "/migrations/",
  "/notebooks/", "/notebook/",
];

function sourcePriority(path: string): number {
  if (path.startsWith("src/"))      return 0;
  if (path.startsWith("lib/"))      return 1;
  if (path.startsWith("app/"))      return 1;
  if (path.startsWith("core/"))     return 1;
  if (path.startsWith("pkg/"))      return 1;
  if (path.startsWith("internal/")) return 1;
  return 2;
}

export function getLanguage(path: string): string {
  if (path.endsWith(".py"))                             return "python";
  if (path.endsWith(".go"))                             return "go";
  if (path.endsWith(".java"))                           return "java";
  if (path.endsWith(".rb"))                             return "ruby";
  if (path.endsWith(".cs"))                             return "csharp";
  if (path.endsWith(".rs"))                             return "rust";
  if (path.endsWith(".php"))                            return "php";
  if (path.endsWith(".kt") || path.endsWith(".kts"))    return "kotlin";
  if (path.endsWith(".swift"))                          return "swift";
  if (path.endsWith(".dart"))                           return "dart";
  if (path.endsWith(".scala"))                          return "scala";
  if (path.endsWith(".ps1") || path.endsWith(".psm1"))  return "powershell";
  if ([".cpp",".cc",".cxx",".h",".hpp"].some(e => path.endsWith(e))) return "cpp";
  if (path.endsWith(".ts") || path.endsWith(".tsx"))    return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx"))    return "javascript";
  return "unknown";
}

const MAX_FILES = 300;

async function fetchInBatches(
  octokit: Octokit, owner: string, repo: string, files: { path: string }[],
): Promise<FileEntry[]> {
  const results: FileEntry[] = [];
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const settled = await Promise.allSettled(batch.map(async f => {
      const { data } = await octokit.repos.getContent({ owner, repo, path: f.path });
      if ("content" in data && typeof data.content === "string")
        return { path: f.path, content: Buffer.from(data.content, "base64").toString("utf-8"), language: getLanguage(f.path) };
      return null;
    }));
    results.push(...settled.flatMap(r => r.status === "fulfilled" && r.value ? [r.value] : []));
  }
  return results;
}

export async function fetchRepoFiles(octokit: Octokit, owner: string, repo: string): Promise<FileEntry[]> {
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: "HEAD", recursive: "1" });
  const supported = tree.tree
    .filter(f => f.type === "blob" && f.path &&
      SUPPORTED_EXTENSIONS.some(ext => f.path!.endsWith(ext)) &&
      !EXCLUDE_PATTERNS.some(p => f.path!.includes(p)))
    .sort((a, b) => sourcePriority(a.path!) - sourcePriority(b.path!))
    .slice(0, MAX_FILES);
  return fetchInBatches(octokit, owner, repo, supported as { path: string }[]);
}

export function buildGraph(files: FileEntry[]): Graph {
  const nsMap = buildNamespaceMap(files);
  const nodes: GraphNode[] = files.map(f => ({
    id: f.path, name: extractNodeName(f.content, f.path, f.language),
    file: f.path, type: "file", kind: "module", language: f.language,
  }));
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  for (const file of files) {
    for (const imp of extractImports(file.content, file.language)) {
      const target = resolveImport(imp, file.path, file.language, files, nsMap);
      if (target && target !== file.path) {
        const key = `${file.path}→${target}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ from: file.path, to: target, kind: "imports" }); }
      }
    }
  }
  return { nodes, edges };
}
