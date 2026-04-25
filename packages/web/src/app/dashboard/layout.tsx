import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ToastProvider } from "@/lib/toast";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[--bg]">
        <Sidebar user={session.user} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
