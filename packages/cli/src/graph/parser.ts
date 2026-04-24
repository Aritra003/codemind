import * as fs from 'fs/promises'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TreeSitter = require('tree-sitter') as typeof import('tree-sitter')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TypeScriptLang = require('tree-sitter-typescript').typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TypeScriptTsxLang = require('tree-sitter-typescript').tsx
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JavaScriptLang = require('tree-sitter-javascript')

import type { GraphNode, GraphEdge, NodeKind } from '@codemind/shared'
import type { DiscoveredFile } from './walker'
import { logger } from '../lib/logger'

export interface ParseResult {
  nodes:        GraphNode[]
  edges:        GraphEdge[]
  parse_errors: number
}

const UNRESOLVED     = 'UNRESOLVED'
const UNRESOLVED_DYN = 'UNRESOLVED_DYN'   // dynamic import() — local but unresolvable

const DECL_TYPES = new Set([
  'function_declaration', 'method_definition', 'class_declaration',
])

export async function parseFile(file: DiscoveredFile): Promise<ParseResult> {
  if (!file.language) return { nodes: [], edges: [], parse_errors: 0 }

  let source: string
  try {
    source = await fs.readFile(file.absolutePath, 'utf8')
  } catch {
    return { nodes: [], edges: [], parse_errors: 1 }
  }

  const isTsx = file.absolutePath.endsWith('.tsx') || file.absolutePath.endsWith('.jsx')
  const grammar =
    file.language === 'typescript'
      ? (isTsx ? TypeScriptTsxLang : TypeScriptLang)
      : JavaScriptLang

  const parser = new TreeSitter()
  try {
    parser.setLanguage(grammar)
  } catch {
    return { nodes: [], edges: [], parse_errors: 1 }
  }

  let tree: import('tree-sitter').Tree
  try {
    // Default buffer is ~64KB; large files need more. 1MB covers files up to ~400K chars.
    tree = parser.parse(source, undefined, { bufferSize: 1024 * 1024 })
  } catch (err) {
    logger.warn({ file: file.relativePath, err: String(err) }, 'parse_skipped')
    return { nodes: [], edges: [], parse_errors: 1 }
  }
  if (tree.rootNode.hasError) {
    return extractNodes(tree.rootNode, file, source, 1)
  }
  return extractNodes(tree.rootNode, file, source, 0)
}

