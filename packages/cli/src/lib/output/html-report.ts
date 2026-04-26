import * as fs   from 'fs/promises'
import * as path from 'path'
import type { StinKitResult, BlastRadius } from '@stinkit/shared'
import type { DriftReport }    from '../../commands/see'
import type { ForensicsTrace } from '../../commands/trace'

const REPORTS_DIR = '.stinkit/reports'

async function writeReport(filename: string, html: string, repoRoot: string): Promise<string> {
  const dir      = path.join(repoRoot, REPORTS_DIR)
  const filePath = path.join(dir, filename)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, html, 'utf8')
  return filePath
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:monospace;padding:2rem;background:#0d1117;color:#e6edf3}
h1{color:#6366f1}pre{background:#161b22;padding:1rem;border-radius:4px;overflow:auto}</style>
</head>
<body><h1>${title}</h1>${body}</body>
</html>`
}

function jsonBlock(data: unknown): string {
  return `<pre>${JSON.stringify(data, null, 2)}</pre>`
}

export async function writeCheckReport(
  result: StinKitResult<BlastRadius>,
  repoRoot: string,
): Promise<string> {
  const filename = `check-${stamp()}-${Date.now()}.html`
  const body = result.status === 'failed'
    ? `<p>Error: ${result.error.message}</p>`
    : `<p>Risk: <strong>${result.data.risk_level}</strong></p>
       <p>Direct dependents: ${result.data.direct_dependents.length}</p>
       <p>Transitive dependents: ${result.data.transitive_dependents.length}</p>
       <p>Coverage gaps: ${result.data.coverage_gaps.length}</p>
       ${jsonBlock(result.data)}`
  return writeReport(filename, wrapHtml('StinKit — Check Report', body), repoRoot)
}

export async function writeSeeReport(
  result: StinKitResult<DriftReport>,
  repoRoot: string,
): Promise<string> {
  const filename = `see-${stamp()}-${Date.now()}.html`
  const body = result.status === 'failed'
    ? `<p>Error: ${result.error.message}</p>`
    : `<p>Diagram: ${result.data.diagram_path}</p>
       <p>Accuracy: ${result.data.accuracy_pct}%</p>
       <p>Phantom: ${result.data.phantom_count} | Missing: ${result.data.missing_count}</p>
       ${jsonBlock(result.data)}`
  return writeReport(filename, wrapHtml('StinKit — See Report', body), repoRoot)
}

export async function writeTraceReport(
  result: StinKitResult<ForensicsTrace>,
  repoRoot: string,
): Promise<string> {
  const filename = `trace-${stamp()}-${Date.now()}.html`
  const body = result.status === 'failed'
    ? `<p>Error: ${result.error.message}</p>`
    : `<p>Origin: <strong>${result.data.origin_classification}</strong></p>
       <p>Top commit: ${result.data.ranked_commits[0]?.hash ?? 'none'}</p>
       <p>Paths found: ${result.data.code_paths.length}</p>
       ${jsonBlock(result.data)}`
  return writeReport(filename, wrapHtml('StinKit — Trace Report', body), repoRoot)
}
