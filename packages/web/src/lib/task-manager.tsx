"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, X, ExternalLink, Loader2 } from "lucide-react";

type TaskStatus = "running" | "done" | "error";

type Notif = {
  id: string;
  label: string;
  href: string;
  status: TaskStatus;
  errorMsg?: string;
};

type TaskCtx = {
  runTask: <T>(label: string, href: string, fn: () => Promise<T>) => Promise<T>;
  getResult: (href: string) => unknown;
};

const Ctx = createContext<TaskCtx>({
  runTask: async (_l, _h, fn) => fn(),
  getResult: () => undefined,
});

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const results = useRef<Map<string, unknown>>(new Map());
  const router = useRouter();

  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const runTask = useCallback(async <T,>(label: string, href: string, fn: () => Promise<T>): Promise<T> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNotifs(prev => [...prev.slice(-3), { id, label, href, status: "running" }]);
    try {
      const result = await fn();
      results.current.set(href, result);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, status: "done" } : n));
      setTimeout(() => dismiss(id), 8000);
      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Task failed";
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, status: "error", errorMsg } : n));
      setTimeout(() => dismiss(id), 5000);
      throw e;
    }
  }, [dismiss]);

  const getResult = useCallback((href: string) => results.current.get(href), []);

  return (
    <Ctx.Provider value={{ runTask, getResult }}>
      {children}
      <div className="fixed top-5 right-5 z-[60] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
        {notifs.map(n => (
          <div key={n.id}
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] border shadow-2xl pointer-events-auto"
            style={{
              background: "var(--bg-glass)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderColor: n.status === "done" ? "rgba(57,255,130,0.3)" : n.status === "error" ? "rgba(255,58,94,0.3)" : "var(--border-subtle)",
              animation: "slideInRight 0.25s ease-out",
            }}>
            {n.status === "running" && <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "var(--accent)" }} />}
            {n.status === "done"    && <CheckCircle size={14} className="flex-shrink-0" style={{ color: "#39FF82" }} />}
            {n.status === "error"   && <AlertCircle size={14} className="flex-shrink-0" style={{ color: "#FF3A5E" }} />}
            <span className="flex-1 leading-snug" style={{ color: "var(--ink-primary)", fontSize: "13px", fontFamily: "inherit" }}>
              {n.status === "running" && `${n.label} running…`}
              {n.status === "done"    && `${n.label} complete`}
              {n.status === "error"   && (n.errorMsg ?? `${n.label} failed`)}
            </span>
            {n.status === "done" && (
              <button onClick={() => { router.push(n.href); dismiss(n.id); }}
                className="flex items-center gap-1 flex-shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: "var(--accent)", fontSize: "12px", fontFamily: "monospace" }}>
                View <ExternalLink size={10} />
              </button>
            )}
            <button onClick={() => dismiss(n.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1">
              <X size={12} style={{ color: "var(--ink-tertiary)" }} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useTask = () => useContext(Ctx);
