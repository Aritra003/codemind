import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const repo = await db.repo.findFirst({ where: { id: params.id, userId } });
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const secret = randomBytes(24).toString("hex");
  await db.repo.update({ where: { id: repo.id }, data: { webhookSecret: secret } });

  return NextResponse.json({ secret, webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/github` });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const repo = await db.repo.findFirst({ where: { id: params.id, userId } });
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  await db.repo.update({ where: { id: repo.id }, data: { webhookSecret: null } });
  return NextResponse.json({ ok: true });
}
