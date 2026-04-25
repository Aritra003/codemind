import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import type { ReportData, Severity } from "@/lib/reporter";
import type { GraphNode, GraphEdge } from "@/lib/indexer";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const repo = await db.repo.findFirst({
    where: { id: params.id, userId },
    select: { id: true, fullName: true, graphData: true, nodeCount: true, edgeCount: true, completeness: true },
  });

  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  if (!repo.graphData) return NextResponse.json({ error: "Not indexed yet — run index first" }, { status: 404 });

  let graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  try {
    graph = JSON.parse(repo.graphData);
  } catch {
    return NextResponse.json({ error: "Graph data corrupted — re-index to fix" }, { status: 500 });
  }

  // Enrich nodes + edges with health data from the most recent report (if any)
  const report = await db.report.findFirst({
    where: { repoId: repo.id, userId },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });

  if (report?.data) {
    try {
      graph = enrichWithHealth(graph, JSON.parse(report.data) as ReportData);
    } catch {
      // Corrupt report — proceed without annotations
    }
  }

  return NextResponse.json({
    ...graph,
    meta: { repoId: repo.id, fullName: repo.fullName, nodeCount: repo.nodeCount, edgeCount: repo.edgeCount, completeness: repo.completeness },
  });
}

const SEV_RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function enrichWithHealth(
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  rd: ReportData,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Per-file health from security findings
  type FileHealth = { severity: Severity; errorCount: number; warningCount: number };
  const fileHealth = new Map<string, FileHealth>();

  for (const f of rd.security.findings) {
    const existing = fileHealth.get(f.file);
    const isError = f.severity === "CRITICAL" || f.severity === "HIGH";
    const isWarn  = f.severity === "MEDIUM";
    if (!existing) {
      fileHealth.set(f.file, { severity: f.severity, errorCount: isError ? 1 : 0, warningCount: isWarn ? 1 : 0 });
    } else {
      if (SEV_RANK[f.severity] > SEV_RANK[existing.severity]) existing.severity = f.severity;
      if (isError) existing.errorCount++;
      if (isWarn)  existing.warningCount++;
    }
  }

  // Circular dependency node set + directed edge pairs
  const circularNodes = new Set<string>();
  const circularPairs = new Set<string>();
  for (const chain of rd.dataFlow.circularDependencies) {
    for (const id of chain) circularNodes.add(id);
    for (let i = 0; i < chain.length; i++) {
      circularPairs.add(`${chain[i]}→${chain[(i + 1) % chain.length]}`);
    }
  }

  const nodes = graph.nodes.map(n => {
    const h          = fileHealth.get(n.id) ?? fileHealth.get(n.file);
    const isCircular = circularNodes.has(n.id) || circularNodes.has(n.file);
    if (!h && !isCircular) return n;
    return {
      ...n,
      ...(h && { severity: h.severity, errorCount: h.errorCount, warningCount: h.warningCount }),
      ...(isCircular && { hasCircularDep: true }),
    };
  });

  const edges = graph.edges.map(e =>
    circularPairs.has(`${e.from}→${e.to}`) ? { ...e, kind: "circular" as const } : e,
  );

  return { nodes, edges };
}
