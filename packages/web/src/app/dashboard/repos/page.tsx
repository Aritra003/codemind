import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReposClient } from "./client";

export default async function ReposPage() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;
  const account = await db.account.findFirst({ where: { userId, provider: "github" }, select: { access_token: true } });
  const repos = await db.repo.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return <ReposClient repos={repos} hasGithubToken={!!account?.access_token} />;
}
