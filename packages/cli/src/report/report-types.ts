export type FindingType =
  | 'hardcoded_api_key'
  | 'hardcoded_secret'
  | 'dangerouslySetInnerHTML'
  | 'innerHTML'
  | 'circular_dependency'
  | 'missing_test_coverage'
  | 'orphaned_file'
  | 'child_process'
  | 'weak_randomness'
  | 'over_coupled'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type PriorityTier = 'TODAY' | 'THIS_SPRINT' | 'NEXT_SPRINT'

export interface Finding {
  type: FindingType
  severity: Severity
  file: string
  line?: number
  message: string
  blastRadius?: number
}

export interface CircularChain {
  files: string[]
}

export interface HotspotEntry {
  file: string
  dependentCount: number
  hasCoverage: boolean
}

export interface AuditData {
  repoRoot:       string
  repoName:       string
  generatedAt:    string
  fileCount:      number
  languages:      string[]
  findings:       Finding[]
  circularChains: CircularChain[]
  hotspots:       HotspotEntry[]
  graph: {
    nodeCount:      number
    edgeCount:      number
    completenessPct: number
  }
}

export interface Theme {
  id:           string
  title:        string
  severity:     Severity
  findings:     Finding[]
  whatFound:    string
  whyDangerous: string
  whatToDo:     string
  whatIfNot:    string
  effort:       string
  priorityTier: PriorityTier
}

export interface HealthScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: 'Excellent' | 'Good' | 'Needs Attention' | 'At Risk' | 'Critical'
}

export interface PositiveSignal {
  title:       string
  description: string
}

export interface AuditThinkResult {
  executiveSummary:      string
  workingWellNarrative:  string
  model:                 string
  tokensUsed:            number
}
