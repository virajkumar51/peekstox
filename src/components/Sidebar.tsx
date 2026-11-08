import { Bell } from 'lucide-react';
import type { UserProfile } from '../types';
import { SIDEBAR_ACCOUNT, SIDEBAR_PRIMARY, SIDEBAR_TOOLS, type NavItem } from '../config/navigation';
import { NavLink } from './NavLink';
import { PeekStoxLogo } from './PeekStoxLogo';
import { t } from '../utils/i18n';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  user: UserProfile;
  onOpenAuth: () => void;
}

const row = (active: boolean) =>
  `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    active ? 'bg-emerald-500/15 text-[var(--text-primary)] ring-1 ring-emerald-400/30 shadow-[0_0_22px_rgba(16,185,129,0.20)]' : 'text-[var(--text-secondary)] hover:bg-[rgb(128_128_128/0.14)] hover:text-[var(--text-primary)]'
  }`;

export function Sidebar({ activeView, onNavigate, unreadAlertsCount, onOpenAlerts, user, onOpenAuth }: SidebarProps) {
  const initials = (user.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const lang = user.language || 'en_US';

  const getTranslatedLabel = (id: string) => {
    switch (id) {
      case 'dashboard': return t('markets', lang);
      case 'explorer': return t('explorer', lang);
      case 'simulator': return t('simulator', lang);
      case 'watchlist': return t('watchlist', lang);
      case 'news': return t('newsCenter', lang);
      case 'assistant': return t('peekstoxAi', lang);
      case 'compare': return t('compare', lang);
      case 'algo': return t('algoLab', lang);
      case 'overview': return t('overview', lang);
      case 'settings': return t('settings', lang);
      case 'about': return t('about', lang);
      default: return id;
    }
  };

  const renderItem = (item: NavItem) => {
    const active = activeView === item.id;
    const label = getTranslatedLabel(item.id);
    return (
      <li key={item.id}>
        <NavLink id={item.id} active={active} onNavigate={onNavigate} className={row(active)}>
          <item.icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${active ? 'tone-up' : ''}`} />
          <span className="flex-1 truncate">{label}</span>
          {item.tag && <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold tone-up">{item.tag}</span>}
        </NavLink>
      </li>
    );
  };

  return (
    <aside className="app-sidebar flex flex-col glass-bar border-r border-[var(--ps-border)] px-3 pb-3 pt-5">
      <div className="px-2 pb-5"><PeekStoxLogo /></div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto">
        <ul className="space-y-1">{SIDEBAR_PRIMARY.map(renderItem)}</ul>
        <p className="mb-1 mt-5 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('tools', lang)}</p>
        <ul className="space-y-1">{SIDEBAR_TOOLS.map(renderItem)}</ul>
      </nav>
      <div className="mt-3 space-y-1 border-t border-[var(--ps-border)] pt-3">
        <button type="button" onClick={onOpenAlerts} className={row(false)}>
          <Bell aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{t('marketAlerts', lang)}</span>
          {unreadAlertsCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-xs font-bold text-black">
              <span className="sr-only">{unreadAlertsCount} unread</span><span aria-hidden="true">{unreadAlertsCount}</span>
            </span>
          )}
        </button>
        <ul className="space-y-1">{SIDEBAR_ACCOUNT.map(renderItem)}</ul>
        <button
          type="button"
          onClick={onOpenAuth}
          aria-label={`Account: ${user.name}`}
          className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[var(--ps-border)] bg-[var(--bg-main)]/40 p-2 text-left hover:border-emerald-500/40 hover:bg-[var(--bg-main)]/80 transition-all"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[rgb(128_128_128/0.2)] shadow-sm">
            <img
              src={user.avatarUrl || '/peekstox_profile.png'}
              alt={user.name}
              className="h-full w-full object-cover rounded-xl"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
              {user.accountType === 'guest' ? t('guest', lang) : user.name}
            </span>
            <span className="block truncate text-xs text-[var(--text-muted)]">
              {user.accountType === 'guest' ? t('guestAccount', lang) : t('registeredAccount', lang)}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
