import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'
import { loadMappings, saveMappings, type SeeMappings } from '../../../src/vision/mappings'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mappings-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const sampleMappings: SeeMappings = {
  version:  1,
  mappings: { 'Auth Service': 'src/auth/service.ts::AuthService', 'DB Layer': 'src/db/index.ts::connect' },
}

describe('loadMappings / saveMappings', () => {
  it('returns null when file does not exist', async () => {
    const result = await loadMappings(tmpDir)
    expect(result).toBeNull()
  })

  it('parses a valid see-mappings.yaml', async () => {
    await saveMappings(tmpDir, sampleMappings)
    const result = await loadMappings(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.mappings['Auth Service']).toBe('src/auth/service.ts::AuthService')
  })

  it('round-trips: save → load → identical', async () => {
    await saveMappings(tmpDir, sampleMappings)
    const loaded = await loadMappings(tmpDir)
    expect(loaded).toEqual(sampleMappings)
  })

  it('does not throw when .stinkit dir does not exist', async () => {
    const nonExistent = path.join(tmpDir, 'sub', 'dir')
    await expect(loadMappings(nonExistent)).resolves.toBeNull()
  })

  it('saveMappings creates .stinkit directory if missing', async () => {
    const newDir = path.join(tmpDir, 'fresh-repo')
    await saveMappings(newDir, sampleMappings)
    const result = await loadMappings(newDir)
    expect(result).not.toBeNull()
  })
})
