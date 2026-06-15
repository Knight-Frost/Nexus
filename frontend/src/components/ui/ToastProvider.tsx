import { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ToastContext, type Toast, type ToastContextValue, type ToastTone } from './toast';

const toneStyles: Record<ToastTone, string> = {
  success: 'border-success-500/30 bg-success-50 text-success-600',
  error: 'border-danger-500/30 bg-danger-50 text-danger-600',
  info: 'border-info-500/30 bg-info-50 text-info-600',
};

const icons: Record<ToastTone, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-sm font-medium shadow-lg animate-rise',
              toneStyles[t.tone],
            )}
          >
            <span className="shrink-0">{icons[t.tone]}</span>
            <span className="text-ink-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
