import type { CodeGraph } from '@codemind/shared'
import type { AIClient, DiagramExtractionResult, EntityResolutionResult } from '../ai/client'
import type { DriftReport } from '../../commands/see'
import { extractDiagramEntities } from '../../vision/extract'
import { resolveEntities }        from '../../vision/resolve'
import { compareToGraph }         from '../../vision/compare'

export class VisionModule {
  constructor(private readonly ai: AIClient) {}

  async extractEntities(imagePath: string): Promise<DiagramExtractionResult> {
    return extractDiagramEntities(this.ai, imagePath)
  }

  async resolveEntities(
    extracted: DiagramExtractionResult,
    graph:     CodeGraph,
  ): Promise<EntityResolutionResult[]> {
    return resolveEntities(this.ai, extracted, graph)
  }

  compareToGraph(resolved: EntityResolutionResult[], graph: CodeGraph): DriftReport {
    return compareToGraph(resolved, graph)
  }
}
