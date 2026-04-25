// Pure canvas drawing utilities — no React, no state
// Dual-canvas architecture: glow canvas (CSS-blurred) + sharp canvas on top
import * as d3 from 'd3'

// ── Types ──────────────────────────────────────────────────────────────────

export type RenderNode = d3.SimulationNodeDatum & {
  id: string; name?: string; kind?: string; type?: string; language?: string
  inDeg: number; outDeg: number
}
export type RenderLink = d3.SimulationLinkDatum<RenderNode> & { edgeType: string }
export type Star        = { x: number; y: number; r: number; a: number }
export type Particle    = { linkIdx: number; t: number; speed: number }

// ── Color maps ────────────────────────────────────────────────────────────

export const KIND_COLORS: Record<string, string> = {
  function: '#10B981', method: '#34D399', arrow_function: '#6EE7B7',
  class: '#F59E0B', interface: '#EC4899', module: '#6366F1',
  file: '#3B82F6', enum: '#F97316', variable: '#64748B',
  import: '#475569', constructor: '#A78BFA', type: '#C084FC',
}

export const LANG_COLORS: Record<string, string> = {
  typescript: '#3178C6', javascript: '#F7DF1E', python: '#3776AB',
  go: '#00ADD8', java: '#ED8B00', rust: '#CE422B', ruby: '#CC342D', csharp: '#9B4F96',
}

export function nodeColor(n: Pick<RenderNode, 'kind' | 'type' | 'language'>): string {
  return KIND_COLORS[n.kind ?? ''] ?? KIND_COLORS[n.type ?? ''] ?? LANG_COLORS[n.language ?? ''] ?? '#6B7280'
}

export function riskGlow(inDeg: number): string {
  if (inDeg >= 20) return '#EF4444'
  if (inDeg >= 10) return '#F97316'
  if (inDeg >= 4)  return '#EAB308'
  return '#6366F1'
}

export function nodeR(inDeg: number): number {
  return 8 + Math.log2(1 + inDeg) * 5
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
}

function bezierCP(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  return [mx - (dy / len) * Math.min(len * 0.12, 32), my + (dx / len) * Math.min(len * 0.12, 32)]
}

// ── Background ────────────────────────────────────────────────────────────

export function generateStars(W: number, H: number, n = 260): Star[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 0.9 + 0.2, a: Math.random() * 0.4 + 0.1,
  }))
}

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, stars: Star[]) {
  ctx.fillStyle = '#05050F'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.65)
  g.addColorStop(0, 'rgba(99,102,241,0.07)')
  g.addColorStop(0.55, 'rgba(16,24,40,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  for (const s of stars) {
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill()
  }
}

// ── Cluster hulls (appear once simulation settles) ────────────────────────

export function drawClusters(ctx: CanvasRenderingContext2D, nodes: RenderNode[], simAlpha: number) {
  if (simAlpha > 0.06) return
  const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#F97316', '#3B82F6', '#8B5CF6', '#06B6D4']
  const byDir = new Map<string, [number, number][]>()
  for (const n of nodes) {
    const dir = n.id.split('/')[0] ?? 'root'
    const b = byDir.get(dir) ?? []; b.push([n.x ?? 0, n.y ?? 0]); byDir.set(dir, b)
  }
  let ci = 0
  for (const pts of byDir.values()) {
    if (pts.length < 4) { ci++; continue }
    const hull = d3.polygonHull(pts)
    if (!hull || hull.length < 3) { ci++; continue }
    const c = PALETTE[ci % PALETTE.length]!
    const hcx = hull.reduce((s, p) => s + p[0], 0) / hull.length
    const hcy = hull.reduce((s, p) => s + p[1], 0) / hull.length
    ctx.beginPath()
    hull.forEach((p, i) => {
      const dx = p[0] - hcx, dy = p[1] - hcy, len = Math.hypot(dx, dy) || 1
      const ex = hcx + dx * (1 + 26 / len), ey = hcy + dy * (1 + 26 / len)
      i === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey)
    })
    ctx.closePath()
    ctx.fillStyle = rgba(c, 0.04); ctx.fill()
    ctx.strokeStyle = rgba(c, 0.2); ctx.lineWidth = 1
    ctx.setLineDash([4, 7]); ctx.stroke(); ctx.setLineDash([])
    ci++
  }
}

// ── Edges ─────────────────────────────────────────────────────────────────

