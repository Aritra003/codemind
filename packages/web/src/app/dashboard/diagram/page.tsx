import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DiagramClient from "./client";

export const metadata = { title: "Diagram | CodeMind" };

export default async function DiagramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DiagramClient />;
}
