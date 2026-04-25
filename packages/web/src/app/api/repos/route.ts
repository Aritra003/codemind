import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const AddSchema = z.object({ fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "Format: owner/repo") });

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const repos = await db.repo.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(repos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const { fullName } = parsed.data;
  const [owner, name] = fullName.split("/");

  const account = await db.account.findFirst({ where: { userId, provider: "github" }, select: { access_token: true } });
  if (!account?.access_token) return NextResponse.json({ error: "GitHub account not connected. Please sign in with GitHub." }, { status: 400 });

  try {
    const octokit = new Octokit({ auth: account.access_token });
    const { data: ghRepo } = await octokit.repos.get({ owner, repo: name });

    const repo = await db.repo.upsert({
      where: { userId_fullName: { userId, fullName } },
      create: { userId, owner, name, fullName, description: ghRepo.description ?? null, language: ghRepo.language ?? null, isPrivate: ghRepo.private },
      update: { description: ghRepo.description ?? null, language: ghRepo.language ?? null, isPrivate: ghRepo.private },
    });

    return NextResponse.json(repo, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch repo from GitHub";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