function extractNodes(
  root:         import('tree-sitter').SyntaxNode,
  file:         DiscoveredFile,
  source:       string,
  parse_errors: number,
): ParseResult {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Synthetic module-level node — acts as caller for top-level calls.
  // Only added to the nodes array on first use (lazy) so files with no module-level
  // calls don't gain an extra node or extra UNRESOLVED edges in the completeness count.
  const moduleNode: GraphNode = {
    id:          `${file.relativePath}::__module__`,
    file:        file.relativePath,
    name:        '__module__',
    kind:        'function',
    line_start:  1,
    line_end:    root.endPosition.row + 1,
    language:    file.language ?? 'unknown',
    is_exported: false,
    resolution:  'static',
  }
  let moduleNodeAdded = false
  function ensureModuleNode(): void {
    if (!moduleNodeAdded) { nodes.push(moduleNode); moduleNodeAdded = true }
  }

  // nodeStack: innermost named declaration is the caller for call edges.
  // We seed it with moduleNode so top-level calls are attributed to the file's module node.
  const nodeStack: GraphNode[] = [moduleNode]

  function visit(node: import('tree-sitter').SyntaxNode): void {
    const isExportParent = node.parent?.type === 'export_statement'

    if (DECL_TYPES.has(node.type)) {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        const gn = makeGraphNode(nameNode.text, node, file, isExportParent)
        nodes.push(gn)
        nodeStack.push(gn)
        for (const child of node.namedChildren) visit(child)
        nodeStack.pop()
        return
      }
    }

    // Arrow function in variable declarator: `const foo = (x) => ...`
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name')
      const valueNode = node.childForFieldName('value')
      if (nameNode && valueNode?.type === 'arrow_function') {
        const exported = node.parent?.parent?.type === 'export_statement'
        const gn = makeGraphNode(nameNode.text, valueNode, file, exported, 'arrow_function')
        nodes.push(gn)
        nodeStack.push(gn)
        for (const child of valueNode.namedChildren) visit(child)
        nodeStack.pop()
        return
      }
    }

    // Call edges — only direct identifier calls (not obj.method() — too ambiguous to resolve)
    if (node.type === 'call_expression') {
      const callerNode = nodeStack[nodeStack.length - 1]!
      const isModuleLevelCaller = callerNode === moduleNode
      const fnNode = node.childForFieldName('function')

      // Dynamic import(): import(`./plugins/${name}`) — unresolvable, mark as DYN
      if (fnNode?.type === 'import') {
        if (isModuleLevelCaller) ensureModuleNode()
        edges.push({
          from:   callerNode.id,
          to:     `${UNRESOLVED_DYN}::__dynamic__`,
          kind:   'calls',
          weight: 1,
        })
        for (const child of node.namedChildren) visit(child)
        return
      }

      if (fnNode?.type === 'identifier') {
        // CommonJS require('./module') — create an IMPORTS edge instead of a call edge
        if (fnNode.text === 'require') {
          const argsNode = node.childForFieldName('arguments')
          const firstArg = argsNode?.namedChildren[0]
          if (firstArg?.type === 'string') {
            const requirePath = firstArg.text.replace(/['"]/g, '')
            // Only index relative/local requires (not bare npm packages)
            if (requirePath.startsWith('.') || requirePath.startsWith('/')) {
              edges.push({
                from:   file.relativePath,
                to:     requirePath,
                kind:   'imports',
                weight: 1,
              })
            }
          }
        } else {
          if (isModuleLevelCaller) ensureModuleNode()
          edges.push({
            from:   callerNode.id,
            to:     `${UNRESOLVED}::${fnNode.text}`,
            kind:   'calls',
            weight: 1,
          })
        }
      }
    }

    // ESM import edges
    if (node.type === 'import_statement') {
      const sourceNode = node.childForFieldName('source')
      if (sourceNode) {
        const importPath = sourceNode.text.replace(/['"]/g, '')
        edges.push({
          from:   file.relativePath,
          to:     importPath,
          kind:   'imports',
          weight: 1,
        })
      }
    }

    // Re-export edges: `export { X } from './Y'` or `export * from './Y'`
    // These make barrel files visible to the import graph.
    if (node.type === 'export_statement') {
      const sourceNode = node.childForFieldName('source')
      if (sourceNode) {
        const exportPath = sourceNode.text.replace(/['"]/g, '')
        edges.push({
          from:   file.relativePath,
          to:     exportPath,
          kind:   'imports',
          weight: 1,
        })
      }
    }

    for (const child of node.namedChildren) visit(child)
  }

  visit(root)
  return { nodes, edges, parse_errors }
}

function makeGraphNode(
  name:       string,
  node:       import('tree-sitter').SyntaxNode,
  file:       DiscoveredFile,
  isExported: boolean,
  kind?:      NodeKind,
): GraphNode {
  const resolvedKind: NodeKind = kind ?? typeToKind(node.type)
  return {
    id:          `${file.relativePath}::${name}`,
    file:        file.relativePath,
    name,
    kind:        resolvedKind,
    line_start:  node.startPosition.row + 1,
    line_end:    node.endPosition.row + 1,
    language:    file.language ?? 'unknown',
    is_exported: isExported,
    resolution:  'static',
  }
}

function typeToKind(nodeType: string): NodeKind {
  switch (nodeType) {
    case 'function_declaration': return 'function'
    case 'method_definition':    return 'method'
    case 'class_declaration':    return 'class'
    case 'arrow_function':       return 'arrow_function'
    default:                     return 'function'
  }
}

