import * as fs   from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface SeeMappings {
  version:  number
  mappings: Record<string, string>
}

const MAPPINGS_PATH = '.stinkit/see-mappings.yaml'

export async function loadMappings(repoRoot: string): Promise<SeeMappings | null> {
  const filePath = path.join(repoRoot, MAPPINGS_PATH)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
  return yaml.load(raw) as SeeMappings
}

export async function saveMappings(repoRoot: string, mappings: SeeMappings): Promise<void> {
  const filePath = path.join(repoRoot, MAPPINGS_PATH)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, yaml.dump(mappings), 'utf8')
}
