import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AskClient from "./client";

export const metadata = { title: "Ask | CodeMind" };

export default async function AskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AskClient hasApiKey={!!process.env.ANTHROPIC_API_KEY} />;
}
