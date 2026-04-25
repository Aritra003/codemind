export const ACCEPTED_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'image/bmp', 'image/svg+xml', 'image/tiff',
  'application/pdf', 'text/x-mermaid',
])

export const DIRECT_PREVIEW_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
])

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export function getEffectiveType(f: File): string {
  if (f.type && f.type !== 'application/octet-stream') return f.type
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    tiff: 'image/tiff', tif: 'image/tiff',
    pdf: 'application/pdf', mmd: 'text/x-mermaid', mermaid: 'text/x-mermaid',
  }
  return map[ext] ?? f.type
}

export async function rasterizeSVG(svgFile: File): Promise<{ preview: string; uploadFile: File }> {
  const text = await svgFile.text()
  const blob = new Blob([text], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth || 1024
      const h = img.naturalHeight || 1024
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(pngBlob => {
        if (!pngBlob) return reject(new Error('Rasterization failed'))
        const previewUrl = canvas.toDataURL('image/png')
        const name = svgFile.name.replace(/\.svg$/i, '.png')
        resolve({ preview: previewUrl, uploadFile: new File([pngBlob], name, { type: 'image/png' }) })
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
    img.src = url
  })
}
