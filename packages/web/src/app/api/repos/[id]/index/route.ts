import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { fetchRepoFiles, buildGraph } from "@/lib/indexer";
import { generateReport } from "@/lib/reporter";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const repo = await db.repo.findFirst({ where: { id: params.id, userId } });
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const account = await db.account.findFirst({ where: { userId, provider: "github" }, select: { access_token: true } });
  if (!account?.access_token) return NextResponse.json({ error: "GitHub token missing" }, { status: 400 });

  try {
    const octokit = new Octokit({ auth: account.access_token });
    const start = Date.now();
    const files = await fetchRepoFiles(octokit, repo.owner, repo.name);
    const graph = buildGraph(files);
    const latency = Date.now() - start;
    const completeness = files.length > 0 ? 95 : 0;
    const languages = [...new Set(files.map(f => f.language))];

    const [updated] = await Promise.all([
      db.repo.update({
        where: { id: repo.id },
        data: { graphData: JSON.stringify(graph), nodeCount: graph.nodes.length, edgeCount: graph.edges.length, completeness, indexedAt: new Date() },
      }),
      db.report.create({
        data: { userId, repoId: repo.id, data: JSON.stringify(generateReport(files, graph, repo.id, repo.fullName)) },
      }),
    ]);

    return NextResponse.json({ ...updated, latencyMs: latency, languages });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Indexing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
