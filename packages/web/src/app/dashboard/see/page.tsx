import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SeeClient } from "./client";

export default async function SeePage() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;

  const history = await db.diagramAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, filename: true, analysisText: true, createdAt: true },
  });

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return <SeeClient history={history} hasApiKey={hasApiKey} />;
}
