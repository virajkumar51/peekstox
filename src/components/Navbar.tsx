import { Bell, Moon, RefreshCw, Search, Sun } from 'lucide-react';
import type { GlobalIndex, MarketNotification, StockQuote, UserProfile } from '../types';
import { NAV } from '../config/navigation';
import { PeekStoxMark } from './PeekStoxLogo';
import { Change } from './ui';
import { formatLevel, formatPrice } from '../utils/market';
import { t } from '../utils/i18n';

interface NavbarProps {
  user: UserProfile;
  notifications: MarketNotification[];
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
  isLiveConnected: boolean;
  isSyncingLiveQuotes: boolean;
  lastLiveSyncTime: Date | null;
  onRefreshQuotes: () => void;
  liveIndices: GlobalIndex[];
  featuredStocks: StockQuote[];
  onSelectStock: (ticker: string) => void;
  /** Show the brand mark here (phones, tablets). On laptops the sidebar carries it. */
  showBrand: boolean;
  /** Phones get a lighter header: no price strip, no theme button. */
  compact: boolean;
}

const indexName = (i: GlobalIndex) => (i as { name?: string }).name ?? i.id;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const iconBtn = 'touch-target relative shrink-0 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

export function Navbar(p: NavbarProps) {
  const lang = p.user.language || 'en_US';
  const unread = p.notifications.filter((n) => !n.isRead).length;
  const title = t(p.activeView, lang) || NAV[p.activeView]?.label || 'Markets';
  const initials = (p.user.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const syncTitle = p.lastLiveSyncTime ? `Last synced ${p.lastLiveSyncTime.toLocaleTimeString()}` : 'Not synced yet';

  return (
    <header className="app-header">
      <div className="flex min-h-14 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {p.showBrand && <span className="max-[379px]:hidden"><PeekStoxMark size={32} /></span>}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[var(--text-primary)] sm:flex-none sm:text-xl">{title}</h1>

        {/* Tablet and laptop: search field. Phone: icon button below. */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <button
            type="button"
            onClick={p.onOpenSearch}
            className="mx-auto flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 tone-up" />
            <span className="flex-1 truncate text-left">{t('searchPlaceholder', lang)}</span>
            <kbd className="kbd-hint rounded-md border border-[var(--border-color)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
        </div>
        <button type="button" onClick={p.onOpenSearch} aria-label="Search" className={`${iconBtn} sm:hidden`}>
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={p.onRefreshQuotes}
          title={syncTitle}
          aria-label={`${p.isLiveConnected ? 'Live data connected' : 'Live data offline'}. Refresh quotes`}
          className="live-chip inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${p.isLiveConnected ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} />
          <span>{p.isLiveConnected ? 'Live' : 'Offline'}</span>
          <RefreshCw aria-hidden="true" className={`hidden h-3.5 w-3.5 sm:block ${p.isSyncingLiveQuotes ? 'motion-safe:animate-spin' : ''}`} />
        </button>

        <button type="button" onClick={p.onOpenAlerts} aria-label={unread ? `Alerts, ${unread} unread` : 'Alerts'} className={iconBtn}>
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unread > 0 && (
            <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--positive)] px-1 text-xs font-bold text-[#07130e]">{unread}</span>
          )}
        </button>

        {!p.compact && (
          <button type="button" onClick={p.onToggleTheme} aria-label={p.isDark ? 'Switch to light theme' : 'Switch to dark theme'} className={iconBtn}>
            {p.isDark ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
          </button>
        )}

        {p.showBrand && (
          <button
            type="button"
            onClick={p.onOpenAuth}
            aria-label={`Account: ${p.user.name}`}
            className="touch-target shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 shadow-sm"
          >
            <img
              src={p.user.avatarUrl || '/peekstox_profile.png'}
              alt={p.user.name}
              className="h-9 w-9 rounded-xl object-cover"
            />
          </button>
        )}
      </div>

      {!p.compact && (
        <div className="border-t border-[var(--border-color)] px-3 sm:px-6" role="region" aria-label="Live prices">
          <ul className="hscroll items-center gap-6 py-2 text-sm">
            {p.liveIndices.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-semibold text-[var(--text-primary)]">{indexName(i)}</span>
                <span className="tabular-nums text-[var(--text-secondary)]">{formatLevel(i.value)}</span>
                <Change value={i.changePercent} />
              </li>
            ))}
            {p.featuredStocks.slice(0, 8).map((s) => (
              <li key={s.ticker} className="whitespace-nowrap">
                <button type="button" onClick={() => p.onSelectStock(s.ticker)} className="flex items-center gap-2 rounded-md hover:opacity-80">
                  <span className="font-semibold text-[var(--text-primary)]">{s.ticker}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{formatPrice(s.price, s.currency, p.user.baseCurrency)}</span>
                  <Change value={s.changePercent} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
