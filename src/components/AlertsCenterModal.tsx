import React, { useState } from 'react';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Sparkles,
  Filter,
} from 'lucide-react';
import { StockQuote, UserAlert, MarketNotification } from '../types';

interface AlertsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockQuote[];
  alerts: UserAlert[];
  notifications: MarketNotification[];
  onCreateAlert: (alert: Omit<UserAlert, 'id' | 'createdAt' | 'isTriggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string, active: boolean) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onSimulateAlertTrigger: () => void;
}

export const AlertsCenterModal: React.FC<AlertsCenterModalProps> = ({
  isOpen,
  onClose,
  stocks,
  alerts,
  notifications,
  onCreateAlert,
  onDeleteAlert,
  onToggleAlert,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onSimulateAlertTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'active_alerts' | 'create'>('notifications');

  // New alert form state
  const [selectedTicker, setSelectedTicker] = useState(stocks[0]?.ticker || 'AAPL');
  const [conditionType, setConditionType] = useState<UserAlert['conditionType']>('price_above');
  const [targetValue, setTargetValue] = useState<string>('240.00');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const currentStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateAlert({
      ticker: selectedTicker,
      companyName: currentStock.name,
      conditionType,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      note,
      isActive: true,
    });
    setNote('');
    setActiveTab('active_alerts');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Real-Time Market Alerts
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                In-app notifications for price movements, technical triggers, and news
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-2.5 bg-[var(--bg-main)]/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'notifications'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('active_alerts')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'active_alerts'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>My Alerts</span>
              <span className="text-[10px] text-[var(--text-muted)]">({alerts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Alert</span>
            </button>
          </div>

          {/* Simulate Action Button */}
          <button
            onClick={onSimulateAlertTrigger}
            title="Trigger a live demo market alert now"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Zap className="h-3 w-3" />
            <span>Simulate Trigger</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: NOTIFICATIONS FEED */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs text-[var(--text-muted)]">
                <span>Recent In-App Broadcasts</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Mark all read
                  </button>
                  <span>·</span>
                  <button
                    onClick={onClearNotifications}
                    className="hover:text-rose-400 transition-colors"
                  >
                    Clear history
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/40 mb-2" />
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    All caught up
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    No new alert notifications. Create an alert or click "Simulate Trigger" to test.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                      n.isRead
                        ? 'border-[var(--border-color)] bg-[var(--bg-main)]/40 opacity-75'
                        : 'border-emerald-500/30 bg-emerald-500/5'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        n.severity === 'bullish'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : n.severity === 'bearish'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {n.severity === 'bullish' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : n.severity === 'bearish' ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE ALERTS */}
          {activeTab === 'active_alerts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs text-[var(--text-muted)]">
                <span>Configured Market Rules</span>
                <span>Active ({alerts.filter((a) => a.isActive).length}/{alerts.length})</span>
              </div>

              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-40 mb-2" />
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    No active alerts set
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Your First Alert
                  </button>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-3.5 hover:border-[var(--border-hover)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]">
                        {alert.ticker}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {alert.conditionType === 'price_above' && `Price crosses above $${alert.targetValue}`}
                            {alert.conditionType === 'price_below' && `Price crosses below $${alert.targetValue}`}
                            {alert.conditionType === 'change_percent' && `24h move exceeds ±${alert.targetValue}%`}
                            {alert.conditionType === 'rsi_overbought' && `RSI(14) crosses > ${alert.targetValue || 70} (Overbought)`}
                            {alert.conditionType === 'rsi_oversold' && `RSI(14) crosses < ${alert.targetValue || 30} (Oversold)`}
                            {alert.conditionType === 'moving_avg_cross' && 'Moving Average Crossover (SMA50 vs SMA200)'}
                            {alert.conditionType === 'breaking_news' && 'Breaking Regulatory or Material News'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {alert.note || alert.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => onToggleAlert(alert.id, !alert.isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          alert.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            alert.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW ALERT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Select Stock */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Select Stock
                </label>
                <select
                  value={selectedTicker}
                  onChange={(e) => {
                    setSelectedTicker(e.target.value);
                    const st = stocks.find((s) => s.ticker === e.target.value);
                    if (st) setTargetValue((st.price * 1.05).toFixed(2));
                  }}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                >
                  {stocks.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} — {s.name} ({s.currency === 'INR' ? '₹' : '$'}{s.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Type */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Alert Trigger Condition
                </label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value as UserAlert['conditionType'])}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                >
                  <option value="price_above">Price crosses Above target ($)</option>
                  <option value="price_below">Price crosses Below target ($)</option>
                  <option value="change_percent">24h Percentage Move Exceeds (±%)</option>
                  <option value="rsi_overbought">Technical: RSI(14) Overbought (&gt; 70)</option>
                  <option value="rsi_oversold">Technical: RSI(14) Oversold (&lt; 30)</option>
                  <option value="moving_avg_cross">Technical: Golden Cross / Death Cross</option>
                  <option value="breaking_news">Catalyst: High-Impact Breaking News</option>
                </select>
              </div>

              {/* Target Value input if applicable */}
              {(conditionType === 'price_above' ||
                conditionType === 'price_below' ||
                conditionType === 'change_percent' ||
                conditionType === 'rsi_overbought' ||
                conditionType === 'rsi_oversold') && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Target Threshold Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    required
                    placeholder="e.g. 240.00"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none tabular-nums"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Current {currentStock.ticker} price: {currentStock.currency === 'INR' ? '₹' : '$'}
                    {currentStock.price.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Note / Thesis */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Research Note or Thesis (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Take profit on breakout or review quarterly earnings..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-sm"
                >
                  Save & Activate Alert
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
