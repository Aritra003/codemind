import type { HealthScore } from './report-types'

export interface ScoreInputs {
  criticalCount:     number
  highCount:         number
  mediumCount:       number
  circularDeps:      number
  uncoveredHotspots: number
}

export function computeHealthScore(inputs: ScoreInputs): HealthScore {
  let score = 100
  score -= inputs.criticalCount * 25
  score -= inputs.highCount * 2
  score -= inputs.mediumCount * 0.5
  score -= inputs.circularDeps * 3
  score -= inputs.uncoveredHotspots * 2
  score = Math.max(0, Math.round(score))

  const grade = scoreToGrade(score)
  const label = gradeToLabel(grade)
  return { score, grade, label }
}

function scoreToGrade(score: number): HealthScore['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function gradeToLabel(grade: HealthScore['grade']): HealthScore['label'] {
  switch (grade) {
    case 'A': return 'Excellent'
    case 'B': return 'Good'
    case 'C': return 'Needs Attention'
    case 'D': return 'At Risk'
    case 'F': return 'Critical'
  }
}
