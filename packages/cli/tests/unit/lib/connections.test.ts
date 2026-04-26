import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'
import { loadConnections } from '../../../src/lib/connections'
import { StinKitError }   from '../../../src/lib/errors'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stinkit-test-'))
  await fs.mkdir(path.join(tmpDir, '.stinkit'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('loadConnections', () => {
  it('returns null when connections.yaml does not exist', async () => {
    const result = await loadConnections(tmpDir)
    expect(result).toBeNull()
  })

  it('parses a valid connections.yaml', async () => {
    const yaml = `version: 1\nconnections:\n  - from: "src/a.ts:fn"\n    to: "src/b.ts:fn"\n    kind: dynamic\n`
    await fs.writeFile(path.join(tmpDir, '.stinkit', 'connections.yaml'), yaml)
    const result = await loadConnections(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.connections).toHaveLength(1)
    expect(result!.connections[0]!.from).toBe('src/a.ts:fn')
    expect(result!.connections[0]!.kind).toBe('dynamic')
  })

  it('returns null (not throws) when file is missing', async () => {
    await expect(loadConnections('/nonexistent-path-xyz')).resolves.toBeNull()
  })

  it('throws StinKitError on invalid YAML', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.stinkit', 'connections.yaml'),
      'this: is: not: valid: yaml: :\n  bad indentation\n    wrong'
    )
    await expect(loadConnections(tmpDir)).rejects.toBeInstanceOf(StinKitError)
  })

  it('handles connection with optional note field', async () => {
    const yaml = `version: 1\nconnections:\n  - from: "a:x"\n    to: "b:y"\n    kind: event\n    note: "emitted at runtime"\n`
    await fs.writeFile(path.join(tmpDir, '.stinkit', 'connections.yaml'), yaml)
    const result = await loadConnections(tmpDir)
    expect(result!.connections[0]!.note).toBe('emitted at runtime')
  })
})
