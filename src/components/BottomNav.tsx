import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart2, Bell, Bookmark, CandlestickChart, Cpu, GitCompare, Globe, Home, Info, MoreHorizontal, Newspaper, Settings, Sparkles } from 'lucide-react';
import { t } from '../utils/i18n';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenAlerts?: () => void;
  unreadAlertsCount?: number;
  user?: any;
  language?: string;
}

interface Dest {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Dest[] = [
  { id: 'dashboard', label: 'Markets', icon: Home },
  { id: 'explorer', label: 'Explorer', icon: BarChart2 },
  { id: 'simulator', label: 'Simulator', icon: CandlestickChart },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
];
const MORE: Dest[] = [
  { id: 'assistant', label: 'PeekStox AI', icon: Sparkles },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'algo', label: 'Quantitative Lab', icon: Cpu },
  { id: 'overview', label: 'Global Overview', icon: Globe },
  { id: 'news', label: 'Financial News', icon: Newspaper },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About Us', icon: Info },
];

/** Floating liquid-glass dock. One glass "lens" slides between tabs (overshoots, stretches while
 *  it travels) and carries its own highlight. It also slides to "More" while the sheet is open. */
export const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate, onOpenAlerts, unreadAlertsCount = 0, language, user }) => {
  const lang = language || user?.language || 'en_US';
  const [open, setOpen] = useState(false);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const moreActive = MORE.some((m) => m.id === activeView);

  const getLabel = (id: string, defaultLabel: string) => {
    switch (id) {
      case 'dashboard': return t('markets', lang);
      case 'explorer': return t('explorer', lang);
      case 'simulator': return t('simulator', lang);
      case 'watchlist': return t('watchlist', lang);
      case 'assistant': return t('peekstoxAi', lang);
      case 'compare': return t('compare', lang);
      case 'algo': return t('algoLab', lang);
      case 'overview': return t('overview', lang);
      case 'news': return t('newsCenter', lang);
      case 'settings': return t('settings', lang);
      case 'about': return t('about', lang);
      default: return defaultLabel;
    }
  };

  // Which slot the lens sits on: the active tab, or "More" (index 4) when a More screen is active or the sheet is open.
  const tabIndex = TABS.findIndex((t) => t.id === activeView);
  const highlight = open ? TABS.length : tabIndex >= 0 ? tabIndex : moreActive ? TABS.length : -1;

  const [lens, setLens] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);   // false on first paint so the lens does not slide in from the left
  const [moving, setMoving] = useState(false); // true for ~0.55s after a change, drives the stretch keyframe
  const prev = useRef(highlight);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || highlight < 0) {
      setLens(null);
      return;
    }
    const measure = () => {
      const tab = track.querySelectorAll<HTMLElement>('.dock-tab')[highlight];
      if (!tab) return;
      const t = track.getBoundingClientRect();
      const r = tab.getBoundingClientRect();
      setLens({ x: r.left - t.left, w: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure); // rotation, unfolding, font load, window resize
    ro.observe(track);
    return () => ro.disconnect();
  }, [highlight]);

  useEffect(() => {
    if (!lens || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [lens, ready]);

  useEffect(() => {
    if (prev.current !== highlight && prev.current >= 0 && highlight >= 0) {
      setMoving(true);
      const t = window.setTimeout(() => setMoving(false), 560);
      prev.current = highlight;
      return () => window.clearTimeout(t);
    }
    prev.current = highlight;
  }, [highlight]);

  const close = () => {
    setOpen(false);
    moreBtn.current?.focus();
  };

  // Escape closes the sheet, Tab stays inside it, focus moves into it on open.
  useEffect(() => {
    if (!open) return;
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab' || !sheet.current) return;
      const items = Array.from(sheet.current.querySelectorAll<HTMLElement>('a[href], button'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (e: React.MouseEvent, id: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigate(id);
    setOpen(false);
  };

  return (
    <>
      {open && (
        <>
          <button type="button" className="sheet-backdrop" aria-label="Close menu" tabIndex={-1} onClick={close} />
          <div ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" aria-label="More destinations" className="sheet">
            <div className="sheet-grip" aria-hidden="true" />
            <ul className="grid gap-1">
              {MORE.map((m) => (
                <li key={m.id}>
                  <a href={`#/${m.id}`} aria-current={activeView === m.id ? 'page' : undefined} onClick={(e) => go(e, m.id)} className="sheet-item">
                    <m.icon aria-hidden="true" className="h-5 w-5" />
                    {getLabel(m.id, m.label)}
                  </a>
                </li>
              ))}
              {onOpenAlerts && (
                <li>
                  <button type="button" className="sheet-item" onClick={() => { setOpen(false); onOpenAlerts(); }}>
                    <Bell aria-hidden="true" className="h-5 w-5" />
                    <span className="flex-1">{t('marketAlerts', lang)}</span>
                    {unreadAlertsCount > 0 && <span className="tone-chip rounded-full px-2 text-xs font-bold">{unreadAlertsCount}<span className="sr-only"> unread</span></span>}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      <nav aria-label="Primary" className="dock spatial-layer sd-4">
        <div ref={trackRef} className="dock-track" style={lens ? ({ '--lens-x': `${lens.x}px`, '--lens-w': `${lens.w}px` } as React.CSSProperties) : undefined}>
          {lens && <span aria-hidden="true" className="dock-lens" data-ready={ready ? 'true' : undefined} data-moving={moving ? 'true' : undefined} />}
          <ul>
            {TABS.map((t) => (
              <li key={t.id}>
                <a href={`#/${t.id}`} aria-current={activeView === t.id ? 'page' : undefined} onClick={(e) => go(e, t.id)} className="dock-tab">
                  <t.icon aria-hidden="true" className="h-[22px] w-[22px]" />
                  {getLabel(t.id, t.label)}
                </a>
              </li>
            ))}
            <li>
              <button
                ref={moreBtn}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-current={moreActive ? 'page' : undefined}
                onClick={() => setOpen(true)}
                className="dock-tab"
              >
                <MoreHorizontal aria-hidden="true" className="h-[22px] w-[22px]" />
                {t('more', lang)}
                {unreadAlertsCount > 0 && (
                  <span className="bottom-badge">
                    <span aria-hidden="true">{unreadAlertsCount}</span>
                    <span className="sr-only">{unreadAlertsCount} unread alerts</span>
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};
