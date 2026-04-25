import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const report = await db.report.findFirst({ where: { id: params.id, userId } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: report.id, createdAt: report.createdAt, data: JSON.parse(report.data) });
}
