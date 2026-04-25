import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyApiKey } from "@/lib/api-keys";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractKeywords, findMatchingNodes, buildCallChains,
  getDirectDependents, getDirectoryOverview, computeBlastRadius,
  type WebGraph,
} from "@/lib/graph-query";

const Schema = z.object({
  question: z.string().min(1).max(500),
  repoId:   z.string().optional(),
});

const SYSTEM = "You are a senior software architect. Answer questions about codebase structure using only the provided graph data. Be concrete — reference specific file paths, function names, and dependency counts. No generic advice.";

const IMPACT_WORDS = ['break', 'remove', 'refactor', 'safe', 'change', 'delete', 'replace', 'migrate'];

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

  const { question, repoId } = parsed.data;

  const repo = repoId
    ? await db.repo.findFirst({ where: { id: repoId, userId }, select: { id: true, fullName: true, graphData: true, completeness: true } })
    : await db.repo.findFirst({ where: { userId, graphData: { not: null } }, orderBy: { indexedAt: "desc" }, select: { id: true, fullName: true, graphData: true, completeness: true } });

  if (!repo?.graphData)
    return NextResponse.json({ error: "No indexed repo found. Index a repo first." }, { status: 404 });

  let graph: WebGraph;
  try { graph = JSON.parse(repo.graphData) as WebGraph; }
  catch { return NextResponse.json({ error: "Graph data corrupted" }, { status: 500 }); }

  const keywords = extractKeywords(question);
  const matched  = findMatchingNodes(graph, keywords);
  const chains   = buildCallChains(matched, graph);
  const overview = getDirectoryOverview(graph);

  const hotspots = [...new Map(
    graph.edges.map(e => [e.to, (graph.edges.filter(x => x.to === e.to).length)])
  ).entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, count]) => {
      const n = graph.nodes.find(x => x.id === id);
      return `${n?.file ?? id} (${count} dependents)`;
    });

  let blastSection = "";
  if (matched.length > 0 && IMPACT_WORDS.some(w => question.toLowerCase().includes(w))) {
    const r = computeBlastRadius(graph, [matched[0]!.id]);
    blastSection = `\n## BLAST RADIUS (first matched node)\nDirect: ${r.direct.length}\nTransitive: ${r.transitive.length}\n`;
  }

  const nodeLines = matched.length > 0
    ? matched.map(n => `- ${n.file}::${n.name} (${n.kind}, ${getDirectDependents(graph, n.id).length} dependents)`).join('\n')
    : "(no matching nodes — answering from directory structure overview)";

  const prompt = `You are a senior software architect explaining a codebase to a developer.

## CODEBASE OVERVIEW
- ${graph.nodes.length} nodes, ${graph.edges.length} edges
- Languages: ${graph.languages?.join(', ') ?? 'unknown'}
- Completeness: ${graph.completeness_pct ?? repo.completeness ?? 0}%
- Directory structure:
${overview.map(d => `  ${d}`).join('\n')}

## RELEVANT CODE STRUCTURE (${matched.length} nodes matched)
${nodeLines}

## CALL CHAINS
${chains.length > 0 ? chains.map(c => c.join(' → ')).join('\n') : '(no multi-hop paths found)'}
${blastSection}
## TOP HOTSPOTS
${hotspots.join('\n')}

## QUESTION
${question}

Answer using ONLY the structural data above. Reference specific files and call chains. Be concrete.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 2048,
    system:     SYSTEM,
    messages:   [{ role: "user", content: prompt }],
  });

  const answer = msg.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("\n");

  return NextResponse.json({ answer, nodesMatched: matched.length, model: msg.model, repoName: repo.fullName });
}
