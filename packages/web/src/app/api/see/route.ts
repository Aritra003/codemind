import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "image/bmp", "image/tiff", "application/pdf", "text/x-mermaid",
]);

const CLI_ONLY_TYPES = new Set(["application/pdf", "text/x-mermaid"]);

const VISION_PROMPT = `You are a senior software architect analysing a code diagram or architecture image.

Analyse this diagram and provide:
1. **Diagram Type** — what kind of diagram is this? (e.g. ER diagram, sequence diagram, architecture overview, dependency graph, flowchart, class diagram, etc.)
2. **Components** — list the key components/nodes/entities and their roles
3. **Relationships** — describe the key relationships, dependencies, or data flows
4. **Hotspots** — identify any potential single points of failure, high-coupling nodes, or bottlenecks
5. **Recommendations** — 2–3 concrete architecture improvements or observations

Be precise and technical. Reference specific names from the diagram where visible.`;

type AnthropicMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

async function toAnthropicBuffer(buf: Buffer, mimeType: string): Promise<{ data: Buffer; mediaType: AnthropicMediaType }> {
  if (["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mimeType)) {
    return { data: buf, mediaType: mimeType as AnthropicMediaType };
  }
  // BMP / TIFF → PNG via sharp (optional dep)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const sharpFn = require("sharp") as (buf: Buffer) => { png(): { toBuffer(): Promise<Buffer> } };
    const png = await sharpFn(buf).png().toBuffer();
    return { data: png, mediaType: "image/png" };
  } catch {
    throw new Error(`${mimeType} conversion requires sharp. Run: npm install sharp in packages/web`);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "Unsupported format. Use PNG, JPG, SVG, WebP, BMP, TIFF, PDF, or Mermaid." }, { status: 400 });
  }

  if (CLI_ONLY_TYPES.has(mimeType)) {
    const fmt = mimeType === "application/pdf" ? "PDF" : "Mermaid";
    return NextResponse.json({
      error: `${fmt} analysis requires the CLI: \`codemind see ${file.name}\``,
    }, { status: 422 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Max 20 MB." }, { status: 400 });
  }

  let imageData: Buffer;
  let imageMediaType: AnthropicMediaType;

  try {
    const result = await toAnthropicBuffer(Buffer.from(arrayBuffer), mimeType);
    imageData = result.data;
    imageMediaType = result.mediaType;
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Conversion failed" }, { status: 422 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType, data: imageData.toString("base64") } },
          { type: "text", text: VISION_PROMPT },
        ],
      }],
    });

    const analysisText = message.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("\n");

    await db.diagramAnalysis.create({
      data: { userId, filename: file.name, mimeType: file.type, analysisText },
    });

    return NextResponse.json({ analysis: analysisText, filename: file.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Vision analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const analyses = await db.diagramAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, filename: true, mimeType: true, analysisText: true, createdAt: true },
  });

  return NextResponse.json(analyses);
}
