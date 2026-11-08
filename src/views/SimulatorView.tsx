import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  History,
  Info,
  Layers,
  Percent,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import type { DisplayCurrency, StockQuote, UserProfile } from '../types';
import type {
  ExchangeScheduleInfo,
  SimulatorHolding,
  SimulatorOrder,
  SimulatorOrderSide,
  SimulatorOrderType,
  SimulatorPerformanceStats,
  SimulatorPortfolio,
  SimulatorTransaction,
} from '../types/simulator';
import {
  calculatePerformanceAnalytics,
  calculateSimulatedFee,
  cancelOrder,
  createInitialPortfolio,
  placeOrder,
  revaluePortfolio,
  SIMULATED_SLIPPAGE_RATE,
} from '../utils/simulatorEngine';
import {
  getExchangeRegion,
  getIndiaMarketStatus,
  getMarketScheduleForStock,
  getUSMarketStatus,
} from '../utils/marketSchedule';
import { GLOBAL_COMPANIES } from '../data/globalCompanies';
import { convertAndFormatPrice } from '../utils/i18n';

interface SimulatorViewProps {
  user: UserProfile;
  stocks: StockQuote[];
  baseCurrency?: DisplayCurrency;
  language?: string;
  onSelectStock?: (ticker: string) => void;
  onShowToast?: (toast: { title: string; message: string; severity: 'bullish' | 'bearish' | 'info'; duration?: number }) => void;
}

