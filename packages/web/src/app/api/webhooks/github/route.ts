import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { Octokit } from "@octokit/rest";
import { fetchRepoFiles, buildGraph } from "@/lib/indexer";
import { generateReport } from "@/lib/reporter";

type PushPayload = {
  ref: string;
  repository: { full_name: string; default_branch: string };
};

function verifySignature(rawBody: string, secret: string, signature: string | null): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");

  if (event !== "push") {
    return NextResponse.json({ ok: true, skipped: `event=${event}` });
  }

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody) as PushPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = payload.repository?.full_name;
  const ref = payload.ref;
  if (!fullName) return NextResponse.json({ error: "Missing repository.full_name" }, { status: 400 });

  const repo = await db.repo.findFirst({
    where: { fullName },
    select: { id: true, userId: true, owner: true, name: true, fullName: true, webhookSecret: true },
  });

  if (!repo) return NextResponse.json({ error: "Repo not registered" }, { status: 404 });

  if (repo.webhookSecret) {
    if (!verifySignature(rawBody, repo.webhookSecret, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const defaultBranch = payload.repository.default_branch ?? "main";
  if (ref !== `refs/heads/${defaultBranch}`) {
    return NextResponse.json({ ok: true, skipped: `push to non-default branch ${ref}` });
  }

  const account = await db.account.findFirst({
    where: { userId: repo.userId, provider: "github" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No GitHub token for repo owner" }, { status: 400 });
  }

  try {
    const octokit = new Octokit({ auth: account.access_token });
    const files = await fetchRepoFiles(octokit, repo.owner, repo.name);
    const graph = buildGraph(files);
    const completeness = files.length > 0 ? 95 : 0;

    await Promise.all([
      db.repo.update({
        where: { id: repo.id },
        data: { graphData: JSON.stringify(graph), nodeCount: graph.nodes.length, edgeCount: graph.edges.length, completeness, indexedAt: new Date() },
      }),
      db.report.create({
        data: { userId: repo.userId, repoId: repo.id, data: JSON.stringify(generateReport(files, graph, repo.id, repo.fullName)) },
      }),
    ]);

    return NextResponse.json({ ok: true, repoId: repo.id, nodes: graph.nodes.length, edges: graph.edges.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Re-index failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
