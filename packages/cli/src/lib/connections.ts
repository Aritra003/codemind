import * as fs   from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { CodemindError } from './errors'

export interface ConnectionDeclaration {
  from:   string
  to:     string
  kind:   string
  note?:  string
}

export interface ConnectionsFile {
  version:     number
  connections: ConnectionDeclaration[]
}

export async function loadConnections(repoRoot: string): Promise<ConnectionsFile | null> {
  const filePath = path.join(repoRoot, '.codemind', 'connections.yaml')
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch {
    return null   // missing file is normal — not an error
  }

  try {
    const parsed = yaml.load(raw) as ConnectionsFile
    return parsed
  } catch (err) {
    throw new CodemindError(
      'CONNECTIONS_PARSE_ERROR',
      `Failed to parse .codemind/connections.yaml: ${String(err)}`,
      'Check the YAML syntax. See .codemind/connections.yaml.example for reference.',
    )
  }
}
