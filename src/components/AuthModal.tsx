import React, { useState } from 'react';
import {
  User,
  X,
  Mail,
  Lock,
  Check,
  Globe,
  DollarSign,
  Bell,
  Sparkles,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Languages,
  UserCheck,
} from 'lucide-react';
import { UserProfile, MarketRegion, DisplayCurrency, ChartTimeframe } from '../types';
import { t } from '../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (userData: Partial<UserProfile>) => Promise<void>;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
  onContinueAsGuest?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onRegister,
  onUpdateProfile,
  onLogout,
  onContinueAsGuest,
}) => {
  const isGuest = currentUser.accountType === 'guest' || !currentUser.email || currentUser.name === 'Guest' || currentUser.email.includes('guest@');
  const [mode, setMode] = useState<'profile' | 'login' | 'register'>(isGuest ? 'login' : 'profile');
  const [email, setEmail] = useState(isGuest ? '' : currentUser.email || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(currentUser.name || '');
  const [preferredMarket, setPreferredMarket] = useState<MarketRegion>(currentUser.preferredMarket || 'GLOBAL');
  const [baseCurrency, setBaseCurrency] = useState<DisplayCurrency>(currentUser.baseCurrency || 'USD');
  const [language, setLanguage] = useState<string>(currentUser.language || 'en_US');
  const [defaultTimeframe, setDefaultTimeframe] = useState<ChartTimeframe>(currentUser.defaultTimeframe || '1M');
  const [inAppAlerts, setInAppAlerts] = useState(currentUser.inAppAlertsEnabled ?? true);
  const [soundEnabled, setSoundEnabled] = useState(currentUser.soundEnabled ?? true);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName(currentUser.name);
      if (currentUser.preferredMarket) setPreferredMarket(currentUser.preferredMarket);
      if (currentUser.baseCurrency) setBaseCurrency(currentUser.baseCurrency);
      if (currentUser.language) setLanguage(currentUser.language);
      if (currentUser.defaultTimeframe) setDefaultTimeframe(currentUser.defaultTimeframe);
      if (currentUser.inAppAlertsEnabled !== undefined) setInAppAlerts(currentUser.inAppAlertsEnabled);
      if (currentUser.soundEnabled !== undefined) setSoundEnabled(currentUser.soundEnabled);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
      setMode('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onRegister({
        name,
        email,
        preferredMarket,
        baseCurrency,
        language,
        defaultTimeframe,
        accountType: 'registered',
      });
      setMode('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({
        name,
        preferredMarket,
        baseCurrency,
        language,
        defaultTimeframe,
        inAppAlertsEnabled: inAppAlerts,
        soundEnabled,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestClick = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else {
      onLogout();
    }
    onClose();
  };

  const languagesList = [
    { code: 'en_US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en_GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'es_ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr_FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de_DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'hi_IN', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ja_JP', name: '日本語', flag: '🇯🇵' },
    { code: 'zh_CN', name: '中文', flag: '🇨🇳' },
  ];

  const currenciesList: DisplayCurrency[] = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                {mode === 'profile'
                  ? 'Account & Preferences'
                  : mode === 'login'
                  ? 'Sign In to PeekStox'
                  : 'Create PeekStox Account'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isGuest && mode === 'profile'
                  ? 'Browsing with temporary Guest access'
                  : 'Sync watchlists, custom alerts, and model preferences'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-main)]/50 p-1.5">
          <button
            onClick={() => setMode('profile')}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === 'profile'
                ? 'bg-[var(--bg-card)] text-emerald-400 shadow-sm font-bold ring-1 ring-emerald-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isGuest ? 'Guest Preferences' : 'Profile'}
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-[var(--bg-card)] text-emerald-400 shadow-sm font-bold ring-1 ring-emerald-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-[var(--bg-card)] text-emerald-400 shadow-sm font-bold ring-1 ring-emerald-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {mode === 'profile' && (
            <div className="space-y-5">
              {/* Profile Picture & Account Section */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-4 shadow-sm">
                {/* Official PeekStox Profile Picture inside rounded-square avatar */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/40 shadow-sm">
                  <img
                    src={currentUser.avatarUrl || '/peekstox_profile.png'}
                    alt={currentUser.name}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                      {isGuest ? 'Guest' : currentUser.name}
                    </p>
                    {isGuest ? (
                      <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        Guest
                      </span>
                    ) : (
                      <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Registered
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {isGuest ? 'Unregistered guest session' : currentUser.email}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Account Type: <strong className="text-[var(--text-primary)]">{isGuest ? 'Guest Account' : 'Registered Account'}</strong>
                  </p>
                </div>
              </div>

              {/* Guest Account Notice / Upgrade Promotion */}
              {isGuest ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-[var(--text-secondary)] space-y-2">
                  <p className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" />
                    Guest Account Active
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    You have instant access to public quotes, quantitative signals, and can change display language and currency. To enable persistent cloud sync across devices, please register a full account.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
                    >
                      Register Full Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Name Editor (only for registered) */}
              {!isGuest && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Account Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Preferences: Currency & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    Display Currency
                  </label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value as DisplayCurrency)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  >
                    {currenciesList.map((c) => (
                      <option key={c} value={c}>
                        {c} ({c === 'USD' ? '$' : c === 'INR' ? '₹' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : c === 'JPY' ? '¥' : c})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-purple-400" />
                    Display Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  >
                    {languagesList.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Market Universe & Chart Timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-sky-400" />
                    Primary Market
                  </label>
                  <select
                    value={preferredMarket}
                    onChange={(e) => setPreferredMarket(e.target.value as MarketRegion)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="GLOBAL">Global (Unified US & India)</option>
                    <option value="US">US Markets (NYSE, NASDAQ)</option>
                    <option value="IN">Indian Markets (NSE / BSE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Default Timeframe
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['1D', '1M', '1Y', 'MAX'] as ChartTimeframe[]).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setDefaultTimeframe(tf)}
                        className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                          defaultTimeframe === tf
                            ? 'bg-emerald-500 text-black font-bold'
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-[var(--text-primary)]">In-App Live Alert Banners</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={inAppAlerts}
                    onChange={(e) => setInAppAlerts(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-[var(--text-primary)]">Audio Alert Chime (D5/A5)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Save & Sign Out Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Preferences Saved!</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
                  )}
                </button>

                {!isGuest && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sign out to Guest Account"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="space-y-4">
              {/* Prominent Continue as Guest Option */}
              <button
                type="button"
                onClick={handleGuestClick}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all group shadow-sm active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/40 border border-emerald-500/30 overflow-hidden">
                    <img src="/peekstox_profile.png" alt="Guest" className="h-full w-full object-cover rounded-2xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Continue as Guest</span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Instant Access
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Explore live market data, indicators, and charts without logging in.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative flex items-center my-3">
                <div className="flex-grow border-t border-[var(--border-color)]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Or Sign In to Registered Account
                </span>
                <div className="flex-grow border-t border-[var(--border-color)]"></div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="investor@peekstox.com"
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] pl-10 pr-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] pl-10 pr-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-sm"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Register
                    </button>
                    {' '}or{' '}
                    <button
                      type="button"
                      onClick={handleGuestClick}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Continue as Guest
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-4">
              {/* Prominent Continue as Guest Option */}
              <button
                type="button"
                onClick={handleGuestClick}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all group shadow-sm active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/40 border border-emerald-500/30 overflow-hidden">
                    <img src="/peekstox_profile.png" alt="Guest" className="h-full w-full object-cover rounded-2xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Continue as Guest</span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        No Signup Needed
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Skip registration and access PeekStox features immediately.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative flex items-center my-3">
                <div className="flex-grow border-t border-[var(--border-color)]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Or Create a Registered Account
                </span>
                <div className="flex-grow border-t border-[var(--border-color)]"></div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-sm"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer with Attribution */}
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] px-6 py-3.5 text-center text-[11px] text-[var(--text-muted)]">
          <span>PeekStox — Global Stock Market Intelligence & Analytics</span>
        </div>
      </div>
    </div>
  );
};
