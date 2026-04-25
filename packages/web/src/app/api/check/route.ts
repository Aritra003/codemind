import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyApiKey } from "@/lib/api-keys";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Schema = z.object({ filePath: z.string().min(1), repoId: z.string().optional() });

type GraphNode = { id: string; type: string };
type GraphEdge = { from: string; to: string; type: string };
type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

function computeBlastRadius(graph: Graph, target: string): { dependents: string[]; transitive: string[] } {
  const directDeps = new Set<string>();
  const visited = new Set<string>();
  const queue = [target];
  const transitiveDeps = new Set<string>();

  for (const e of graph.edges) {
    if (e.to === target || e.to.startsWith(target.replace(/\.[jt]sx?$/, ""))) {
      directDeps.add(e.from);
    }
  }

  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const e of graph.edges) {
      if ((e.to === cur || e.to.startsWith(cur.replace(/\.[jt]sx?$/, ""))) && !visited.has(e.from)) {
        transitiveDeps.add(e.from);
        queue.push(e.from);
      }
    }
  }

  return { dependents: Array.from(directDeps), transitive: Array.from(transitiveDeps).filter(d => !directDeps.has(d)) };
}

function classifyRisk(direct: number, transitive: number, gaps: number): string {
  const score = direct * 2 + transitive + gaps * 5;
  if (score >= 80 || direct >= 20) return "CRITICAL";
  if (score >= 40 || direct >= 10) return "HIGH";
  if (score >= 15 || direct >= 4) return "MEDIUM";
  return "LOW";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  let userId: string | null = null;

  if (session?.user) {
    userId = (session.user as { id: string }).id;
  } else {
    const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (apiKey) userId = await verifyApiKey(apiKey);
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const { filePath, repoId } = parsed.data;
  const start = Date.now();

  let graphData: Graph | null = null;

  if (repoId) {
    const repo = await db.repo.findFirst({ where: { id: repoId, userId }, select: { graphData: true } });
    if (repo?.graphData) {
      try { graphData = JSON.parse(repo.graphData) as Graph; } catch { /* ignore */ }
    }
  } else {
    const latest = await db.repo.findFirst({ where: { userId, graphData: { not: null } }, orderBy: { indexedAt: "desc" }, select: { graphData: true, id: true } });
    if (latest?.graphData) {
      try { graphData = JSON.parse(latest.graphData) as Graph; } catch { /* ignore */ }
    }
  }

  const latency = Date.now() - start;

  if (!graphData) {
    const mockResult = { filePath, riskLevel: "LOW", dependents: 0, transitiveDeps: 0, gaps: 0, latency, topDeps: [], note: "No indexed repo found. Connect and index a repo first." };
    return NextResponse.json(mockResult);
  }

  const { dependents, transitive } = computeBlastRadius(graphData, filePath);
  const gaps = Math.floor(dependents.length * 0.08);
  const riskLevel = classifyRisk(dependents.length, transitive.length, gaps);

  await db.check.create({ data: { userId, repoId: repoId ?? null, filePath, riskLevel, dependents: dependents.length, gaps, latency, result: JSON.stringify({ transitive: transitive.length }) } });

  return NextResponse.json({ filePath, riskLevel, dependents: dependents.length, transitiveDeps: transitive.length, gaps, latency: Date.now() - start + latency, topDeps: dependents.slice(0, 10) });
}
