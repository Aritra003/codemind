import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'
import { walkFiles, detectLanguage } from '../../../src/graph/walker'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walker-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('detectLanguage', () => {
  it('detects TypeScript', () => { expect(detectLanguage('foo.ts')).toBe('typescript') })
  it('detects TSX', () => { expect(detectLanguage('foo.tsx')).toBe('typescript') })
  it('detects JavaScript', () => { expect(detectLanguage('foo.js')).toBe('javascript') })
  it('detects JSX', () => { expect(detectLanguage('foo.jsx')).toBe('javascript') })
  it('returns null for unknown extension', () => { expect(detectLanguage('foo.py')).toBeNull() })
  it('returns null for no extension', () => { expect(detectLanguage('Makefile')).toBeNull() })
})

describe('walkFiles', () => {
  it('finds .ts files recursively', async () => {
    await fs.mkdir(path.join(tmpDir, 'src'))
    await fs.writeFile(path.join(tmpDir, 'src', 'a.ts'), 'export const x = 1')
    await fs.writeFile(path.join(tmpDir, 'src', 'b.ts'), 'export const y = 2')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    const names = files.map(f => f.relativePath).sort()
    expect(names).toEqual(['src/a.ts', 'src/b.ts'])
  })

  it('skips node_modules', async () => {
    await fs.mkdir(path.join(tmpDir, 'node_modules', 'pkg'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'node_modules', 'pkg', 'index.ts'), '')
    await fs.writeFile(path.join(tmpDir, 'app.ts'), '')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files.map(f => f.relativePath)).toEqual(['app.ts'])
  })

  it('skips .git directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.git'))
    await fs.writeFile(path.join(tmpDir, '.git', 'config'), '')
    await fs.writeFile(path.join(tmpDir, 'index.ts'), '')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files.map(f => f.relativePath)).toEqual(['index.ts'])
  })

  it('skips dist and build directories', async () => {
    await fs.mkdir(path.join(tmpDir, 'dist'))
    await fs.mkdir(path.join(tmpDir, 'build'))
    await fs.writeFile(path.join(tmpDir, 'dist', 'out.js'), '')
    await fs.writeFile(path.join(tmpDir, 'build', 'out.js'), '')
    await fs.writeFile(path.join(tmpDir, 'src.ts'), '')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files.map(f => f.relativePath)).toEqual(['src.ts'])
  })

  it('returns absolutePath and relativePath', async () => {
    await fs.writeFile(path.join(tmpDir, 'foo.ts'), '')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files[0]!.absolutePath).toBe(path.join(tmpDir, 'foo.ts'))
    expect(files[0]!.relativePath).toBe('foo.ts')
  })

  it('only returns files with supported languages', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.ts'), '')
    await fs.writeFile(path.join(tmpDir, 'b.md'), '')
    await fs.writeFile(path.join(tmpDir, 'c.json'), '')
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files).toHaveLength(1)
    expect(files[0]!.relativePath).toBe('a.ts')
  })

  it('returns empty array for empty directory', async () => {
    const files = await walkFiles({ repoRoot: tmpDir, include: [], respectGitignore: false })
    expect(files).toEqual([])
  })
})
