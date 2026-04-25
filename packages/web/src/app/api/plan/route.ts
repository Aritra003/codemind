import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyApiKey } from "@/lib/api-keys";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractKeywords, findMatchingNodes, computeBlastRadius, computeChangeTiers,
  getDirectDependents, hasTestCoverage, type WebGraph, type WNode,
} from "@/lib/graph-query";

const Schema = z.object({
  goal:   z.string().min(1).max(500),
  repoId: z.string().optional(),
});

const SYSTEM = "You are a senior software engineer. Create precise, actionable refactoring plans. Reference specific file paths from the data provided. Be concrete about PR boundaries and rollback strategies.";

function buildPrompt(goal: string, tiers: WNode[][], graph: WebGraph, uncovered: number): string {
  const total    = tiers.reduce((s, t) => s + t.length, 0);
  const tierLines = tiers.map((tier, i) => {
    const files = tier.map(n => {
      const deps = getDirectDependents(graph, n.id).length;
      const cov  = hasTestCoverage(n, graph) ? "yes" : "NO";
      return `  - ${n.file} (${deps} dependents, coverage: ${cov})`;
    }).join('\n');
    return `Tier ${i + 1} (${tier.length} files — change ${i === 0 ? "FIRST" : `after Tier ${i}`}):\n${files}`;
  }).join('\n\n');

  const hotspot = [...new Map(graph.edges.map(e => [e.to, graph.edges.filter(x => x.to === e.to).length])).entries()]
    .sort((a, b) => b[1] - a[1])[0];
  const riskLine = hotspot
    ? `Highest-risk file: ${graph.nodes.find(n => n.id === hotspot[0])?.file ?? hotspot[0]} (${hotspot[1]} dependents)`
    : "No high-risk files identified";

  return `You are a senior engineer creating a step-by-step refactoring plan.

## GOAL
${goal}

## AFFECTED FILES (${total} files, ordered from safest to riskiest)
${tierLines || "(no files matched — provide a general plan based on the goal)"}

## BLAST RADIUS SUMMARY
Total files affected: ${total}
Files with no test coverage: ${uncovered}
${riskLine}

Create a refactoring plan with:
1. Numbered steps with: what to do, which files, risk level (LOW/MEDIUM/HIGH), estimated effort, what to test
2. Suggested PR boundaries — each PR must be independently mergeable
3. A rollback point after each PR
4. First step MUST be "Add tests to files lacking coverage"
5. Last step MUST be "Remove old code / clean up"
6. Reference actual file paths from the data above

Format:
STEP N: [title]
  Files: [list]
  Risk: LOW/MEDIUM/HIGH
  Effort: [estimate]
  Test: [what to verify]

PR BOUNDARY after steps N-M: "[PR title]"
  Rollback: [what to revert]`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  let userId: string | null = null;

  if (session?.user) {
    userId = (session.user as { id: string }).id;
  } else {
    const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (key) userId = await verifyApiKey(key);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const body = await req.json() as unknown;
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const { goal, repoId } = parsed.data;

  const repo = repoId
    ? await db.repo.findFirst({ where: { id: repoId, userId }, select: { id: true, fullName: true, graphData: true } })
    : await db.repo.findFirst({ where: { userId, graphData: { not: null } }, orderBy: { indexedAt: "desc" }, select: { id: true, fullName: true, graphData: true } });

  if (!repo?.graphData)
    return NextResponse.json({ error: "No indexed repo found. Index a repo first." }, { status: 404 });

  let graph: WebGraph;
  try { graph = JSON.parse(repo.graphData) as WebGraph; }
  catch { return NextResponse.json({ error: "Graph data corrupted" }, { status: 500 }); }

  const keywords = extractKeywords(goal);
  const matched  = findMatchingNodes(graph, keywords);

  let allAffected: WNode[] = matched;
  if (matched.length > 0) {
    const radius   = computeBlastRadius(graph, matched.map(n => n.id));
    const allIds   = new Set([...radius.direct, ...radius.transitive, ...matched.map(n => n.id)]);
    allAffected    = graph.nodes.filter(n => allIds.has(n.id));
  }

  const tiers    = computeChangeTiers(allAffected, graph);
  const flat     = tiers.flat();
  const uncovered = flat.filter(n => !hasTestCoverage(n, graph)).length;
  const prompt   = buildPrompt(goal, tiers, graph, uncovered);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 3000,
    system:     SYSTEM,
    messages:   [{ role: "user", content: prompt }],
  });

  const plan = msg.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("\n");

  return NextResponse.json({ plan, tiers: tiers.length, affected: flat.length, model: msg.model, repoName: repo.fullName });
}
