/** Core graph data structures. Serialised as MessagePack in .codemind/graph/. */

export interface CodeGraph {
  version:         number           // schema version for migration
  createdAt:       number           // unix ms
  repo_root:       string           // absolute path on disk
  node_count:      number
  edge_count:      number
  completeness_pct:          number  // INV-002: local resolution rate (external calls excluded)
  external_calls_excluded?:  number  // calls to npm packages / symbols not in graph
  ambiguous_local_calls?:    number  // local calls that couldn't be narrowed (same name, multiple files)
  nodes:           Map<NodeId, GraphNode>
  edges:           GraphEdge[]
  languages:       string[]
  git_available:   boolean
}

export type NodeId = string          // fully-qualified symbol: "src/auth/service.ts::login"

export interface GraphNode {
  id:           NodeId
  file:         string               // relative to repo_root
  name:         string               // function / class / method name
  kind:         NodeKind
  line_start:   number
  line_end:     number
  language:     string
  is_exported:  boolean
  resolution:   ResolutionKind
}

export type NodeKind =
  | 'function'
  | 'method'
  | 'class'
  | 'arrow_function'
  | 'module'

export type ResolutionKind =
  | 'static'     // resolved by tree-sitter (certain)
  | 'inferred'   // LLM-inferred (< 80% confidence per INV-004)
  | 'declared'   // from .codemind/connections.yaml
  | 'ambiguous'  // could not be resolved

export interface GraphEdge {
  from:       NodeId
  to:         NodeId
  kind:       EdgeKind
  weight:     number  // 1.0 default; higher = more critical path
}

export type EdgeKind = 'calls' | 'imports' | 'extends' | 'implements' | 'declared'

/** Blast radius result for a set of changed nodes. */
export interface BlastRadius {
  changed_nodes:      NodeId[]
  direct_dependents:  NodeId[]
  transitive_dependents: NodeId[]
  risk_level:         RiskLevel
  coverage_gaps:      NodeId[]       // affected nodes with no test file
  completeness_pct:   number
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
