"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType };
type ToastCtx = { toast: (message: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ toast: () => {} });

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
const STYLES = {
  success: "bg-neon/10 border-neon/25 text-neon",
  error:   "bg-heat/10 border-heat/25 text-heat",
  info:    "bg-brand/10 border-brand/25 text-brand",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4000));
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl font-body text-sm pointer-events-auto ${STYLES[t.type]}`}
              style={{ animation: "slideInRight 0.2s ease-out" }}>
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity ml-1"><X size={12} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
