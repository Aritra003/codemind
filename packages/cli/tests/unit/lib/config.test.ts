import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'

// We need to mock os.homedir so config reads from our tmp dir
let tmpHome: string

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codemind-home-'))
  vi.stubEnv('HOME', tmpHome)
  vi.stubEnv('ANTHROPIC_API_KEY', '')
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await fs.rm(tmpHome, { recursive: true, force: true })
  vi.resetModules()
})

describe('loadConfig', () => {
  it('returns safe defaults when config file does not exist', async () => {
    const { loadConfig } = await import('../../../src/lib/config')
    const config = await loadConfig()
    expect(config.telemetry.enabled).toBe(false)
    expect(config.ai.max_retries).toBe(2)
    expect(config.limits.ai_context_max_nodes).toBe(200)
  })

  it('does not throw when config file is missing', async () => {
    const { loadConfig } = await import('../../../src/lib/config')
    await expect(loadConfig()).resolves.toBeDefined()
  })

  it('reads ANTHROPIC_API_KEY from env var when config file is absent', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
    const { loadConfig } = await import('../../../src/lib/config')
    const config = await loadConfig()
    expect(config.anthropic_api_key).toBe('sk-ant-test-key')
  })

  it('parses a valid config.yaml', async () => {
    const configDir = path.join(tmpHome, '.codemind')
    await fs.mkdir(configDir, { recursive: true })
    const yaml = `anthropic_api_key: sk-ant-from-file\ntelemetry:\n  enabled: true\n  install_id: test-uuid\nai:\n  monthly_token_budget: 100000\n  max_retries: 3\nlimits:\n  ai_context_max_nodes: 100\n`
    await fs.writeFile(path.join(configDir, 'config.yaml'), yaml)
    const { loadConfig } = await import('../../../src/lib/config')
    const config = await loadConfig()
    expect(config.anthropic_api_key).toBe('sk-ant-from-file')
    expect(config.telemetry.enabled).toBe(true)
    expect(config.ai.max_retries).toBe(3)
  })

  it('env var overrides file value for anthropic_api_key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-env-wins')
    const configDir = path.join(tmpHome, '.codemind')
    await fs.mkdir(configDir, { recursive: true })
    const yaml = `anthropic_api_key: sk-ant-from-file\ntelemetry:\n  enabled: false\n  install_id: x\nai:\n  monthly_token_budget: 500000\n  max_retries: 2\nlimits:\n  ai_context_max_nodes: 200\n`
    await fs.writeFile(path.join(configDir, 'config.yaml'), yaml)
    const { loadConfig } = await import('../../../src/lib/config')
    const config = await loadConfig()
    expect(config.anthropic_api_key).toBe('sk-ant-env-wins')
  })

  it('generates install_id when config is created fresh', async () => {
    const { loadConfig } = await import('../../../src/lib/config')
    const config = await loadConfig()
    expect(typeof config.telemetry.install_id).toBe('string')
    expect(config.telemetry.install_id.length).toBeGreaterThan(0)
  })
})
