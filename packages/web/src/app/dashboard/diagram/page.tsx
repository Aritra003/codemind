import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Mermaid uses browser-only APIs — must never run on the server
const DiagramClient = dynamic(() => import("./client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-16">
      <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} />
    </div>
  ),
});

export const metadata = { title: "Diagram | StinKit" };

export default async function DiagramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DiagramClient />;
}
