import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const reports = await db.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, repoId: true, createdAt: true, repo: { select: { fullName: true } } },
  });

  return NextResponse.json(reports);
}
