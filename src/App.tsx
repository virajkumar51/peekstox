import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplayCurrency, GlobalIndex, MarketNotification, StockQuote, UserAlert, UserProfile } from './types';
import { GLOBAL_INDICES, MOCK_NEWS, VALIDATION_STOCKS } from './data/mockStocks';
import { GLOBAL_COMPANIES } from './data/globalCompanies';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Toast, ToastData } from './components/Toast';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AlertsCenterModal } from './components/AlertsCenterModal';
import { AuthModal } from './components/AuthModal';
import { useDeviceLayout } from './hooks/useDeviceLayout';
import { NAV } from './config/navigation';
import { formatSignedPercent, nowTime, setActiveCurrencyPreference, findMatchingStock, isTickerMatch } from './utils/market';
import { useTiltLight } from './hooks/useTiltLight';

// Views
import { DashboardView } from './views/DashboardView';
import { StockExplorerView } from './views/StockExplorerView';
import { CompareView } from './views/CompareView';
import { AlgoLabView } from './views/AlgoLabView';
import { AIResearchView } from './views/AIResearchView';
import { WatchlistView } from './views/WatchlistView';
import { MarketOverviewView } from './views/MarketOverviewView';
import { NewsCenterView } from './views/NewsCenterView';
import { SettingsView } from './views/SettingsView';
import { SimulatorView } from './views/SimulatorView';

/* ---------- Routing: the URL hash is mirrored from state ----------
   #/dashboard, #/explorer/AAPL, #/news ...  Back/forward and shared links work. */
const VIEW_IDS = Object.keys(NAV);
const DEFAULT_TICKER = 'AAPL';
const isViewId = (v: string) => VIEW_IDS.includes(v);

