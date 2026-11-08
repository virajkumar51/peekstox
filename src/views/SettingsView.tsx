import React, { useState } from 'react';
import {
  UserProfile,
  MarketRegion,
  DisplayCurrency,
  ChartTimeframe,
} from '../types';
import {
  Settings,
  Sun,
  Moon,
  Globe,
  DollarSign,
  Bell,
  Volume2,
  ShieldAlert,
  Info,
  Check,
  User,
  Heart,
  LogOut,
  LogIn,
  UserPlus,
  Languages,
  Cpu,
  Layers,
  Sparkles,
  Activity,
  Code,
  ShieldCheck,
  Database,
  LineChart,
  ExternalLink,
} from 'lucide-react';
import { SpatialSettings } from '../components/SpatialSettings';

interface SettingsViewProps {
  user: UserProfile;
  isDark: boolean;
  initialTab?: 'preferences' | 'about';
  onToggleTheme: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  isDark,
  initialTab = 'preferences',
  onToggleTheme,
  onUpdateProfile,
  onOpenAuth,
  onLogout,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'about'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Settings State
  const [preferredMarket, setPreferredMarket] = useState<MarketRegion>(user.preferredMarket || 'GLOBAL');
  const [baseCurrency, setBaseCurrency] = useState<DisplayCurrency>(user.baseCurrency || 'USD');
  const [language, setLanguage] = useState<string>(user.language || 'en_US');
  const [defaultTimeframe, setDefaultTimeframe] = useState<ChartTimeframe>(user.defaultTimeframe || '1M');
  const [inAppAlerts, setInAppAlerts] = useState(user.inAppAlertsEnabled ?? true);
  const [soundEnabled, setSoundEnabled] = useState(user.soundEnabled ?? true);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (user.preferredMarket) setPreferredMarket(user.preferredMarket);
    if (user.baseCurrency) setBaseCurrency(user.baseCurrency);
    if (user.language) setLanguage(user.language);
    if (user.defaultTimeframe) setDefaultTimeframe(user.defaultTimeframe);
    if (user.inAppAlertsEnabled !== undefined) setInAppAlerts(user.inAppAlertsEnabled);
    if (user.soundEnabled !== undefined) setSoundEnabled(user.soundEnabled);
  }, [user]);

  // Test sound player
  const handleTestChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // AudioContext may be blocked before interaction
    }
  };

  const handleSave = async () => {
    await onUpdateProfile({
      preferredMarket,
      baseCurrency,
      language,
      defaultTimeframe,
      inAppAlertsEnabled: inAppAlerts,
      soundEnabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isGuest = user.accountType === 'guest' || !user.email || user.name === 'Guest' || user.email.includes('guest@') || user.id.includes('guest');

  const languagesList = [
    { code: 'en_US', name: 'English (US)', flag: '🇺🇸', region: 'Americas' },
    { code: 'en_GB', name: 'English (UK)', flag: '🇬🇧', region: 'Europe' },
    { code: 'es_ES', name: 'Español (Spanish)', flag: '🇪🇸', region: 'Europe & LatAm' },
    { code: 'fr_FR', name: 'Français (French)', flag: '🇫🇷', region: 'Europe' },
    { code: 'de_DE', name: 'Deutsch (German)', flag: '🇩🇪', region: 'Europe' },
    { code: 'hi_IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳', region: 'India / Asia' },
    { code: 'ja_JP', name: '日本語 (Japanese)', flag: '🇯🇵', region: 'Asia-Pacific' },
    { code: 'zh_CN', name: '中文 (Mandarin)', flag: '🇨🇳', region: 'Asia-Pacific' },
  ];

  const currenciesList: Array<{ code: DisplayCurrency; symbol: string; name: string; region: string; rate: string }> = [
    { code: 'USD', symbol: '$', name: 'US Dollar', region: 'United States', rate: '1.00 USD' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', region: 'India (NSE / BSE)', rate: '86.85 INR' },
    { code: 'EUR', symbol: '€', name: 'Euro', region: 'European Union', rate: '0.92 EUR' },
    { code: 'GBP', symbol: '£', name: 'British Pound', region: 'United Kingdom (LSE)', rate: '0.79 GBP' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', region: 'Japan (Tokyo / Nikkei)', rate: '154.50 JPY' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', region: 'Canada (TSX)', rate: '1.40 CAD' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', region: 'Australia (ASX)', rate: '1.55 AUD' },
    { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc', region: 'Switzerland (SIX)', rate: '0.89 CHF' },
  ];

  return (
    <div className="space-y-6 pb-28 sm:pb-32 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header with Segmented Navigation Tab Control */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              {activeTab === 'preferences' ? <Settings className="h-5 w-5" /> : <Info className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {activeTab === 'preferences' ? 'Account & Preferences' : 'About PeekStox Intelligence'}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {activeTab === 'preferences'
                  ? 'Manage your profile, interface language, base display currency, and session settings'
                  : 'Architecture, engineering stack, live market data feeds, and founder attribution'}
              </p>
            </div>
          </div>
        </div>

        {/* Dual Tab Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] max-w-md">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'preferences'
                ? 'bg-emerald-500 text-black shadow-sm font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Account & Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'about'
                ? 'bg-emerald-500 text-black shadow-sm font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>About Us & Architecture</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          TAB 1: PREFERENCES & ACCOUNT
          ============================================================== */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* User Account & Credentials Card */}
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Account Profile</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Official profile picture, active account tier, and session credentials.
                </p>
              </div>

              {/* Account Type Indicator Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Account Type:</span>
                <span className={`rounded-xl border px-3 py-1 text-xs font-bold flex items-center gap-1.5 ${
                  isGuest
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}>
                  {isGuest ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Guest Account
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Registered Account
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-5 shadow-inner">
              <div className="flex items-center gap-4 min-w-0">
                {/* Official Profile Picture inside rounded-square profile avatar */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-black shadow-md">
                  <img
                    src={user.avatarUrl || '/peekstox_profile.png'}
                    alt={user.name}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                      {isGuest ? 'Guest' : user.name}
                    </h3>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                      {isGuest ? 'Public Mode' : 'Verified'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {isGuest ? 'Public Guest Session (No email linked)' : user.email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1.5">
                    <span className="font-semibold text-[var(--text-primary)]">{isGuest ? 'Guest Tier' : 'Executive Researcher'}</span>
                    <span>·</span>
                    <span>{user.watchlist?.length || 0} Watchlist Assets</span>
                    <span>·</span>
                    <span>{user.alerts?.length || 0} Active Alerts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Sign in / Register / Sign out */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-sm active:scale-98"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isGuest ? 'Sign In / Register' : 'Switch / Edit Account'}</span>
                </button>

                {!isGuest && onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sign out and continue as Guest"
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors active:scale-98"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clear explanation of Guest vs Registered Account */}
            <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {isGuest ? 'Guest Mode Information' : 'Registered Account Privileges'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {isGuest ? 'Public Features Available' : 'Cloud Sync Active'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {isGuest
                  ? 'You are currently using PeekStox with a Guest Account. You have complete access to live streaming market quotes, SVG quantitative charts, indicator analysis, and custom display currency and language preferences. Your preferences and watchlists are saved locally on this browser. Registered accounts add multi-device cloud synchronization and persistent email/SMS catalyst alerts.'
                  : 'Your account is fully registered and verified. Custom watchlist items, technical threshold alerts, chart annotations, and quantitative preference settings are synchronized securely across all your research devices.'}
              </p>
            </div>
          </div>

          {/* Theme, Currency & Language Preferences */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm space-y-6">
            {/* 1. Dark / Light Theme Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Interface Theme</h2>
                <span className="text-xs font-semibold text-emerald-400">
                  {isDark ? 'Dark Charcoal Mode Active' : 'Light Porcelain Mode Active'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Switch between the signature institutional dark theme and the high-contrast light porcelain theme.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!isDark) onToggleTheme();
                  }}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                    isDark
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Moon className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-bold text-[var(--text-primary)]">Dark Charcoal (Default)</p>
                      <p className="text-[11px] text-[var(--text-muted)]">OLED deep slate with emerald neon glow</p>
                    </div>
                  </div>
                  {isDark && <Check className="h-4 w-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    if (isDark) onToggleTheme();
                  }}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                    !isDark
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-bold text-[var(--text-primary)]">Apple Light Porcelain</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Clean white canvas with crisp emerald accents</p>
                    </div>
                  </div>
                  {!isDark && <Check className="h-4 w-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Spatial Motion Depth Toggle */}
            <div className="border-t border-[var(--border-color)] pt-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Spatial Motion & Depth</h2>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Enable Apple-style device tilt parallax and responsive depth layers.
              </p>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-2">
                <SpatialSettings />
              </div>
            </div>

            {/* 2. Valuation Currency Switcher */}
            <div className="border-t border-[var(--border-color)] pt-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Preferred Display Currency</h2>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                  Selected: {baseCurrency} ({currenciesList.find((c) => c.code === baseCurrency)?.symbol})
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Select your preferred monetary display currency. PeekStox recalculates display values throughout the platform using institutional exchange rates while clearly indicating original market prices. Underlying securities and quantitative math remain unaltered.
              </p>

              {/* Up-to-date Institutional Exchange Rate Strip */}
              <div className="mb-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-2.5 text-[11px] text-[var(--text-secondary)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold text-emerald-400">Institutional Reference Rates (USD Base):</span>
                  <span className="tabular-nums">1 USD = ₹86.85 INR</span>
                  <span className="tabular-nums">€0.92 EUR</span>
                  <span className="tabular-nums">£0.79 GBP</span>
                  <span className="tabular-nums">¥154.50 JPY</span>
                  <span className="tabular-nums">C$1.40 CAD</span>
                  <span className="tabular-nums">A$1.55 AUD</span>
                  <span className="tabular-nums">CHF 0.89 CHF</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {currenciesList.map((cur) => {
                  const isSelected = baseCurrency === cur.code;
                  return (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={async () => {
                        setBaseCurrency(cur.code);
                        await onUpdateProfile({ baseCurrency: cur.code });
                      }}
                      className={`flex flex-col items-start p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{cur.code}</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">{cur.symbol}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate w-full text-left">{cur.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-left mt-0.5">{cur.region}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Language Selector */}
            <div className="border-t border-[var(--border-color)] pt-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-purple-400" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Interface Language</h2>
                </div>
                <span className="text-xs font-semibold text-purple-300">
                  {languagesList.find((l) => l.code === language)?.name || 'English (US)'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Choose your preferred interface language. Navigation labels, controls, and section headers update immediately. Stock names, company names, and ticker symbols remain standard financial identifiers.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {languagesList.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={async () => {
                        setLanguage(lang.code);
                        await onUpdateProfile({ language: lang.code });
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-sm ring-1 ring-purple-500/30'
                          : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-semibold truncate">{lang.name}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Preferred Market Universe */}
            <div className="border-t border-[var(--border-color)] pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-sky-400" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Primary Market Universe</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Default market feed universe loaded upon launching PeekStox.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'GLOBAL', label: 'Global Unified (US & NSE/BSE)', desc: 'Full cross-market validation dataset' },
                  { id: 'US', label: 'US Equities (NYSE, NASDAQ)', desc: 'S&P 500, Magnificent 7, mega-cap tech' },
                  { id: 'IN', label: 'Indian Equities (NSE, BSE)', desc: 'NIFTY 50, Sensex, Reliance, Tata, HDFC' },
                ].map((m) => {
                  const isSelected = preferredMarket === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPreferredMarket(m.id as MarketRegion)}
                      className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs text-[var(--text-primary)]">{m.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] leading-relaxed">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Notifications & Sound Center */}
            <div className="border-t border-[var(--border-color)] pt-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Alert Broadcasting & Audio Feedback</h2>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Manage live indicator notifications and audio feedback chimes.
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">In-App Live Alert Toasts</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Display dynamic banner alerts when threshold conditions trigger</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={inAppAlerts}
                    onChange={(e) => setInAppAlerts(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                </label>

                <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3.5 hover:border-[var(--border-hover)] transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Acoustic Alert Chime</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Play a discreet D5/A5 harmonic sine wave tone upon catalyst triggers</p>
                    </div>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      Test Chime
                    </button>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-md active:scale-95"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Preferences Saved Successfully</span>
                  </>
                ) : (
                  <span>Save Platform Preferences</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: ABOUT US & ARCHITECTURE PAGE
          ============================================================== */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          {/* Mission & Founding Story Card */}
          <div className="featured-benchmark-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-mint)] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-mint)]">
                Institutional Financial Intelligence
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              PeekStox Global Intelligence
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed max-w-3xl">
              Founded by <strong>Viraj Kumar</strong>, <strong>Varshith Reddy</strong>, and <strong>Suraj R</strong>,
              with comprehensive product architecture, user experience systems, and interface engineering spearheaded by <strong>Vihan Thamke</strong>,
              PeekStox was created to replace black-box hype with empirical clarity, rigorous multi-factor quantitative models,
              and institutional-grade telemetry across global financial markets.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-[var(--border-color)]/60 pt-5">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">Vihan Thamke</p>
                <p className="text-[11px] text-[var(--positive-text)] font-semibold mt-0.5">Lead UI/UX Designer & Product Experience Architect</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Spearheaded the holistic user experience, visual identity, and front-end architecture of PeekStox.
                  Beyond UI design, engineered the design token framework across dark and light financial themes, developed the signature Liquid Glass optical navigation dock with responsive touch containment, and architected the institutional information hierarchy—translating complex multi-factor quantitative models, backtesting analytics, and FinBERT sentiment telemetry into an intuitive, high-clarity interface.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">Viraj Kumar</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Quantitative Modeling & Strategy</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Engineered the 6 Golden Rules zero-lookahead backtest frameworks, mathematical risk models, and multi-timeframe indicator formulas.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">Varshith Reddy</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Full-Stack Systems & Pipeline</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Architected the high-throughput Node.js streaming proxy, sub-millisecond in-memory TTL caching engine, and real-time exchange feeds.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">Suraj R</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Machine Learning & FinBERT Analytics</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Designed the multi-signal AI Synthesizer and FinBERT natural language financial sentiment classifier.
                </p>
              </div>
            </div>
          </div>

          {/* How This Website Was Made */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <Code className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">How PeekStox Was Built</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              PeekStox was constructed from the ground up to embody institutional finance aesthetics: high information density,
              zero-pill metadata discipline, tabular numerals, and zero layout shifting.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-400">
                  <LineChart className="h-4 w-4" />
                  <span>Custom Quantitative SVG Charting</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Interactive charting uses native SVG vector paths instead of bulky canvas widgets. Incorporates SMA 50/200,
                  Bollinger Bands standard deviation envelopes, RSI(14) with Wilder&apos;s smoothing, and progressive line drawing
                  synchronized to user viewports via Motion springs.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-sky-400">
                  <Layers className="h-4 w-4" />
                  <span>Liquid Glass Optics & Systems Architecture (Engineered by Vihan Thamke)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Conceived and architected by Vihan Thamke, the floating navigation dock incorporates 24px multi-layer backdrop blur,
                  upper specular glare rim sheen, prismatic light refraction, tailored dark/light color tokens, and safe-area inset
                  mathematics, providing responsive phone containment with full keyboard arrow navigation.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-400">
                  <Cpu className="h-4 w-4" />
                  <span>Server-Side Gemini AI Grounding</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  The AI analyst operates through a server-side proxy route using Google&apos;s official <code>@google/genai</code> SDK,
                  grounded with verified company filings, balance sheet debt-to-equity ratios, and real-time technical indicators.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-400">
                  <Database className="h-4 w-4" />
                  <span>High-Throughput Caching & Sync</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Features an in-memory TTL caching engine with concurrent batch slicing, automatic symbol mapping across 12 global
                  exchanges, and deterministic fallbacks ensuring 100% uptime during upstream rate limits.
                </p>
              </div>
            </div>
          </div>

          {/* What It Works On */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">What PeekStox Works On</h3>
            </div>

            <div className="space-y-3 divide-y divide-[var(--border-color)]/50 text-xs">
              <div className="pt-3 first:pt-0">
                <h4 className="font-bold text-[var(--text-primary)] mb-1">1. Live Global Equity & Benchmark Streaming</h4>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Synchronizes live tick prices and historical candles across the S&P 500, NASDAQ, Dow Jones, NIFTY 50, Sensex,
                  FTSE 100, DAX, CAC 40, Nikkei 225, Hang Seng, and ASX 200, alongside global equities including Apple, NVIDIA,
                  Microsoft, Reliance Industries, HDFC Bank, TCS, and TSMC.
                </p>
              </div>

              <div className="pt-3">
                <h4 className="font-bold text-[var(--text-primary)] mb-1">2. Quantitative Signal Consensus Algorithm</h4>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Synthesizes independent mathematical sub-models into a unified decision table with weighted technical momentum,
                  fundamental valuation health, and sentiment velocity, validated through frozen holdout sets.
                </p>
              </div>

              <div className="pt-3">
                <h4 className="font-bold text-[var(--text-primary)] mb-1">3. FinBERT Financial Sentiment Engine</h4>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Processes live financial headlines and earnings calls into positive, neutral, and negative sentiment distributions
                  to detect institutional sentiment shifts before price reactions.
                </p>
              </div>

              <div className="pt-3">
                <h4 className="font-bold text-[var(--text-primary)] mb-1">4. Real-Time Alert Engine with Audio Feedback</h4>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Monitors price milestones, moving average crossovers, and RSI overbought/oversold levels, delivering in-app alerts
                  with browser-native harmonic tone synthesis.
                </p>
              </div>
            </div>
          </div>

          {/* System Technology Stack Summary */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
              Verified Runtime Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
                <span className="text-[11px] text-[var(--text-muted)] block">Frontend Framework</span>
                <span className="font-bold text-[var(--text-primary)]">React 19 + Vite 8</span>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
                <span className="text-[11px] text-[var(--text-muted)] block">Styling Engine</span>
                <span className="font-bold text-[var(--text-primary)]">Tailwind CSS 4</span>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
                <span className="text-[11px] text-[var(--text-muted)] block">Physics & Animation</span>
                <span className="font-bold text-[var(--text-primary)]">Motion v12</span>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
                <span className="text-[11px] text-[var(--text-muted)] block">Backend Server</span>
                <span className="font-bold text-[var(--text-primary)]">Express + Node.js 22</span>
              </div>
            </div>
          </div>

          {/* Responsible Disclosure & Risk Disclaimer */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs text-[var(--text-muted)] space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldAlert className="h-4 w-4" />
              <span>Responsible Financial Information Disclaimer</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              PeekStox provides financial intelligence, quantitative metrics, and algorithmic backtest data strictly for informational
              and educational purposes. All financial trading carries substantial risk of capital loss. No model output constitutes
              financial or investment advice. Users must perform independent verification before committing capital.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
