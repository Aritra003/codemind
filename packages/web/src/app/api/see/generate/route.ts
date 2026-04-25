import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMermaid, type WebGraph } from "@/lib/graph-query";

const Schema = z.object({
  repoId: z.string().optional(),
  scope:  z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json() as unknown;
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const { repoId, scope } = parsed.data;

  const repo = repoId
    ? await db.repo.findFirst({ where: { id: repoId, userId }, select: { id: true, fullName: true, graphData: true } })
    : await db.repo.findFirst({ where: { userId, graphData: { not: null } }, orderBy: { indexedAt: "desc" }, select: { id: true, fullName: true, graphData: true } });

  if (!repo?.graphData)
    return NextResponse.json({ error: "No indexed repo found. Index a repo first." }, { status: 404 });

  let graph: WebGraph;
  try { graph = JSON.parse(repo.graphData) as WebGraph; }
  catch { return NextResponse.json({ error: "Graph data corrupted" }, { status: 500 }); }

  const result = generateMermaid(graph, scope);
  return NextResponse.json({ ...result, repoName: repo.fullName });
}
