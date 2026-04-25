import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProfileEditor } from "./client";

export default async function SettingsPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; name?: string; email?: string; image?: string } | undefined;
  const userId = sessionUser?.id;

  const dbUser = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true, about: true } })
    : null;

  const profile = {
    name:  dbUser?.name  ?? sessionUser?.name  ?? null,
    email: dbUser?.email ?? sessionUser?.email ?? null,
    image: dbUser?.image ?? sessionUser?.image ?? null,
    about: dbUser?.about ?? null,
  };

  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
          <Settings size={16} className="text-brand" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Settings</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-8 pl-12">Manage your account and preferences.</p>

      <ProfileEditor initial={profile} />

      {/* Quick links */}
      <div className="glass rounded-2xl p-6 mb-5">
        <p className="font-mono text-[10px] text-ink-dim uppercase tracking-widest mb-3">Quick links</p>
        <div className="space-y-2">
          {[
            { label: "Manage API Keys", href: "/dashboard/apikeys", desc: "Create and revoke agent authentication keys" },
            { label: "Connected Repos", href: "/dashboard/repos",   desc: "View and manage your GitHub repositories" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border hover:border-border-light hover:bg-surface-raised transition-all group">
              <div className="flex-1">
                <p className="font-body text-sm font-medium text-ink group-hover:text-brand transition-colors">{l.label}</p>
                <p className="font-body text-xs text-ink-muted">{l.desc}</p>
              </div>
              <ArrowRight size={14} className="text-ink-dim group-hover:text-brand transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* CLI config */}
      <div className="glass rounded-2xl p-6">
        <p className="font-mono text-[10px] text-ink-dim uppercase tracking-widest mb-3">CLI configuration</p>
        <p className="font-body text-sm text-ink-muted mb-3">The CLI reads config from <code className="font-mono text-brand text-xs">~/.codemind/config.yaml</code>.</p>
        <div className="bg-[#05050B] rounded-xl p-3 font-mono text-xs border border-border text-ink-muted leading-relaxed">
          <div className="text-ink-dim mb-1"># ~/.codemind/config.yaml</div>
          <div>anthropic_api_key: sk-ant-…</div>
          <div>default_language: typescript</div>
        </div>
      </div>
    </div>
  );
}
