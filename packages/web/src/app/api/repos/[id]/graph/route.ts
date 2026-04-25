import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const repo = await db.repo.findFirst({
    where: { id: params.id, userId },
    select: { id: true, fullName: true, graphData: true, nodeCount: true, edgeCount: true, completeness: true, indexedAt: true },
  });

  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  if (!repo.graphData) return NextResponse.json({ error: "Not indexed yet" }, { status: 404 });

  try {
    const graph = JSON.parse(repo.graphData);
    return NextResponse.json({ ...graph, meta: { repoId: repo.id, fullName: repo.fullName, nodeCount: repo.nodeCount, edgeCount: repo.edgeCount, completeness: repo.completeness } });
  } catch {
    return NextResponse.json({ error: "Graph data corrupted" }, { status: 500 });
  }
}
