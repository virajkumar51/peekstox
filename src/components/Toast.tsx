import { useEffect, useState } from 'react';
import { Bell, TrendingDown, TrendingUp, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  severity: 'bullish' | 'bearish' | 'info';
  /** ms before auto-dismiss. Pauses while hovered or focused. */
  duration?: number;
}

const STYLE = {
  bullish: { border: 'border-emerald-500/40', tone: 'tone-up', Icon: TrendingUp, label: 'Bullish alert' },
  bearish: { border: 'border-rose-500/40', tone: 'tone-down', Icon: TrendingDown, label: 'Bearish alert' },
  info: { border: 'border-sky-500/40', tone: 'tone-info', Icon: Bell, label: 'Notice' },
} as const;

export function Toast({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const id = toast?.id;
  const duration = toast?.duration ?? 5000;

  // One timer per toast id: a newer toast replaces the old timer, so an old
  // timeout can never dismiss a fresh toast early.
  useEffect(() => {
    if (!id || paused) return;
    const t = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(t);
  }, [id, paused, duration, onDismiss]);

  useEffect(() => setPaused(false), [id]);

  const s = toast ? STYLE[toast.severity] : null;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && s && (
        <div
          key={toast.id}
          className={`rounded-2xl border ${s.border} glass p-4`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={(e) => e.key === 'Escape' && onDismiss()}
        >
          <div className="flex items-start gap-3">
            <div className={`tone-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
              <s.Icon aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                <span className="sr-only">{s.label}: </span>
                {toast.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">{toast.message}</p>
            </div>
            <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="touch-target -mr-1 -mt-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