export function drawEdges(ctx: CanvasRenderingContext2D, links: RenderLink[], sel: string | null, hl: Set<string>) {
  for (const lk of links) {
    const s = lk.source as RenderNode, t = lk.target as RenderNode
    const x1 = s.x ?? 0, y1 = s.y ?? 0, x2 = t.x ?? 0, y2 = t.y ?? 0
    const [cx, cy] = bezierCP(x1, y1, x2, y2)
    const isActive = sel !== null && (s.id === sel || t.id === sel)
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2)
    if (isActive) {
      const gr = ctx.createLinearGradient(x1, y1, x2, y2)
      gr.addColorStop(0, rgba(nodeColor(s), 0.88)); gr.addColorStop(1, rgba(nodeColor(t), 0.88))
      ctx.strokeStyle = gr; ctx.lineWidth = 1.8
    } else if (sel !== null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 0.4
    } else {
      ctx.strokeStyle = lk.edgeType === 'circular' ? rgba('#EF4444', 0.5) : 'rgba(30,41,59,0.7)'
      ctx.lineWidth = 0.75
    }
    ctx.stroke()
  }
}

// ── Glow layer (drawn to blurred canvas) ──────────────────────────────────

export function drawNodeGlow(ctx: CanvasRenderingContext2D, nodes: RenderNode[], sel: string | null, hl: Set<string>, t: number) {
  for (const n of nodes) {
    const x = n.x ?? 0, y = n.y ?? 0, r = nodeR(n.inDeg)
    const glow = riskGlow(n.inDeg)
    const isSel = n.id === sel
    if (sel !== null && !isSel && !hl.has(n.id)) continue
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + n.inDeg * 0.6)
    const gR = r * (isSel ? 3.2 : 2.2)
    const alpha = isSel ? 0.8 : 0.22 + 0.14 * pulse
    const gr = ctx.createRadialGradient(x, y, 0, x, y, gR)
    gr.addColorStop(0, rgba(glow, alpha)); gr.addColorStop(0.45, rgba(glow, alpha * 0.35)); gr.addColorStop(1, rgba(glow, 0))
    ctx.beginPath(); ctx.arc(x, y, gR, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, Math.PI * 2); ctx.fillStyle = rgba(nodeColor(n), 0.55); ctx.fill()
  }
}

// ── Sharp node layer ──────────────────────────────────────────────────────

export function drawNodeSharp(ctx: CanvasRenderingContext2D, nodes: RenderNode[], sel: string | null, hl: Set<string>, t: number) {
  for (const n of nodes) {
    const x = n.x ?? 0, y = n.y ?? 0, r = nodeR(n.inDeg)
    const col = nodeColor(n), glow = riskGlow(n.inDeg)
    const isSel = n.id === sel, isGhost = sel !== null && !isSel && !hl.has(n.id)
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + n.inDeg * 0.6)

    const fill = ctx.createRadialGradient(x - r * 0.28, y - r * 0.28, 0, x, y, r)
    fill.addColorStop(0, rgba(col, isGhost ? 0.07 : 0.92))
    fill.addColorStop(1, rgba(col, isGhost ? 0.05 : 0.72))
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill()

    if (!isGhost) {
      ctx.beginPath(); ctx.arc(x, y, r + 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = isSel ? 'rgba(255,255,255,0.95)' : rgba(glow, 0.4 + 0.5 * pulse)
      ctx.lineWidth = isSel ? 2.5 : 1.5; ctx.stroke()
      // Inner specular
      ctx.beginPath(); ctx.arc(x - r * 0.27, y - r * 0.27, r * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill()
    }

    if (r >= 9 && !isGhost) {
      const raw = n.name ?? n.id.split('/').pop() ?? n.id
      const label = raw.length > 16 ? raw.slice(0, 14) + '…' : raw
      ctx.font = `${Math.max(8, Math.min(10, r * 0.85))}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillStyle = isSel ? 'rgba(255,255,255,0.9)' : 'rgba(148,163,184,0.72)'
      ctx.fillText(label, x, y + r + 4); ctx.textBaseline = 'alphabetic'
    }
  }
}

// ── Particles ─────────────────────────────────────────────────────────────

export function drawParticles(ctx: CanvasRenderingContext2D, links: RenderLink[], particles: Particle[]) {
  for (const p of particles) {
    const lk = links[p.linkIdx]; if (!lk) continue
    const s = lk.source as RenderNode, t = lk.target as RenderNode
    const x1 = s.x ?? 0, y1 = s.y ?? 0, x2 = t.x ?? 0, y2 = t.y ?? 0
    const [cx, cy] = bezierCP(x1, y1, x2, y2)
    const q = p.t
    const bx = (1-q)*(1-q)*x1 + 2*(1-q)*q*cx + q*q*x2
    const by = (1-q)*(1-q)*y1 + 2*(1-q)*q*cy + q*q*y2
    const alpha = Math.min(1, Math.min(q, 1 - q) * 7) * 0.65
    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2)
    ctx.fillStyle = rgba(nodeColor(s), alpha); ctx.fill()
  }
}
