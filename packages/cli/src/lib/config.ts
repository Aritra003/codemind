import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'
import * as yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_CONFIG } from '@codemind/shared'
import type { UserConfig } from '@codemind/shared'

// Computed lazily inside functions so that process.env.HOME changes (e.g. in tests) are respected
function getConfigDir():  string { return path.join(process.env['HOME'] ?? os.homedir(), '.codemind') }
function getConfigFile(): string { return path.join(getConfigDir(), 'config.yaml') }

export async function loadConfig(): Promise<UserConfig> {
  let fileConfig: Partial<UserConfig> = {}

  try {
    const raw = await fs.readFile(getConfigFile(), 'utf8')
    fileConfig = yaml.load(raw) as Partial<UserConfig>
  } catch {
    // No config file yet — generate one with safe defaults
    fileConfig = await createDefaultConfig()
  }

  const merged: UserConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    telemetry: {
      ...DEFAULT_CONFIG.telemetry,
      ...fileConfig.telemetry,
    },
    ai: {
      ...DEFAULT_CONFIG.ai,
      ...fileConfig.ai,
    },
    limits: {
      ...DEFAULT_CONFIG.limits,
      ...fileConfig.limits,
    },
  }

  // Env var overrides file value (env var wins — easier for CI and power users)
  const envKey = process.env['ANTHROPIC_API_KEY']
  if (envKey) {
    merged.anthropic_api_key = envKey
  }

  return merged
}

export async function saveConfig(patch: Partial<UserConfig>): Promise<void> {
  await ensureConfigDir()
  const configFile = getConfigFile()
  let existing: Partial<UserConfig> = {}
  try {
    const raw = await fs.readFile(configFile, 'utf8')
    existing = yaml.load(raw) as Partial<UserConfig>
  } catch {
    // no existing config — start fresh
  }
  const updated = { ...existing, ...patch }
  const tmpFile = configFile + '.tmp'
  await fs.writeFile(tmpFile, yaml.dump(updated), 'utf8')
  await fs.rename(tmpFile, configFile)
}

export function getGraphDir(repoRoot: string): string {
  return path.join(repoRoot, '.codemind', 'graph')
}

export async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true })
}

export function generateInstallId(): string {
  return uuidv4()
}

async function createDefaultConfig(): Promise<Partial<UserConfig>> {
  const defaultWithId: Partial<UserConfig> = {
    ...DEFAULT_CONFIG,
    telemetry: {
      ...DEFAULT_CONFIG.telemetry,
      install_id: generateInstallId(),
    },
  }
  try {
    await ensureConfigDir()
    await fs.writeFile(getConfigFile(), yaml.dump(defaultWithId), 'utf8')
  } catch {
    // write failure is non-fatal — return the defaults in memory
  }
  return defaultWithId
}
