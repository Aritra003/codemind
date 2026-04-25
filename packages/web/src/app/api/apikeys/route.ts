import { auth } from "@/lib/auth";
import { createApiKey, listApiKeys, deleteApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({ name: z.string().min(1).max(64) });

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const keys = await listApiKeys(userId);
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const existing = await db.apiKey.count({ where: { userId } });
  if (existing >= 10) return NextResponse.json({ error: "Maximum 10 API keys allowed." }, { status: 400 });

  const raw = await createApiKey(userId, parsed.data.name);
  const record = await db.apiKey.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, lastUsed: true, createdAt: true } });

  return NextResponse.json({ key: raw, record }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteApiKey(id, userId);
  return NextResponse.json({ ok: true });
}
