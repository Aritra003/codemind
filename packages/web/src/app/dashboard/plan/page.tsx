import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanClient from "./client";

export const metadata = { title: "Plan | StinKit" };

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <PlanClient hasApiKey={!!process.env.ANTHROPIC_API_KEY} />;
}