type SimulatorTab = 'holdings' | 'pending' | 'history' | 'analytics';
type TimeframeOption = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  user,
  stocks,
  baseCurrency = 'USD',
  onSelectStock,
  onShowToast,
}) => {
  const isGuest = user.role === 'guest' || user.accountType === 'guest' || !user.email;
  const storageKey = isGuest ? 'pkstox_simulator_guest' : `pkstox_simulator_${user.id || user.email}`;

  // 1. Portfolio State (Persisted in localStorage & Server)
  const [portfolio, setPortfolio] = useState<SimulatorPortfolio>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.cash === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      /* ignore */
    }
    return createInitialPortfolio(user.id || 'guest', isGuest ? 'guest' : 'registered');
  });

  // 2. Active View Tabs & Controls
  const [activeTab, setActiveTab] = useState<SimulatorTab>('holdings');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1M');
  const [selectedExchangeView, setSelectedExchangeView] = useState<'US' | 'IN'>('US');

  // 3. Trade Execution Terminal Form State
  const [tradeSide, setTradeSide] = useState<SimulatorOrderSide>('buy');
  const [orderType, setOrderType] = useState<SimulatorOrderType>('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockQuote>(() => {
    return stocks.find((s) => s.ticker === 'AAPL') || stocks[0] || (GLOBAL_COMPANIES[0] as StockQuote);
  });
  const [shareCount, setShareCount] = useState<number>(10);
  const [limitPriceInput, setLimitPriceInput] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // 4. Modals State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // 5. Transaction History Filters
  const [historySideFilter, setHistorySideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // 6. Live Market Schedules State (refreshed every 10 seconds)
  const [usSchedule, setUsSchedule] = useState<ExchangeScheduleInfo>(() => getUSMarketStatus());
  const [indiaSchedule, setIndiaSchedule] = useState<ExchangeScheduleInfo>(() => getIndiaMarketStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setUsSchedule(getUSMarketStatus());
      setIndiaSchedule(getIndiaMarketStatus());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Save portfolio to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(portfolio));
    } catch (e) {
      /* storage quota exceeded or disabled */
    }
  }, [portfolio, storageKey]);

  // Sync with backend on mount
  useEffect(() => {
    let isCancelled = false;
    async function syncWithServer() {
      try {
        const token = user.id && !isGuest ? user.id : '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (isGuest) headers['x-guest-id'] = user.id || 'guest_default';

        const res = await fetch('/api/simulator/portfolio', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data?.portfolio && !isCancelled) {
            // Keep the one with latest activity
            setPortfolio((prev) => {
              if (
                data.portfolio.transactions.length > prev.transactions.length ||
                data.portfolio.orders.length > prev.orders.length ||
                prev.portfolioValue === 100000
              ) {
                return data.portfolio;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Fallback to client state
      }
    }
    syncWithServer();
    return () => {
      isCancelled = true;
    };
  }, [user.id, isGuest]);

  // Revalue portfolio holdings with live stock prices
  useEffect(() => {
    if (portfolio.holdings.length === 0) return;
    const quotesMap = new Map<string, { price: number; changePercent?: number }>();
    stocks.forEach((s) => {
      quotesMap.set(s.ticker.toUpperCase(), { price: s.price, changePercent: s.changePercent });
    });
    GLOBAL_COMPANIES.forEach((c) => {
      if (!quotesMap.has(c.ticker.toUpperCase())) {
        quotesMap.set(c.ticker.toUpperCase(), { price: c.price, changePercent: c.changePercent });
      }
    });

    setPortfolio((prev) => revaluePortfolio(prev, quotesMap));
  }, [stocks]);

  // Performance statistics computed from actual simulation data
  const performanceStats: SimulatorPerformanceStats = useMemo(() => {
    return calculatePerformanceAnalytics(portfolio);
  }, [portfolio]);

  // Market Schedule for the currently selected stock
  const currentStockSchedule = useMemo(() => {
    return getMarketScheduleForStock(selectedStock.ticker, selectedStock.exchange);
  }, [selectedStock]);

  // All searchable stocks across platform
  const allSearchableStocks = useMemo(() => {
    const map = new Map<string, StockQuote>();
    stocks.forEach((s) => map.set(s.ticker.toUpperCase(), s));
    GLOBAL_COMPANIES.forEach((c) => {
      if (!map.has(c.ticker.toUpperCase())) {
        map.set(c.ticker.toUpperCase(), c as StockQuote);
      }
    });
    return Array.from(map.values());
  }, [stocks]);

  // Filtered stocks for autocomplete
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return allSearchableStocks.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return allSearchableStocks
      .filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allSearchableStocks, searchQuery]);

  // Current stock details in form
  const currentMarketPrice = selectedStock.price || 150.0;
  const effectiveExecPrice =
    orderType === 'limit' && Number(limitPriceInput) > 0 ? Number(limitPriceInput) : currentMarketPrice;
  const estimatedOrderValue = Number((shareCount * effectiveExecPrice).toFixed(2));
  const estimatedFee = calculateSimulatedFee(shareCount, effectiveExecPrice);
  const estimatedSlippage =
    orderType === 'market' ? Number((estimatedOrderValue * SIMULATED_SLIPPAGE_RATE).toFixed(2)) : 0;
  const totalRequiredCash = tradeSide === 'buy' ? Number((estimatedOrderValue + estimatedFee).toFixed(2)) : 0;
  const estimatedNetProceeds = tradeSide === 'sell' ? Number((estimatedOrderValue - estimatedFee).toFixed(2)) : 0;
  const remainingCashAfterTrade =
    tradeSide === 'buy'
      ? Number((portfolio.cash - totalRequiredCash).toFixed(2))
      : Number((portfolio.cash + estimatedNetProceeds).toFixed(2));

  // Current user's holdings for selected stock (if selling)
  const existingHoldingForSelected = useMemo(() => {
    return portfolio.holdings.find((h) => h.ticker.toUpperCase() === selectedStock.ticker.toUpperCase());
  }, [portfolio.holdings, selectedStock.ticker]);

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (shareCount <= 0) {
      onShowToast?.({
        title: 'Invalid Quantity',
        message: 'Please enter a positive whole number of shares.',
        severity: 'info',
      });
      return;
    }

    if (tradeSide === 'buy' && totalRequiredCash > portfolio.cash) {
      onShowToast?.({
        title: 'Insufficient Buying Power',
        message: `Order requires $${totalRequiredCash.toFixed(2)}, but available cash is $${portfolio.cash.toFixed(2)}.`,
        severity: 'bearish',
      });
      return;
    }

    if (tradeSide === 'sell') {
      const owned = existingHoldingForSelected?.shares || 0;
      if (owned < shareCount) {
        onShowToast?.({
          title: 'Insufficient Shares',
          message: `You own ${owned} shares of ${selectedStock.ticker}, but tried to sell ${shareCount}.`,
          severity: 'bearish',
        });
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const limitPrice = orderType === 'limit' && Number(limitPriceInput) > 0 ? Number(limitPriceInput) : undefined;
      const result = placeOrder(portfolio, {
        ticker: selectedStock.ticker,
        name: selectedStock.name,
        exchange: selectedStock.exchange,
        currency: selectedStock.currency || 'USD',
        side: tradeSide,
        type: orderType,
        shares: shareCount,
        currentMarketPrice,
        limitPrice,
      });

      if (result.success) {
        setPortfolio(result.portfolio);
        onShowToast?.({
          title: result.order?.status === 'executed' ? 'Order Executed' : 'Order Submitted',
          message: result.message,
          severity: tradeSide === 'buy' ? 'bullish' : 'info',
        });
        // Try backend sync in background
        fetch('/api/simulator/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: !isGuest && user.id ? `Bearer ${user.id}` : '',
            'x-guest-id': isGuest ? user.id || 'guest_default' : '',
          },
          body: JSON.stringify({
            ticker: selectedStock.ticker,
            name: selectedStock.name,
            exchange: selectedStock.exchange,
            currency: selectedStock.currency,
            side: tradeSide,
            type: orderType,
            shares: shareCount,
            currentMarketPrice,
            limitPrice,
          }),
        }).catch(() => {
          /* ignore */
        });
      } else {
        onShowToast?.({
          title: 'Order Rejected',
          message: result.message,
          severity: 'bearish',
        });
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = (orderId: string) => {
    const result = cancelOrder(portfolio, orderId);
    if (result.success) {
      setPortfolio(result.portfolio);
      onShowToast?.({
        title: 'Order Cancelled',
        message: result.message,
        severity: 'info',
      });
      fetch(`/api/simulator/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: !isGuest && user.id ? `Bearer ${user.id}` : '',
          'x-guest-id': isGuest ? user.id || 'guest_default' : '',
        },
      }).catch(() => {
        /* ignore */
      });
    }
  };

  // Handle Reset Portfolio
  const handleConfirmReset = async () => {
    const resetPort = createInitialPortfolio(user.id || 'guest', isGuest ? 'guest' : 'registered');
    setPortfolio(resetPort);
    setIsResetModalOpen(false);
    onShowToast?.({
      title: 'Portfolio Reset',
      message: 'Restored starting balance of $100,000 USD virtual funds. Positions and history cleared.',
      severity: 'info',
    });
    fetch('/api/simulator/reset', {
      method: 'POST',
      headers: {
        Authorization: !isGuest && user.id ? `Bearer ${user.id}` : '',
        'x-guest-id': isGuest ? user.id || 'guest_default' : '',
      },
    }).catch(() => {
      /* ignore */
    });
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return portfolio.transactions.filter((tx) => {
      if (historySideFilter !== 'all' && tx.side !== historySideFilter) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        return tx.ticker.toLowerCase().includes(q) || tx.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [portfolio.transactions, historySideFilter, historySearchQuery]);

  const pendingOrders = useMemo(() => {
    return portfolio.orders.filter((o) => o.status === 'pending');
  }, [portfolio.orders]);

  // Select stock to trade from holdings table
  const handleQuickTrade = (ticker: string, side: SimulatorOrderSide) => {
    const found = allSearchableStocks.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
    if (found) {
      setSelectedStock(found);
      setTradeSide(side);
      if (side === 'sell') {
        const h = portfolio.holdings.find((x) => x.ticker.toUpperCase() === ticker.toUpperCase());
        if (h) setShareCount(h.shares);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* 1. Header Banner & Virtual Trading Transparency */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Stock Market Simulator
              </div>
              <span className="rounded-full bg-[var(--bg-card-hover)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                Paper Trading Terminal
              </span>
              <span className="rounded-full bg-[var(--bg-card-hover)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                {isGuest ? 'Guest Session' : 'Registered Member'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Virtual Trading Simulator
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Experience realistic stock trading with <span className="font-semibold text-emerald-500">$100,000 USD</span>{' '}
              virtual cash, real exchange schedules, and simulated order execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-rose-500/30 hover:text-rose-500"
              title="Reset portfolio back to initial $100,000"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Portfolio
            </button>
          </div>
        </div>

        {/* Paper-Trading Disclaimer */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/60 px-3.5 py-2 text-xs text-[var(--text-secondary)]">
          <Info className="h-4 w-4 shrink-0 text-cyan-500" />
          <span>
            <strong>Educational Paper Trading:</strong> All transactions and balances are strictly virtual. No real money
            is deposited or at risk. Simulated performance does not guarantee real-market results.
          </span>
        </div>
      </div>

      {/* 2. Real Stock Market Timing & Schedule Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* US Exchange Status Card */}
        <div
          onClick={() => setSelectedExchangeView('US')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedExchangeView === 'US'
              ? 'border-emerald-500/50 bg-[var(--bg-card)] shadow-sm'
              : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 font-bold text-blue-500 text-xs">
                US
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">NYSE & NASDAQ</div>
                <div className="text-xs text-[var(--text-secondary)]">United States (ET)</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                usSchedule.status === 'OPEN'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : usSchedule.status === 'PRE_MARKET'
                  ? 'bg-amber-500/15 text-amber-500'
                  : usSchedule.status === 'AFTER_HOURS'
                  ? 'bg-blue-500/15 text-blue-500'
                  : 'bg-zinc-500/15 text-zinc-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  usSchedule.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              {usSchedule.statusLabel}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Current Time: <strong className="text-[var(--text-primary)]">{usSchedule.currentTimeInExchange}</strong></span>
            </div>
            <span className="text-[var(--text-secondary)] font-medium">{usSchedule.nextSessionText}</span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
            Regular Hours: <strong>9:30 AM – 4:00 PM Eastern Time</strong> (Mon–Fri)
          </div>
        </div>

        {/* Indian Exchange Status Card */}
        <div
          onClick={() => setSelectedExchangeView('IN')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedExchangeView === 'IN'
              ? 'border-emerald-500/50 bg-[var(--bg-card)] shadow-sm'
              : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 font-bold text-orange-500 text-xs">
                IN
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">NSE & BSE</div>
                <div className="text-xs text-[var(--text-secondary)]">India (IST)</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                indiaSchedule.status === 'OPEN'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : indiaSchedule.status === 'PRE_MARKET'
                  ? 'bg-amber-500/15 text-amber-500'
                  : indiaSchedule.status === 'AFTER_HOURS'
                  ? 'bg-blue-500/15 text-blue-500'
                  : 'bg-zinc-500/15 text-zinc-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  indiaSchedule.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              {indiaSchedule.statusLabel}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Current Time: <strong className="text-[var(--text-primary)]">{indiaSchedule.currentTimeInExchange}</strong></span>
            </div>
            <span className="text-[var(--text-secondary)] font-medium">{indiaSchedule.nextSessionText}</span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
            Regular Hours: <strong>9:15 AM – 3:30 PM IST</strong> (Mon–Fri)
          </div>
        </div>
      </div>

      {/* 3. Portfolio Key Metrics Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Portfolio Value */}
        <div className="col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:col-span-1 lg:col-span-1">
          <div className="text-xs font-medium text-[var(--text-secondary)]">Total Portfolio Value</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            ${portfolio.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {baseCurrency !== 'USD' && (
            <div className="text-xs text-[var(--text-secondary)]">
              ≈ {convertAndFormatPrice(portfolio.portfolioValue, baseCurrency)}
            </div>
          )}
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${
                portfolio.overallPnL >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
              }`}
            >
              {portfolio.overallPnL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {portfolio.overallPnL >= 0 ? '+' : ''}
              {portfolio.overallPnLPercent.toFixed(2)}%
            </span>
            <span className="text-[var(--text-secondary)]">overall return</span>
          </div>
        </div>

        {/* Available Cash / Buying Power */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="text-xs font-medium text-[var(--text-secondary)]">Available Cash</div>
          <div className="mt-2 text-xl font-bold tracking-tight text-emerald-500">
            ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            Buying Power ({((portfolio.cash / portfolio.portfolioValue) * 100).toFixed(0)}%)
          </div>
        </div>

        {/* Invested Capital */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="text-xs font-medium text-[var(--text-secondary)]">Invested Amount</div>
          <div className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">
            ${portfolio.invested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            {portfolio.holdings.length} {portfolio.holdings.length === 1 ? 'Position' : 'Positions'} Open
          </div>
        </div>

        {/* Realized Profit / Loss */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="text-xs font-medium text-[var(--text-secondary)]">Realized P/L</div>
          <div
            className={`mt-2 text-xl font-bold tracking-tight ${
              portfolio.realizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {portfolio.realizedPnL >= 0 ? '+' : ''}${portfolio.realizedPnL.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">From closed sales</div>
        </div>

        {/* Win Rate */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="text-xs font-medium text-[var(--text-secondary)]">Trading Win Rate</div>
          <div className="mt-2 text-xl font-bold tracking-tight text-cyan-500">
            {performanceStats.winRate.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            {performanceStats.winningTrades}W / {performanceStats.losingTrades}L ({performanceStats.totalTrades} trades)
          </div>
        </div>
      </div>

      {/* 4. Interactive Portfolio Performance Chart */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Portfolio Equity Curve</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Historical simulated net worth based on executed trades and live market marks
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-main)] p-1">
            {(['1D', '1W', '1M', '1Y', 'ALL'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  timeframe === tf
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Equity Curve */}
        <div className="mt-4 h-48 w-full">
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 120">
            <defs>
              <linearGradient id="simEquityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={portfolio.overallPnL >= 0 ? '#10b981' : '#f43f5e'}
                  stopOpacity="0.25"
                />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline at starting $100,000 */}
            <line
              x1="0"
              y1="60"
              x2="500"
              y2="60"
              stroke="var(--border-subtle)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Render curve points from history */}
            {(() => {
              const hist = portfolio.history.length > 0 ? portfolio.history : [{ portfolioValue: 100000 }];
              const values = hist.map((h) => h.portfolioValue);
              const minVal = Math.min(95000, ...values);
              const maxVal = Math.max(105000, ...values);
              const range = maxVal - minVal || 1;

              const points = values.map((val, idx) => {
                const x = hist.length === 1 ? 250 : (idx / (hist.length - 1)) * 500;
                const y = 110 - ((val - minVal) / range) * 100;
                return `${x},${y}`;
              });

              const pathStr = `M ${points.join(' L ')}`;
              const areaStr = `${pathStr} L 500,120 L 0,120 Z`;

              return (
                <>
                  <path d={areaStr} fill="url(#simEquityGrad)" />
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={portfolio.overallPnL >= 0 ? '#10b981' : '#f43f5e'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              );
            })()}
          </svg>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Starting Baseline: $100,000.00</span>
          <span>
            Current Balance: <strong>${portfolio.portfolioValue.toFixed(2)}</strong> (
            {portfolio.overallPnL >= 0 ? '+' : ''}${portfolio.overallPnL.toFixed(2)})
          </span>
        </div>
      </div>

      {/* 5. Main Workspace: Tabs + Trading Execution Terminal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Holdings, Pending Orders, History, Analytics (7 Cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Workspace Tabs */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'holdings'
                  ? 'border-emerald-500 text-emerald-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Holdings ({portfolio.holdings.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'border-emerald-500 text-emerald-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock className="h-4 w-4" />
              Pending Orders ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'border-emerald-500 text-emerald-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="h-4 w-4" />
              History ({portfolio.transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'analytics'
                  ? 'border-emerald-500 text-emerald-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Percent className="h-4 w-4" />
              Analytics
            </button>
          </div>

          {/* TAB 1: Holdings */}
          {activeTab === 'holdings' && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
              {portfolio.holdings.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-main)] text-[var(--text-secondary)]">
                    <Layers className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No Open Holdings</h4>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                    You currently hold 100% virtual cash ($100,000.00). Use the trade panel to place your first simulated market or limit order.
                  </p>
                  <button
                    onClick={() => {
                      setTradeSide('buy');
                      const nvda = allSearchableStocks.find((s) => s.ticker === 'NVDA') || selectedStock;
                      setSelectedStock(nvda);
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Explore & Buy Stocks
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/50 text-[var(--text-secondary)]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Asset</th>
                        <th className="py-3 px-3 font-semibold text-right">Shares</th>
                        <th className="py-3 px-3 font-semibold text-right">Avg Cost</th>
                        <th className="py-3 px-3 font-semibold text-right">Current Price</th>
                        <th className="py-3 px-3 font-semibold text-right">Market Value</th>
                        <th className="py-3 px-3 font-semibold text-right">Unrealized P/L</th>
                        <th className="py-3 px-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                      {portfolio.holdings.map((h) => (
                        <tr key={h.ticker} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-sm">{h.ticker}</div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-[140px]">
                              {h.name}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium">{h.shares}</td>
                          <td className="py-3.5 px-3 text-right">${h.averageCost.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-right font-semibold">${h.currentPrice.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-right font-semibold">${h.currentValue.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-right">
                            <div
                              className={`font-semibold ${
                                h.unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                              }`}
                            >
                              {h.unrealizedPnL >= 0 ? '+' : ''}${h.unrealizedPnL.toFixed(2)}
                            </div>
                            <div
                              className={`text-[10px] ${
                                h.unrealizedPnLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                              }`}
                            >
                              ({h.unrealizedPnLPercent >= 0 ? '+' : ''}
                              {h.unrealizedPnLPercent.toFixed(2)}%)
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickTrade(h.ticker, 'buy')}
                                className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/20"
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => handleQuickTrade(h.ticker, 'sell')}
                                className="rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/20"
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pending Orders */}
          {activeTab === 'pending' && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
              {pendingOrders.length === 0 ? (
                <div className="p-12 text-center text-sm text-[var(--text-secondary)]">
                  <Clock className="mx-auto h-8 w-8 text-[var(--text-secondary)] mb-2" />
                  No pending orders. Market orders execute immediately during open exchange hours, or queue here when markets are closed.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {pendingOrders.map((o) => (
                    <div key={o.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                              o.side === 'buy' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                            }`}
                          >
                            {o.side} {o.type}
                          </span>
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            {o.shares} shares of {o.ticker}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">({o.exchange})</span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {o.notes || `Limit: $${o.limitPrice?.toFixed(2)}`} • Placed: {new Date(o.placedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <div className="font-semibold text-[var(--text-primary)]">
                            Est: ${o.estimatedValue.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Fee: ${o.fee.toFixed(2)}</div>
                        </div>
                        <button
                          onClick={() => handleCancelOrder(o.id)}
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Transaction History */}
          {activeTab === 'history' && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
              <div className="p-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {(['all', 'buy', 'sell'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistorySideFilter(filter)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                        historySideFilter === filter
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Filter by ticker..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] py-1 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-10 text-center text-xs text-[var(--text-secondary)]">
                  No simulated transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/50 text-[var(--text-secondary)]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Side</th>
                        <th className="py-2.5 px-3">Stock</th>
                        <th className="py-2.5 px-3 text-right">Shares</th>
                        <th className="py-2.5 px-3 text-right">Exec Price</th>
                        <th className="py-2.5 px-3 text-right">Total Value</th>
                        <th className="py-2.5 px-3 text-right">Fees</th>
                        <th className="py-2.5 px-3 text-right">Realized P/L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[var(--bg-card-hover)]">
                          <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)]">
                            {new Date(tx.timestamp).toLocaleDateString()}{' '}
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                tx.side === 'buy' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                              }`}
                            >
                              {tx.side}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{tx.ticker}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{tx.shares}</td>
                          <td className="py-2.5 px-3 text-right">${tx.executionPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">${tx.totalValue.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">${tx.fee.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {tx.realizedPnL !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  tx.realizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                }`}
                              >
                                {tx.realizedPnL >= 0 ? '+' : ''}${tx.realizedPnL.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[var(--text-secondary)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Analytics */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
                <div className="text-xs font-semibold text-[var(--text-secondary)]">Trading Hit Ratio</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-emerald-500">{performanceStats.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Win Rate</div>
                </div>
                <div className="mt-3 w-full rounded-full bg-[var(--bg-main)] h-2 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${performanceStats.winRate}%` }} />
                  <div
                    className="bg-rose-500 h-full"
                    style={{ width: `${Math.max(0, 100 - performanceStats.winRate)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>{performanceStats.winningTrades} Winning Trades</span>
                  <span>{performanceStats.losingTrades} Losing Trades</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
                <div className="text-xs font-semibold text-[var(--text-secondary)]">Average Trade Size</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">Avg Win</div>
                    <div className="text-lg font-bold text-emerald-500">+${performanceStats.avgWin.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">Avg Loss</div>
                    <div className="text-lg font-bold text-rose-500">-${performanceStats.avgLoss.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--text-secondary)]">
                  Total Completed Trades: <strong>{performanceStats.totalTrades}</strong>
                </div>
              </div>

              {/* Best Performer */}
              {performanceStats.bestPerformer && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                    <TrendingUp className="h-4 w-4" /> Best Performing Holding
                  </div>
                  <div className="mt-2 font-bold text-lg text-[var(--text-primary)]">
                    {performanceStats.bestPerformer.ticker}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{performanceStats.bestPerformer.name}</div>
                  <div className="mt-2 text-base font-bold text-emerald-500">
                    +${performanceStats.bestPerformer.pnl.toFixed(2)} (+
                    {performanceStats.bestPerformer.pnlPercent.toFixed(2)}%)
                  </div>
                </div>
              )}

              {/* Worst Performer */}
              {performanceStats.worstPerformer && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                    <TrendingDown className="h-4 w-4" /> Worst Performing Holding
                  </div>
                  <div className="mt-2 font-bold text-lg text-[var(--text-primary)]">
                    {performanceStats.worstPerformer.ticker}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{performanceStats.worstPerformer.name}</div>
                  <div className="mt-2 text-base font-bold text-rose-500">
                    ${performanceStats.worstPerformer.pnl.toFixed(2)} (
                    {performanceStats.worstPerformer.pnlPercent.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Trading Execution Terminal (5 Cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-500" />
                Simulated Order Entry
              </h3>
              <div className="text-xs text-[var(--text-secondary)] font-medium">
                Cash: <strong className="text-emerald-500">${portfolio.cash.toFixed(2)}</strong>
              </div>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--bg-main)] p-1">
              <button
                onClick={() => setTradeSide('buy')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  tradeSide === 'buy'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                BUY ASSET
              </button>
              <button
                onClick={() => setTradeSide('sell')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  tradeSide === 'sell'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                SELL ASSET
              </button>
            </div>

            {/* Stock Search Input & Dropdown */}
            <div className="mt-4 relative">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
                Select Company or Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search ticker, company name (e.g. NVDA, RELIANCE)..."
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] py-2.5 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && (
                <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl divide-y divide-[var(--border-subtle)]">
                  {filteredSearchResults.map((s) => (
                    <div
                      key={s.ticker}
                      onClick={() => {
                        setSelectedStock(s);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 hover:bg-[var(--bg-card-hover)] cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{s.ticker}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">
                          {s.name} • {s.exchange}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[var(--text-primary)]">${s.price.toFixed(2)}</div>
                        <div
                          className={`text-[10px] ${
                            s.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {s.changePercent >= 0 ? '+' : ''}
                          {s.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Stock Highlight Card */}
            <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{selectedStock.ticker}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{selectedStock.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--text-primary)]">${currentMarketPrice.toFixed(2)}</div>
                  <div
                    className={`text-xs ${
                      selectedStock.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {selectedStock.changePercent >= 0 ? '+' : ''}
                    {selectedStock.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Exchange Status indicator for this stock */}
              <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  Exchange: <strong>{selectedStock.exchange}</strong>
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    currentStockSchedule.status === 'OPEN' ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      currentStockSchedule.status === 'OPEN' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {currentStockSchedule.statusLabel}
                </span>
              </div>
            </div>

            {/* Order Type Toggle (Market vs Limit) */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Order Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderType('market')}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                    orderType === 'market'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  Market Order
                </button>
                <button
                  onClick={() => {
                    setOrderType('limit');
                    if (!limitPriceInput) setLimitPriceInput(currentMarketPrice.toFixed(2));
                  }}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                    orderType === 'limit'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  Limit Order
                </button>
              </div>
            </div>

            {/* Limit Price Input (if limit order) */}
            {orderType === 'limit' && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
                  Target Limit Price (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    type="number"
                    step="0.01"
                    value={limitPriceInput}
                    onChange={(e) => setLimitPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500"
                    placeholder="Enter target limit price..."
                  />
                </div>
              </div>
            )}

            {/* Shares Quantity */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] mb-1">
                <span>Number of Shares</span>
                {tradeSide === 'sell' && (
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Owned: <strong>{existingHoldingForSelected?.shares || 0}</strong> shares
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={shareCount}
                onChange={(e) => setShareCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] py-2 px-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500"
              />

              {/* Quick Share Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[1, 5, 10, 25, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => setShareCount(num)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    +{num}
                  </button>
                ))}
                {tradeSide === 'buy' ? (
                  <button
                    onClick={() => {
                      const maxAffordable = Math.max(1, Math.floor((portfolio.cash - 2) / currentMarketPrice));
                      setShareCount(maxAffordable);
                    }}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500"
                  >
                    Max Buy
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (existingHoldingForSelected) setShareCount(existingHoldingForSelected.shares);
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-500"
                  >
                    All Shares
                  </button>
                )}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="mt-4 space-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/40 p-3 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Estimated Value:</span>
                <span className="font-semibold text-[var(--text-primary)]">${estimatedOrderValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Brokerage & Regulatory Fee:</span>
                <span>${estimatedFee.toFixed(2)}</span>
              </div>
              {orderType === 'market' && (
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Simulated Slippage (0.02%):</span>
                  <span>~${estimatedSlippage.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-[var(--border-subtle)] pt-1.5 flex justify-between font-bold text-sm text-[var(--text-primary)]">
                <span>{tradeSide === 'buy' ? 'Total Required Cash:' : 'Estimated Net Proceeds:'}</span>
                <span className={tradeSide === 'buy' ? 'text-emerald-500' : 'text-emerald-500'}>
                  ${tradeSide === 'buy' ? totalRequiredCash.toFixed(2) : estimatedNetProceeds.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Cash After Order:</span>
                <span>${remainingCashAfterTrade.toFixed(2)}</span>
              </div>
            </div>

            {/* Market Closed Notice */}
            {!currentStockSchedule.isOpenForTrading && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-500">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Exchange Closed ({currentStockSchedule.statusLabel}):</strong> This order will be queued as{' '}
                  <strong>Pending</strong> and execute when {currentStockSchedule.exchangeName} opens (
                  {currentStockSchedule.nextSessionText}).
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmittingOrder || (tradeSide === 'buy' && totalRequiredCash > portfolio.cash)}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-bold shadow-md transition-all ${
                tradeSide === 'buy'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50'
                  : 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50'
              }`}
            >
              {isSubmittingOrder
                ? 'Processing...'
                : tradeSide === 'buy'
                ? `Place Buy Order (${shareCount} ${selectedStock.ticker})`
                : `Place Sell Order (${shareCount} ${selectedStock.ticker})`}
            </button>
          </div>
        </div>
      </div>

      {/* 6. Reset Portfolio Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Reset Simulator Portfolio?</h3>
            </div>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              This will restore your starting balance to <strong className="text-emerald-500">$100,000.00 USD</strong> virtual
              cash. All open stock holdings, pending orders, and transaction history will be completely erased.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow"
              >
                Confirm Reset to $100,000
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