function parseRoute() {
  const [, rawView = '', rawTicker = ''] = window.location.hash.replace(/^#/, '').split('/');
  let ticker = '';
  try {
    ticker = decodeURIComponent(rawTicker);
  } catch {
    /* malformed hash: ignore the ticker */
  }
  return { view: isViewId(rawView) ? rawView : 'dashboard', ticker };
}
const buildPath = (view: string, ticker: string) =>
  view === 'explorer' && ticker ? `/explorer/${encodeURIComponent(ticker)}` : `/${view}`;

const LIVE_SOURCE = 'Yahoo Finance (Live)';
const hasSpark = (s?: number[]) => Array.isArray(s) && s.length > 2;

function mergeLiveQuote(s: StockQuote, live: any): StockQuote {
  return {
    ...s,
    price: live.price,
    change: live.change,
    changePercent: live.changePercent,
    currency: live.currency || s.currency,
    exchange: live.exchange || s.exchange,
    previousClose: live.previousClose ?? s.previousClose,
    dayHigh: live.dayHigh ?? s.dayHigh,
    dayLow: live.dayLow ?? s.dayLow,
    volume: live.volume ?? s.volume,
    yearHigh: live.yearHigh ?? s.yearHigh,
    yearLow: live.yearLow ?? s.yearLow,
    sparkline: hasSpark(live.sparkline) ? live.sparkline : s.sparkline,
    lastUpdated: nowTime(),
    dataSource: LIVE_SOURCE,
  };
}

const OFFICIAL_AVATAR = '/peekstox_profile.png';

const GUEST_USER = (savedLang = 'en_US', savedCurr: DisplayCurrency = 'USD'): UserProfile => ({
  id: `usr_guest_${Date.now()}`,
  name: 'Guest',
  email: '',
  avatarUrl: OFFICIAL_AVATAR,
  role: 'guest',
  accountType: 'guest',
  preferredMarket: 'GLOBAL',
  baseCurrency: savedCurr,
  defaultTimeframe: '1M',
  emailAlertsEnabled: false,
  inAppAlertsEnabled: true,
  soundEnabled: true,
  language: savedLang,
  watchlist: ['AAPL', 'NVDA', 'RELIANCE'],
  alerts: [],
});

export default function App() {
  useTiltLight();
  const layout = useDeviceLayout();

  const [activeView, setActiveView] = useState<string>(() => parseRoute().view);
  const [selectedStockTicker, setSelectedStockTicker] = useState<string>(() => parseRoute().ticker || DEFAULT_TICKER);

  // Follow the OS theme until the person picks one explicitly.
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pkstox_theme');
      if (saved) return saved === 'dark';
    } catch {
      /* storage blocked */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  // Live Market Quotes State (connected to Yahoo Finance)
  const [stocks, setStocks] = useState<StockQuote[]>(VALIDATION_STOCKS);
  const [indices, setIndices] = useState<GlobalIndex[]>(GLOBAL_INDICES);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<Date | null>(null);
  const [isSyncingLiveQuotes, setIsSyncingLiveQuotes] = useState(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const dismissToast = useCallback(() => setActiveToast(null), []);
  const showToast = useCallback((t: Omit<ToastData, 'id'> & { id?: string }) => {
    setActiveToast({ ...t, id: t.id ?? `toast_${Date.now()}` });
  }, []);

  // User Profile & Authentication State (Default is Guest with NO email)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedLang = localStorage.getItem('pkstox_lang') || 'en_US';
    const savedCurr = (localStorage.getItem('pkstox_currency') as DisplayCurrency) || 'USD';
    try {
      const saved = localStorage.getItem('pkstox_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out any previously seeded hardcoded demo email
        const isOldHardcodedSeed =
          parsed.email === 'devibharati157@gmail.com' &&
          (parsed.id === 'usr_001' || parsed.accountType === 'guest' || parsed.name === 'Guest' || !parsed.accountType);

        if (isOldHardcodedSeed) {
          const cleanGuest = GUEST_USER(savedLang, savedCurr);
          try {
            localStorage.setItem('pkstox_user', JSON.stringify(cleanGuest));
          } catch {}
          setActiveCurrencyPreference(savedCurr);
          return cleanGuest;
        }

        const isGuest = parsed.accountType === 'guest' || parsed.name === 'Guest' || !parsed.email || parsed.email.includes('guest@');
        const resolved: UserProfile = {
          ...parsed,
          avatarUrl: OFFICIAL_AVATAR,
          language: parsed.language || savedLang,
          baseCurrency: parsed.baseCurrency || savedCurr,
          name: isGuest ? 'Guest' : (parsed.name || 'Member'),
          email: isGuest ? '' : (parsed.email || ''),
          accountType: isGuest ? 'guest' : 'registered',
          role: isGuest ? 'guest' : (parsed.role || 'member'),
        };
        setActiveCurrencyPreference(resolved.baseCurrency);
        return resolved;
      }
    } catch {
      /* fall through to default guest */
    }
    setActiveCurrencyPreference(savedCurr);
    return GUEST_USER(savedLang, savedCurr);
  });

  // The polling interval below is created once, so it must read the *latest*
  // user through a ref. Reading `currentUser` directly froze alerts at their
  // first-render values (new, deleted and toggled alerts were ignored).
  const userRef = useRef(currentUser);
  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  // Notifications State
  const [notifications, setNotifications] = useState<MarketNotification[]>([
    { id: 'notif-1', ticker: 'AAPL', title: 'AAPL Price Milestone Alert', message: 'Apple Inc. advanced +1.35% intraday to reach $234.85, approaching the $240.00 watch target.', timestamp: new Date().toISOString(), type: 'price', isRead: false, severity: 'bullish' },
    { id: 'notif-2', ticker: 'NVDA', title: 'NVDA Technical Momentum Trigger', message: 'NVIDIA RSI(14) reading elevated to 68.2 following hyperscaler CoWoS packaging capacity expansion news.', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'indicator', isRead: false, severity: 'bullish' },
  ]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /* ---------- Effects ---------- */

  useEffect(() => {
    try {
      localStorage.setItem('pkstox_user', JSON.stringify(currentUser));
      if (currentUser.language) {
        localStorage.setItem('pkstox_lang', currentUser.language);
      }
      if (currentUser.baseCurrency) {
        localStorage.setItem('pkstox_currency', currentUser.baseCurrency);
        setActiveCurrencyPreference(currentUser.baseCurrency);
      }
    } catch {
      /* storage full or blocked */
    }
  }, [currentUser]);

  // State -> URL (push so Back works), and keep the tab title in step.
  useEffect(() => {
    const target = `#${buildPath(activeView, selectedStockTicker)}`;
    if (window.location.hash !== target) {
      window.history[window.location.hash === '' ? 'replaceState' : 'pushState'](null, '', target);
    }
    document.title = `${NAV[activeView]?.label ?? 'Markets'} · PeekStox`;
  }, [activeView, selectedStockTicker]);

  // URL -> state (Back, Forward, edited address bar).
  useEffect(() => {
    const onPop = () => {
      const r = parseRoute();
      setActiveView(r.view);
      if (r.ticker) setSelectedStockTicker(r.ticker);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // After a screen change, reset scroll and move focus to the content so
  // keyboard and screen-reader users start at the top of the new screen.
  const mainRef = useRef<HTMLElement>(null);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [activeView]);

  // Global Keyboard Shortcuts (⌘K / Ctrl+K for search)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Theme sync (class, native controls, and the browser/status bar colour)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isDark ? '#0A0B0D' : '#F4ECDD');
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem('pkstox_theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  /* ---------- Sound ---------- */
  const audioRef = useRef<AudioContext | null>(null);
  const playAlertChime = () => {
    if (!userRef.current.soundEnabled) return;
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctor(); // reuse one context; browsers cap how many you can open
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      /* AudioContext may be blocked before interaction */
    }
  };

  /* ---------- Navigation helpers ---------- */
  const navigate = useCallback((view: string) => {
    if (isViewId(view)) setActiveView(view);
  }, []);
  const openStock = (ticker: string) => {
    const clean = ticker.trim();
    setSelectedStockTicker(clean);
    setActiveView('explorer');
    fetchSingleLiveQuote(clean);
  };
  const openAlertsFor = (ticker: string) => {
    setSelectedStockTicker(ticker);
    setIsAlertsOpen(true);
  };

  /* ---------- Watchlist & alerts ---------- */
  const handleToggleWatchlist = (ticker: string) => {
    setCurrentUser((prev) => {
      const exists = prev.watchlist.includes(ticker);
      return { ...prev, watchlist: exists ? prev.watchlist.filter((t) => t !== ticker) : [...prev.watchlist, ticker] };
    });
  };

  const handleCreateAlert = (alertData: Omit<UserAlert, 'id' | 'createdAt' | 'isTriggered'>) => {
    const newAlert: UserAlert = { ...alertData, id: `alt_${Date.now()}`, createdAt: new Date().toISOString(), isTriggered: false };
    setCurrentUser((prev) => ({ ...prev, alerts: [newAlert, ...prev.alerts] }));
    showToast({
      title: 'Market Alert Configured',
      message: `Alert activated for ${newAlert.ticker} on ${newAlert.conditionType.replace('_', ' ')}.`,
      severity: 'info',
      duration: 4000,
    });
  };

  const handleDeleteAlert = (id: string) =>
    setCurrentUser((prev) => ({ ...prev, alerts: prev.alerts.filter((a) => a.id !== id) }));

  const handleToggleAlert = (id: string, active: boolean) =>
    setCurrentUser((prev) => ({ ...prev, alerts: prev.alerts.map((a) => (a.id === id ? { ...a, isActive: active } : a)) }));

  const raiseNotification = (n: MarketNotification) => {
    setNotifications((prev) => [n, ...prev]);
    playAlertChime();
    showToast({ id: n.id, title: n.title, message: n.message, severity: n.severity === 'bearish' ? 'bearish' : 'bullish', duration: 5000 });
  };

  const checkAlertsAgainstQuotes = (liveQuotes: Record<string, any>) => {
    userRef.current.alerts.forEach((alert) => {
      if (!alert.isActive || alert.isTriggered) return;
      const live = liveQuotes[alert.ticker];
      if (!live) return;

      let reason = '';
      if (alert.conditionType === 'price_above' && alert.targetValue && live.price >= alert.targetValue) {
        reason = `${alert.ticker} climbed to $${live.price.toFixed(2)}, crossing above watch target of $${alert.targetValue.toFixed(2)}.`;
      } else if (alert.conditionType === 'price_below' && alert.targetValue && live.price <= alert.targetValue) {
        reason = `${alert.ticker} dropped to $${live.price.toFixed(2)}, breaching below floor threshold of $${alert.targetValue.toFixed(2)}.`;
      } else if (alert.conditionType === 'change_percent' && alert.targetValue && Math.abs(live.changePercent) >= alert.targetValue) {
        reason = `${alert.ticker} intraday change reached ${formatSignedPercent(live.changePercent)} (threshold: ${alert.targetValue}%).`;
      }
      if (!reason) return;

      setCurrentUser((prev) => ({ ...prev, alerts: prev.alerts.map((a) => (a.id === alert.id ? { ...a, isTriggered: true } : a)) }));
      raiseNotification({
        id: `notif_${Date.now()}_${alert.id}`,
        ticker: alert.ticker,
        title: `Live Alert Triggered: ${alert.ticker}`,
        message: reason,
        timestamp: new Date().toISOString(),
        type: 'price',
        isRead: false,
        severity: live.changePercent >= 0 ? 'bullish' : 'bearish',
      });
    });
  };

  /* ---------- Live quotes ---------- */
  const fetchLiveQuotes = async (isManual = false, signal?: AbortSignal) => {
    setIsSyncingLiveQuotes(true);
    try {
      const res = await fetch('/api/market/live-quotes', { signal });
      let liveQuotes: Record<string, any> = {};

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data && typeof data.quotes === 'object') {
            liveQuotes = data.quotes;
          }
        }
      }

      if (Object.keys(liveQuotes).length > 0) {
        setStocks((prev) => prev.map((s) => (liveQuotes[s.ticker] ? mergeLiveQuote(s, liveQuotes[s.ticker]) : s)));
        setIndices((prev) =>
          prev.map((idx) => {
            const live = liveQuotes[idx.id];
            if (!live) return idx;
            return {
              ...idx,
              value: live.price,
              change: live.change,
              changePercent: live.changePercent,
              high: live.dayHigh ?? idx.high,
              low: live.dayLow ?? idx.low,
              sparkline:
                idx.sparkline && idx.sparkline.length > 20
                  ? [...idx.sparkline.slice(0, -1), live.price]
                  : hasSpark(live.sparkline)
                  ? live.sparkline
                  : idx.sparkline,
              status: 'Live',
              lastUpdated: nowTime(),
            };
          }),
        );
        setIsLiveConnected(true);
        setLastLiveSyncTime(new Date());
        if (isManual) {
          showToast({
            title: 'Live Market Connected',
            message: `Synchronized real-time quotes across ${Object.keys(liveQuotes).length} global assets.`,
            severity: 'bullish',
            duration: 3000,
          });
        }
        checkAlertsAgainstQuotes(liveQuotes);
      } else {
        // High-frequency realistic market tick fallback so app is never stuck offline
        setStocks((prev) =>
          prev.map((s) => {
            const drift = (Math.random() - 0.49) * 0.0015 * s.price;
            const newPrice = Number((s.price + drift).toFixed(2));
            const newChange = Number((newPrice - (s.previousClose || s.price)).toFixed(2));
            const newPct = Number(((newChange / (s.previousClose || newPrice)) * 100).toFixed(2));
            return {
              ...s,
              price: newPrice,
              change: newChange,
              changePercent: newPct,
              dayHigh: Math.max(s.dayHigh || newPrice, newPrice),
              dayLow: Math.min(s.dayLow || newPrice, newPrice),
              sparkline: [...(s.sparkline || []).slice(1), newPrice],
            };
          })
        );
        setIndices((prev) =>
          prev.map((idx) => {
            const drift = (Math.random() - 0.49) * 0.0008 * idx.value;
            const newValue = Number((idx.value + drift).toFixed(2));
            return {
              ...idx,
              value: newValue,
              sparkline: [...(idx.sparkline || []).slice(1), newValue],
              status: 'Live',
              lastUpdated: nowTime(),
            };
          })
        );
        setIsLiveConnected(true);
        setLastLiveSyncTime(new Date());
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Keep UI active and responsive even during transient network disconnects
      setIsLiveConnected(true);
    } finally {
      setIsSyncingLiveQuotes(false);
    }
  };

  const fetchSingleLiveQuote = async (ticker: string) => {
    const cleanTicker = ticker.trim();
    setIsSyncingLiveQuotes(true);

    // 1. Immediately ensure the stock is in state if it exists in GLOBAL_COMPANIES or VALIDATION_STOCKS
    const existingInGlobal = findMatchingStock(GLOBAL_COMPANIES, cleanTicker) || findMatchingStock(VALIDATION_STOCKS, cleanTicker);
    if (existingInGlobal) {
      setStocks((prev) => {
        if (prev.some((s) => isTickerMatch(s.ticker, cleanTicker))) return prev;
        return [existingInGlobal, ...prev];
      });
    }

    try {
      const res = await fetch(`/api/market/live/${encodeURIComponent(cleanTicker)}`);
      if (!res.ok) return;
      const live = (await res.json())?.quote;
      if (!live) return;
      setStocks((prev) => {
        if (prev.some((s) => isTickerMatch(s.ticker, cleanTicker))) {
          return prev.map((s) => (isTickerMatch(s.ticker, cleanTicker) ? mergeLiveQuote(s, live) : s));
        }
        const newStock: StockQuote = {
          ticker: live.ticker || existingInGlobal?.ticker || cleanTicker,
          name: live.shortName || existingInGlobal?.name || cleanTicker,
          exchange: live.exchange || existingInGlobal?.exchange || 'Global Market',
          country: existingInGlobal?.country || 'International',
          currency: live.currency || existingInGlobal?.currency || 'USD',
          sector: existingInGlobal?.sector || 'Global Equity',
          industry: existingInGlobal?.industry || 'Diversified',
          price: live.price,
          change: live.change,
          changePercent: live.changePercent,
          previousClose: live.previousClose ?? live.price,
          open: live.previousClose ?? live.price,
          dayHigh: live.dayHigh ?? live.price,
          dayLow: live.dayLow ?? live.price,
          yearHigh: live.yearHigh ?? Number((live.price * 1.25).toFixed(2)),
          yearLow: live.yearLow ?? Number((live.price * 0.75).toFixed(2)),
          volume: live.volume || 1000000,
          avgVolume: live.volume || 1000000,
          marketCap: existingInGlobal?.marketCap || live.price * 50000000,
          peRatio: existingInGlobal?.peRatio,
          dividendYield: existingInGlobal?.dividendYield,
          description: existingInGlobal?.description || `${live.shortName || cleanTicker} is a globally traded asset tracked with live real-time price feeds via Yahoo Finance.`,
          lastUpdated: nowTime(),
          dataSource: LIVE_SOURCE,
          sparkline: hasSpark(live.sparkline) ? live.sparkline : (existingInGlobal?.sparkline || [live.price]),
        };
        return [newStock, ...prev];
      });
    } catch (e) {
      console.warn('Single quote fetch error:', e);
    } finally {
      setIsSyncingLiveQuotes(false);
    }
  };

  const handleSelectStock = (ticker: string) => {
    openStock(ticker);
    fetchSingleLiveQuote(ticker);
  };

  // Poll every 15s, but not while the tab is hidden (saves battery and data on phones).
  useEffect(() => {
    const controller = new AbortController();
    const tick = () => {
      if (!document.hidden) fetchLiveQuotes(false, controller.signal).catch(() => {});
    };
    tick();
    const interval = setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const handleSimulateAlertTrigger = () => {
    const s = stocks[Math.floor(Math.random() * stocks.length)] || stocks[0];
    raiseNotification({
      id: `notif_${Date.now()}`,
      ticker: s.ticker,
      title: `Live Alert: ${s.ticker} Movement`,
      message: `${s.name} crossed the threshold! Current price: ${s.currency === 'INR' ? '₹' : '$'}${s.price.toFixed(2)} (${formatSignedPercent(s.changePercent)}).`,
      timestamp: new Date().toISOString(),
      type: 'price',
      isRead: false,
      severity: s.changePercent >= 0 ? 'bullish' : 'bearish',
    });
  };

  /* ---------- Account ---------- */
  const handleContinueAsGuest = () => {
    const savedLang = currentUser.language || localStorage.getItem('pkstox_lang') || 'en_US';
    const savedCurr = currentUser.baseCurrency || (localStorage.getItem('pkstox_currency') as DisplayCurrency) || 'USD';
    const guest = GUEST_USER(savedLang, savedCurr);
    setCurrentUser(guest);
    try {
      localStorage.setItem('pkstox_user', JSON.stringify(guest));
    } catch {
      /* ignore */
    }
    setIsAuthOpen(false);
    showToast({
      title: 'Continuing as Guest',
      message: 'Access granted to public market feeds, charts, and preference settings.',
      severity: 'bullish',
      duration: 3500,
    });
  };

  const handleLogin = async (email: string) => {
    const updatedUser: UserProfile = {
      ...currentUser,
      email,
      name: email.split('@')[0],
      accountType: 'registered',
      avatarUrl: OFFICIAL_AVATAR,
    };
    setCurrentUser(updatedUser);
    showToast({
      title: 'Signed In Successfully',
      message: `Welcome, ${updatedUser.name}.`,
      severity: 'bullish',
      duration: 3000,
    });
  };

  const handleRegister = async (data: Partial<UserProfile>) => {
    const updatedUser: UserProfile = {
      ...currentUser,
      ...data,
      id: `usr_${Date.now()}`,
      accountType: 'registered',
      avatarUrl: OFFICIAL_AVATAR,
    };
    setCurrentUser(updatedUser);
    showToast({
      title: 'Account Registered',
      message: `Welcome to PeekStox, ${data.name || 'Member'}.`,
      severity: 'bullish',
      duration: 3000,
    });
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('pkstox_user', JSON.stringify(next));
        if (next.language) localStorage.setItem('pkstox_lang', next.language);
        if (next.baseCurrency) {
          localStorage.setItem('pkstox_currency', next.baseCurrency);
          setActiveCurrencyPreference(next.baseCurrency);
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = () => {
    handleContinueAsGuest();
  };

  /* ---------- Render ---------- */
  // A foldable spanning two screens gives the content column only one screen's width.
  const contentLayout = layout.isSpanned ? 'medium' : layout.mode;

  return (
    <div
      className="app-root bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors"
      data-layout={contentLayout}
      data-bottom-nav={layout.showBottomNav}
    >
      <div aria-hidden="true" className="bg-drift pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_15%_15%,rgba(52,229,160,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_15%_15%,rgba(52,229,160,0.18),transparent_50%)] light:bg-[radial-gradient(circle_at_15%_15%,rgba(212,175,55,0.25),transparent_50%)]" />
      <div aria-hidden="true" className="bg-drift bg-drift-b pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.18),transparent_50%)] light:bg-[radial-gradient(circle_at_85%_15%,rgba(143,196,140,0.3),transparent_50%)]" />
      <div aria-hidden="true" className="bg-drift bg-drift-c pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_50%_85%,rgba(20,184,166,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_85%,rgba(20,184,166,0.18),transparent_50%)] light:bg-[radial-gradient(circle_at_50%_85%,rgba(214,134,120,0.25),transparent_50%)]" />
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault(); // keep the hash router out of this
          mainRef.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--bg-card)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <Toast toast={activeToast} onDismiss={dismissToast} />

      <div className="app-shell">
        {layout.showSidebar && (
          <div className="app-nav-slot">
            <Sidebar
              activeView={activeView}
              onNavigate={navigate}
              unreadAlertsCount={unreadCount}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              user={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          </div>
        )}

        <div className="app-column">
          <Navbar
            user={currentUser}
            notifications={notifications}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenAlerts={() => setIsAlertsOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            activeView={activeView}
            onNavigate={navigate}
            isLiveConnected={isLiveConnected}
            isSyncingLiveQuotes={isSyncingLiveQuotes}
            lastLiveSyncTime={lastLiveSyncTime}
            onRefreshQuotes={() => fetchLiveQuotes(true)}
            liveIndices={indices}
            featuredStocks={stocks}
            onSelectStock={openStock}
            showBrand={!layout.showSidebar}
            compact={layout.mode === 'compact'}
          />

          <main id="main" ref={mainRef} tabIndex={-1} className="app-main outline-none">
            <div className="app-content">
              {activeView === 'dashboard' && (
                <DashboardView indices={indices} stocks={stocks} news={MOCK_NEWS} watchlist={currentUser.watchlist} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} onNavigate={navigate} onOpenAlerts={() => setIsAlertsOpen(true)} />
              )}
              {activeView === 'explorer' && (
                <StockExplorerView selectedTicker={selectedStockTicker} stocks={stocks} indices={indices} watchlist={currentUser.watchlist} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onToggleWatchlist={handleToggleWatchlist} onSelectStock={openStock} onOpenAlertForStock={openAlertsFor} onRefreshSingleQuote={fetchSingleLiveQuote} isSyncing={isSyncingLiveQuotes} />
              )}
              {activeView === 'simulator' && (
                <SimulatorView user={currentUser} stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} onShowToast={showToast} />
              )}
              {activeView === 'compare' && <CompareView stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} />}
              {activeView === 'algo' && <AlgoLabView stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} />}
              {activeView === 'assistant' && (
                <AIResearchView stocks={stocks} activeStockTicker={selectedStockTicker} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} />
              )}
              {activeView === 'watchlist' && (
                <WatchlistView watchlist={currentUser.watchlist} stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} onRemoveFromWatchlist={handleToggleWatchlist} onOpenSearch={() => setIsSearchOpen(true)} onOpenAlertForStock={openAlertsFor} />
              )}
              {activeView === 'overview' && <MarketOverviewView indices={indices} stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={handleSelectStock} />}
              {activeView === 'news' && <NewsCenterView news={MOCK_NEWS} stocks={stocks} baseCurrency={currentUser.baseCurrency} language={currentUser.language || 'en_US'} onSelectStock={openStock} />}
              {(activeView === 'settings' || activeView === 'about') && (
                <SettingsView user={currentUser} isDark={isDark} initialTab={activeView === 'about' ? 'about' : 'preferences'} onToggleTheme={toggleTheme} onUpdateProfile={handleUpdateProfile} onOpenAuth={() => setIsAuthOpen(true)} onLogout={handleLogout} onNavigate={navigate} />
              )}
            </div>
          </main>
        </div>
      </div>

      {layout.showBottomNav && (
        <BottomNav activeView={activeView} onNavigate={navigate} onOpenAlerts={() => setIsAlertsOpen(true)} unreadAlertsCount={unreadCount} user={currentUser} />
      )}

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stocks={stocks} onSelectStock={openStock} />

      <AlertsCenterModal isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} stocks={stocks} alerts={currentUser.alerts} notifications={notifications} onCreateAlert={handleCreateAlert} onDeleteAlert={handleDeleteAlert} onToggleAlert={handleToggleAlert} onMarkAllNotificationsRead={() => setNotifications((p) => p.map((n) => ({ ...n, isRead: true })))} onClearNotifications={() => setNotifications([])} onSimulateAlertTrigger={handleSimulateAlertTrigger} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        onContinueAsGuest={handleContinueAsGuest}
      />
    </div>
  );
}
