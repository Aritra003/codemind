import * as fs   from 'fs/promises'
import * as path from 'path'

export const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.bmp', '.tiff', '.tif', '.pdf', '.mermaid', '.mmd'] as const

const DIRECT_TYPES: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
}

export interface PreparedImage {
  data:      Buffer
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
  resized:   boolean
}

const MAX_BYTES    = 20 * 1024 * 1024       // 20 MB
const MAX_SIDE_PX  = 2576                   // Opus 4.7 max
const WARN_LOW_DIM = 200

export async function prepareImage(filePath: string): Promise<PreparedImage> {
  const ext = path.extname(filePath).toLowerCase()

  if (!SUPPORTED_EXTS.includes(ext as (typeof SUPPORTED_EXTS)[number])) {
    const supList = SUPPORTED_EXTS.join(', ')
    throw new Error(
      `Unsupported file format: ${ext}\n` +
      `CodeMind See supports: ${supList}\n` +
      `Tip: Export your diagram as PNG from your design tool and try again.`
    )
  }

  const stat = await fs.stat(filePath)
  if (stat.size > MAX_BYTES) {
    process.stderr.write(`⚠  Large file (${(stat.size / 1024 / 1024).toFixed(1)} MB). Processing may take longer.\n`)
  }

  if (ext in DIRECT_TYPES) {
    const data = await fs.readFile(filePath)
    const mt   = DIRECT_TYPES[ext] as PreparedImage['mediaType']
    return await resizeIfNeeded(data, mt, filePath)
  }

  if (ext === '.svg') return convertSvg(filePath)
  if (ext === '.pdf') return convertPdf(filePath)
  if (ext === '.mermaid' || ext === '.mmd') return convertMermaid(filePath)
  if (ext === '.bmp' || ext === '.tiff' || ext === '.tif') return convertWithSharp(filePath)

  throw new Error(`Cannot prepare image for: ${ext}`)
}

async function resizeIfNeeded(data: Buffer, mt: PreparedImage['mediaType'], src: string): Promise<PreparedImage> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- sharp is an optional peer dependency
    const sharp = (await import('sharp')).default
    const meta  = await sharp(data).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (w < WARN_LOW_DIM || h < WARN_LOW_DIM) {
      process.stderr.write(`⚠  Low resolution (${w}×${h}). Extraction accuracy may be reduced.\n`)
    }
    if (w > MAX_SIDE_PX || h > MAX_SIDE_PX) {
      const resized = await sharp(data).resize(MAX_SIDE_PX, MAX_SIDE_PX, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
      process.stderr.write(`ℹ  Image resized from ${w}×${h} to fit ${MAX_SIDE_PX}px limit.\n`)
      return { data: resized, mediaType: 'image/png', resized: true }
    }
  } catch { /* sharp not installed — skip resize */ }
  return { data, mediaType: mt, resized: false }
}

async function convertSvg(filePath: string): Promise<PreparedImage> {
  try {
    // @ts-ignore -- sharp is an optional peer dependency
    const sharp = (await import('sharp')).default
    const png   = await sharp(filePath).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    return { data: png, mediaType: 'image/png', resized: false }
  } catch {
    try {
      // Fallback: resvg-js
      // @ts-ignore -- @resvg/resvg-js is an optional peer dependency
      const { Resvg } = await import('@resvg/resvg-js')
      const svg    = await fs.readFile(filePath, 'utf8')
      const resvg  = new Resvg(svg, { fitTo: { mode: 'width', value: 2048 } })
      const png    = resvg.render().asPng()
      return { data: Buffer.from(png), mediaType: 'image/png', resized: false }
    } catch {
      throw new Error(
        `SVG rasterization requires sharp or @resvg/resvg-js.\n` +
        `Install with: npm install sharp\n` +
        `Or convert your SVG to PNG first and pass that instead.`
      )
    }
  }
}

async function convertWithSharp(filePath: string): Promise<PreparedImage> {
  try {
    // @ts-ignore -- sharp is an optional peer dependency
    const sharp = (await import('sharp')).default
    const png   = await sharp(filePath).png().toBuffer()
    return { data: png, mediaType: 'image/png', resized: false }
  } catch {
    const ext = path.extname(filePath).toUpperCase().slice(1)
    throw new Error(`${ext} conversion requires sharp. Install with: npm install sharp`)
  }
}

async function convertPdf(filePath: string): Promise<PreparedImage> {
  try {
    // @ts-ignore -- pdf2pic is an optional peer dependency
    const { fromPath } = await import('pdf2pic')
    const converter = fromPath(filePath, { density: 150, saveFilename: 'tmp-codemind', savePath: '/tmp', format: 'png', width: 2048, height: 2048 })
    const result = await converter(1)
    if (!result.path) throw new Error('pdf2pic returned no path')
    const data = await fs.readFile(result.path)
    return { data, mediaType: 'image/png', resized: false }
  } catch {
    throw new Error(`PDF support requires pdf2pic. Install with: npm install pdf2pic\nOr export your PDF as a PNG image and pass that instead.`)
  }
}

async function convertMermaid(filePath: string): Promise<PreparedImage> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const exec = promisify(execFile)
  const outPath = `${filePath}.png`
  try {
    await exec('mmdc', ['-i', filePath, '-o', outPath, '-w', '2048'])
    const data = await fs.readFile(outPath)
    return { data, mediaType: 'image/png', resized: false }
  } catch {
    throw new Error(
      `Mermaid rendering requires @mermaid-js/mermaid-cli (mmdc).\n` +
      `Install with: npm install -g @mermaid-js/mermaid-cli\n` +
      `Or export your diagram as PNG from mermaid.live and pass that instead.`
    )
  }
}
