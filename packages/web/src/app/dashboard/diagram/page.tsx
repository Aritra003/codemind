import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

// Mermaid uses browser-only APIs — must never run on the server
const DiagramClient = dynamic(() => import("./client"), { ssr: false, loading: () => null });

export const metadata = { title: "Diagram | CodeMind" };

export default async function DiagramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DiagramClient />;
}
