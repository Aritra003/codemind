import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const account = await db.account.findFirst({ where: { userId, provider: "github" }, select: { access_token: true } });
  if (!account?.access_token) return NextResponse.json({ error: "No GitHub token. Sign in with GitHub to browse repos." }, { status: 400 });

  const octokit = new Octokit({ auth: account.access_token });
  const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: "updated", affiliation: "owner,collaborator" });

  return NextResponse.json(
    data.map(r => ({
      fullName: r.full_name,
      description: r.description ?? null,
      isPrivate: r.private,
      language: r.language ?? null,
    }))
  );
}
