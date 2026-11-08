import {
  Bookmark, CandlestickChart, Cpu, GitCompare, Globe2, Home, Info, LineChart, Newspaper, Settings, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tag?: string;
}

export const NAV: Record<string, NavItem> = {
  dashboard: { id: 'dashboard', label: 'Markets', icon: Home },
  explorer: { id: 'explorer', label: 'Explorer', icon: LineChart },
  simulator: { id: 'simulator', label: 'Simulator', icon: CandlestickChart, tag: 'Paper' },
  watchlist: { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  news: { id: 'news', label: 'Financial News', icon: Newspaper },
  assistant: { id: 'assistant', label: 'PeekStox AI', icon: Sparkles, tag: 'AI' },
  compare: { id: 'compare', label: 'Compare', icon: GitCompare },
  algo: { id: 'algo', label: 'Quantitative Lab', icon: Cpu, tag: 'Staged' },
  overview: { id: 'overview', label: 'Global Overview', icon: Globe2 },
  settings: { id: 'settings', label: 'Settings', icon: Settings },
  about: { id: 'about', label: 'About Us', icon: Info },
};

export const SIDEBAR_PRIMARY = ['dashboard', 'explorer', 'simulator', 'watchlist', 'news', 'assistant'].map((k) => NAV[k]);
export const SIDEBAR_TOOLS = ['compare', 'algo', 'overview'].map((k) => NAV[k]);
export const SIDEBAR_ACCOUNT = ['settings', 'about'].map((k) => NAV[k]);

/** Phone tab bar: four top-level tabs plus "More" (a bottom nav holds five at most). */
export const TABS = ['dashboard', 'explorer', 'simulator', 'watchlist'].map((k) => NAV[k]);
export const MORE_ITEMS = ['assistant', 'compare', 'algo', 'overview', 'news', 'settings', 'about'].map((k) => NAV[k]);
