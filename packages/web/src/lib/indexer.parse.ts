// Language-specific parsing: node naming, namespace extraction, import extraction, resolution

export type FileEntry = { path: string; content: string; language: string }

// ── Primary type / function name per language ────────────────────────────────

const NAME_RX: Record<string, RegExp[]> = {
  typescript:  [/export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/, /export\s+(?:async\s+)?function\s+(\w+)/, /export\s+const\s+(\w+)/],
  javascript:  [/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/, /export\s+const\s+(\w+)/, /module\.exports\s*=\s*(?:class\s+)?(\w+)/],
  python:      [/^class\s+(\w+)/m, /^def\s+(\w+)/m],
  go:          [/^package\s+(\w+)/m],
  java:        [/public\s+(?:abstract\s+|final\s+)?(?:class|interface|enum|record)\s+(\w+)/],
  csharp:      [/(?:public|internal|private|protected)?\s*(?:partial\s+)?(?:abstract\s+|sealed\s+)?(?:class|interface|struct|record|enum)\s+(\w+)/],
  kotlin:      [/(?:data\s+|sealed\s+|abstract\s+|open\s+)?(?:class|object|interface)\s+(\w+)/, /^fun\s+(\w+)/m],
  scala:       [/(?:case\s+|abstract\s+)?(?:class|object|trait)\s+(\w+)/],
  ruby:        [/^(?:class|module)\s+(\w+)/m],
  rust:        [/^pub\s+(?:struct|enum|trait|fn)\s+(\w+)/m, /^(?:struct|fn)\s+(\w+)/m],
  swift:       [/(?:public\s+|open\s+)?(?:final\s+)?(?:class|struct|protocol|enum|actor)\s+(\w+)/],
  php:         [/(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+(\w+)/],
  dart:        [/(?:abstract\s+)?class\s+(\w+)/, /^void\s+main/m],
  powershell:  [/^function\s+([\w-]+)/m],
  cpp:         [/(?:class|struct)\s+(\w+)\s*[:{]/],
}

export function extractNodeName(content: string, path: string, language: string): string {
  const fallback = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path
  for (const rx of NAME_RX[language] ?? []) {
    const m = content.match(rx)
    if (m?.[1] && m[1].length > 1) return m[1]
  }
  return fallback
}

// ── Namespace / package declaration ──────────────────────────────────────────

export function extractNamespace(content: string, language: string): string {
  let m: RegExpExecArray | null
  if (language === "csharp")
    return (/^\s*namespace\s+([\w.]+)/m.exec(content))?.[1] ?? ""
  if (language === "java" || language === "kotlin" || language === "scala")
    return (/^\s*package\s+([\w.]+)/m.exec(content))?.[1] ?? ""
  if (language === "go")
    return (/^\s*package\s+(\w+)/m.exec(content))?.[1] ?? ""
  if (language === "rust") {
    m = /^mod\s+(\w+)/m.exec(content)
    return m?.[1] ?? ""
  }
  return ""
}

export function buildNamespaceMap(files: FileEntry[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const f of files) {
    const ns = extractNamespace(f.content, f.language)
    if (ns) map.set(ns, f.path)
  }
  return map
}

// ── Import extraction ─────────────────────────────────────────────────────────

export function extractImports(content: string, language: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  if (language === "typescript" || language === "javascript") {
    const r1 = /from\s+['"]([^'"]+)['"]/g, r2 = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((m = r1.exec(content))) out.push(m[1])
    while ((m = r2.exec(content))) out.push(m[1])
  } else if (language === "python") {
    const r1 = /^from\s+([\w.]+)\s+import/gm, r2 = /^import\s+([\w.,\s]+)/gm
    while ((m = r1.exec(content))) out.push(m[1])
    while ((m = r2.exec(content))) m[1].split(",").forEach(i => out.push(i.trim().split(" ")[0]))
  } else if (language === "go") {
    const r1 = /import\s+"([^"]+)"/g, r2 = /import\s+\(([^)]+)\)/gs
    while ((m = r1.exec(content))) out.push(m[1])
    const bm = r2.exec(content)
    if (bm) bm[1].split("\n").forEach(l => { const q = l.match(/"([^"]+)"/); if (q) out.push(q[1]) })
  } else if (language === "java" || language === "kotlin" || language === "scala") {
    const r1 = /^import\s+([\w.*$]+);?/gm
    while ((m = r1.exec(content))) out.push(m[1])
  } else if (language === "ruby") {
    const r1 = /require(?:_relative)?\s+['"]([^'"]+)['"]/g
    while ((m = r1.exec(content))) out.push(m[1])
  } else if (language === "csharp") {
    // using Foo.Bar; | using static Foo.Bar; | using Alias = Foo.Bar;
    const r1 = /^using\s+(?:static\s+)?(?:\w+\s*=\s*)?([\w.]+);/gm
    while ((m = r1.exec(content))) out.push(m[1])
  } else if (language === "rust") {
    const r1 = /^use\s+([\w:*]+(?:::\{[^}]+\})?)/gm
    while ((m = r1.exec(content))) out.push(m[1])
  } else if (language === "php") {
    const r1 = /(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/g
    const r2 = /^use\s+([\w\\]+)/gm
    while ((m = r1.exec(content))) out.push(m[1])
    while ((m = r2.exec(content))) out.push(m[1])
  } else if (language === "swift") {
    const r1 = /^import\s+(?:class\s+|struct\s+|enum\s+)?(\w[\w.]*)/gm
    while ((m = r1.exec(content))) out.push(m[1])
  } else if (language === "dart") {
    const r1 = /^import\s+['"]([^'"]+)['"]/gm, r2 = /^part\s+['"]([^'"]+)['"]/gm
    while ((m = r1.exec(content))) out.push(m[1])
    while ((m = r2.exec(content))) out.push(m[1])
  } else if (language === "powershell") {
    const r1 = /^\s*\.\s+(?:\$\w+[/\\]|\.{0,2}[/\\])([\w./\\-]+\.ps[m1]?)/gm
    const r2 = /Import-Module\s+(?:-Name\s+)?['"]?([./\\][\w./\\-]+\.ps[m1]?)['"]?/gi
    while ((m = r1.exec(content))) out.push(m[1])
    while ((m = r2.exec(content))) out.push(m[1])
  } else if (language === "cpp") {
    const r1 = /^#include\s+"([^"]+)"/gm
    while ((m = r1.exec(content))) out.push(m[1])
  }
  return out
}

// ── Import resolution ─────────────────────────────────────────────────────────

export function resolveImport(
  imp: string, sourceFile: string, language: string,
  allFiles: FileEntry[], nsMap: Map<string, string>,
): string | null {
  const dir = sourceFile.split("/").slice(0, -1).join("/")

  if (language === "typescript" || language === "javascript") {
    if (!imp.startsWith(".")) return null
    const base = `${dir}/${imp}`.replace(/\/\.\//g, "/").replace(/\/[^/]+\/\.\.\//g, "/").replace(/\.[jt]sx?$/, "")
    return allFiles.find(f => f.path.startsWith(base))?.path ?? null
  }
  if (language === "python") {
    if (imp.startsWith(".")) {
      const dots = imp.match(/^\.+/)?.[0] ?? "."
      const mod = imp.slice(dots.length).replace(/\./g, "/")
      let base = dir
      for (let i = 1; i < dots.length; i++) base = base.split("/").slice(0, -1).join("/")
      return allFiles.find(f => f.path === `${base}/${mod}.py` || f.path === `${base}/${mod}/__init__.py`)?.path ?? null
    }
    const mp = imp.replace(/\./g, "/")
    return allFiles.find(f => f.path === `${mp}.py` || f.path.endsWith(`/${mp}.py`) || f.path === `${mp}/__init__.py`)?.path ?? null
  }
  if (language === "ruby") {
    return allFiles.find(f => f.path === `${dir}/${imp}.rb` || f.path.endsWith(`/${imp}.rb`))?.path ?? null
  }
  if (language === "go") {
    const local = imp.split("/").slice(3).join("/")
    return local ? (allFiles.find(f => f.path.startsWith(local + "/") || f.path.startsWith(local))?.path ?? null) : null
  }
  if (language === "java" || language === "kotlin" || language === "scala") {
    if (nsMap.has(imp)) return nsMap.get(imp)!
    const segs = imp.split(".")
    const type = segs[segs.length - 1]
    if (type === "*") return allFiles.find(f => f.path.includes(segs.slice(0, -1).join("/")))?.path ?? null
    const pkg = segs.slice(0, -1).join("/")
    const exts = language === "kotlin" ? [".kt", ".kts"] : language === "scala" ? [".scala"] : [".java"]
    return allFiles.find(f => exts.some(e => f.path.endsWith(`/${type}${e}`)) && f.path.includes(pkg))?.path
        ?? allFiles.find(f => exts.some(e => f.path.endsWith(`/${type}${e}`)))?.path ?? null
  }
  if (language === "csharp") {
    if (nsMap.has(imp)) return nsMap.get(imp)!
    for (const [ns, path] of nsMap) if (ns.startsWith(imp) || imp.startsWith(ns)) return path
    const last = imp.split(".").pop() ?? ""
    return last.length > 1 ? (allFiles.find(f => f.path.endsWith(`/${last}.cs`))?.path ?? null) : null
  }
  if (language === "rust") {
    const parts = imp.replace(/^(?:crate|self)::/, "").split("::").slice(0, -1)
    const mod = parts.join("/")
    return mod ? allFiles.find(f => f.path === `src/${mod}.rs` || f.path === `src/${mod}/mod.rs` || f.path.endsWith(`/${mod}.rs`))?.path ?? null : null
  }
  if (language === "swift") {
    const last = imp.split(".").pop() ?? ""
    return allFiles.find(f => f.path.endsWith(`/${last}.swift`))?.path ?? null
  }
  if (language === "php") {
    const cls = imp.split("\\").pop() ?? ""
    return allFiles.find(f => f.path.endsWith(`/${cls}.php`))?.path ?? null
  }
  if (language === "dart") {
    if (imp.startsWith("dart:")) return null
    if (imp.startsWith("package:")) {
      const local = imp.replace(/^package:[^/]+\//, "")
      return allFiles.find(f => f.path.endsWith(local) || f.path === `lib/${local}`)?.path ?? null
    }
    const resolved = `${dir}/${imp}`.replace(/\/\.\//g, "/")
    return allFiles.find(f => f.path === resolved)?.path ?? null
  }
  if (language === "powershell") {
    const resolved = `${dir}/${imp}`.replace(/\/\.\//g, "/")
    return allFiles.find(f => f.path === resolved || f.path.endsWith(imp))?.path ?? null
  }
  if (language === "cpp") {
    return allFiles.find(f => f.path === `${dir}/${imp}` || f.path.endsWith("/" + imp) || f.path === imp)?.path ?? null
  }
  return null
}
