import { Octokit } from "@octokit/rest";

export type GraphNode = { id: string; name: string; file: string; type: string; kind: string; language: string };
export type GraphEdge = { from: string; to: string; kind: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };
export type FileEntry = { path: string; content: string; language: string };

const SUPPORTED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx",
  ".py",
  ".go",
  ".java",
  ".rb",
  ".cs",
  ".rs",
  ".php",
  ".kt", ".kts",
  ".swift",
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

// Priority score — lower = picked first
function sourcePriority(path: string): number {
  if (path.startsWith("src/")) return 0;
  if (path.startsWith("lib/")) return 1;
  if (path.startsWith("app/")) return 1;
  if (path.startsWith("core/")) return 1;
  if (path.startsWith("pkg/")) return 1;
  if (path.startsWith("internal/")) return 1;
  return 2;
}

export function getLanguage(path: string): string {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".go")) return "go";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".rb")) return "ruby";
  if (path.endsWith(".cs")) return "csharp";
  if (path.endsWith(".rs")) return "rust";
  if (path.endsWith(".php")) return "php";
  if (path.endsWith(".kt") || path.endsWith(".kts")) return "kotlin";
  if (path.endsWith(".swift")) return "swift";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  return "unknown";
}

async function fetchInBatches(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: { path: string }[],
  batchSize = 50
): Promise<FileEntry[]> {
  const results: FileEntry[] = [];
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async f => {
        const { data } = await octokit.repos.getContent({ owner, repo, path: f.path });
        if ("content" in data && typeof data.content === "string") {
          return { path: f.path, content: Buffer.from(data.content, "base64").toString("utf-8"), language: getLanguage(f.path) };
        }
        return null;
      })
    );
    results.push(...settled.flatMap(r => r.status === "fulfilled" && r.value ? [r.value] : []));
  }
  return results;
}

export async function fetchRepoFiles(octokit: Octokit, owner: string, repo: string): Promise<FileEntry[]> {
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: "HEAD", recursive: "1" });

  const supported = tree.tree
    .filter(f =>
      f.type === "blob" &&
      f.path &&
      SUPPORTED_EXTENSIONS.some(ext => f.path!.endsWith(ext)) &&
      !EXCLUDE_PATTERNS.some(p => f.path!.includes(p))
    )
    .sort((a, b) => sourcePriority(a.path!) - sourcePriority(b.path!));

  return fetchInBatches(octokit, owner, repo, supported as { path: string }[]);
}

function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];
  let m: RegExpExecArray | null;

  if (language === "typescript" || language === "javascript") {
    const esm = /from\s+['"]([^'"]+)['"]/g;
    const cjs = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = esm.exec(content)) !== null) imports.push(m[1]);
    while ((m = cjs.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "python") {
    const fromImp = /^from\s+([\w.]+)\s+import/gm;
    const directImp = /^import\s+([\w.,\s]+)/gm;
    while ((m = fromImp.exec(content)) !== null) imports.push(m[1]);
    while ((m = directImp.exec(content)) !== null) {
      m[1].split(",").forEach(i => imports.push(i.trim().split(" ")[0]));
    }

  } else if (language === "go") {
    const single = /import\s+"([^"]+)"/g;
    const block = /import\s+\(([^)]+)\)/gs;
    while ((m = single.exec(content)) !== null) imports.push(m[1]);
    const bm = block.exec(content);
    if (bm) bm[1].split("\n").forEach(line => { const q = line.match(/"([^"]+)"/); if (q) imports.push(q[1]); });

  } else if (language === "java" || language === "kotlin") {
    const imp = /^import\s+([\w.]+);?/gm;
    while ((m = imp.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "ruby") {
    const req = /require(?:_relative)?\s+['"]([^'"]+)['"]/g;
    while ((m = req.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "csharp") {
    const us = /^using\s+([\w.]+);/gm;
    while ((m = us.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "rust") {
    const us = /^use\s+([\w:]+)/gm;
    while ((m = us.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "php") {
    const req = /(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/g;
    const us = /^use\s+([\w\\]+)/gm;
    while ((m = req.exec(content)) !== null) imports.push(m[1]);
    while ((m = us.exec(content)) !== null) imports.push(m[1]);

  } else if (language === "swift") {
    const imp = /^import\s+(\w+)/gm;
    while ((m = imp.exec(content)) !== null) imports.push(m[1]);
  }

  return imports;
}

function resolveImport(imp: string, sourceFile: string, language: string, allFiles: FileEntry[]): string | null {
  const sourceDir = sourceFile.split("/").slice(0, -1).join("/");

  if (language === "typescript" || language === "javascript") {
    if (!imp.startsWith(".")) return null;
    const resolved = `${sourceDir}/${imp}`.replace(/\/\.\//g, "/").replace(/\/[^/]+\/\.\.\//g, "/");
    const base = resolved.replace(/\.[jt]sx?$/, "");
    return allFiles.find(f => f.path.startsWith(base))?.path ?? null;
  }

  if (language === "python") {
    if (imp.startsWith(".")) {
      const dots = imp.match(/^\.+/)?.[0] ?? ".";
      const modulePart = imp.slice(dots.length).replace(/\./g, "/");
      let base = sourceDir;
      for (let i = 1; i < dots.length; i++) base = base.split("/").slice(0, -1).join("/");
      if (!modulePart) return null;
      const candidates = [`${base}/${modulePart}.py`, `${base}/${modulePart}/__init__.py`];
      return allFiles.find(f => candidates.includes(f.path))?.path ?? null;
    }
    const modPath = imp.replace(/\./g, "/");
    return allFiles.find(f =>
      f.path === `${modPath}.py` ||
      f.path.endsWith(`/${modPath}.py`) ||
      f.path === `${modPath}/__init__.py`
    )?.path ?? null;
  }

  if (language === "ruby") {
    const target = imp.startsWith(".") ? `${sourceDir}/${imp}.rb` : null;
    return target ? (allFiles.find(f => f.path === target)?.path ?? null) : null;
  }

  // Java, Go, C#, Kotlin, Rust, Swift — match by last segment of the import path
  const lastName = imp.split(/[./\\:]/).filter(Boolean).pop() ?? "";
  if (!lastName || lastName.length < 2) return null;
  return allFiles.find(f => {
    const fileName = f.path.split("/").pop()?.replace(/\.[^.]+$/, "");
    return fileName === lastName;
  })?.path ?? null;
}

export function buildGraph(files: FileEntry[]): Graph {
  const nodes: GraphNode[] = files.map(f => ({
    id:       f.path,
    name:     f.path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? f.path,
    file:     f.path,
    type:     "file",
    kind:     "module",
    language: f.language,
  }));
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const file of files) {
    const imports = extractImports(file.content, file.language);
    for (const imp of imports) {
      const target = resolveImport(imp, file.path, file.language, files);
      if (target && target !== file.path) {
        const key = `${file.path}→${target}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: file.path, to: target, kind: "imports" });
        }
      }
    }
  }

  return { nodes, edges };
}
