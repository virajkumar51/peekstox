import React, { useState } from 'react';
import { StockQuote } from '../types';
import {
  BookmarkCheck,
  TrendingUp,
  TrendingDown,
  Trash2,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
} from 'lucide-react';
import { formatStockPrice, formatMarketCap } from '../utils/currency';

interface WatchlistViewProps {
  watchlist: string[];
  stocks: StockQuote[];
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
  onOpenSearch: () => void;
  onOpenAlertForStock: (ticker: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  stocks,
  baseCurrency,
  onSelectStock,
  onRemoveFromWatchlist,
  onOpenSearch,
  onOpenAlertForStock,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<'ticker' | 'change' | 'price' | 'marketCap'>('change');

  const watchedStocks = stocks
    .filter((s) => watchlist.includes(s.ticker))
    .filter((s) => {
      const q = filterQuery.toLowerCase();
      return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'change') return b.changePercent - a.changePercent;
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'marketCap') return b.marketCap - a.marketCap;
      return 0;
    });

  return (
    <div className="space-y-6 pb-28 sm:pb-32 animate-in fade-in duration-200">
      {/* Header */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <BookmarkCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Personal Watchlist & Workspace
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Monitoring {watchlist.length} saved equities across US and Indian exchanges
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stock to Watchlist</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4 text-xs">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter watchlist..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              <option value="change">Daily % Change</option>
              <option value="price">Current Price</option>
              <option value="marketCap">Market Cap</option>
              <option value="ticker">Ticker Symbol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Watchlist Grid / Table */}
      {watchedStocks.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-12 text-center">
          <BookmarkCheck className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40 mb-3" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Your Watchlist is Empty
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            Search for stocks like Apple, NVIDIA, Reliance, or Microsoft to add them to your monitor list.
          </p>
          <button
            onClick={onOpenSearch}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Explore Stocks
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider bg-[var(--bg-main)]/60">
                  <th className="py-3 px-4">Equity</th>
                  <th className="py-3 px-4">Exchange / Country</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">24h Change</th>
                  <th className="py-3 px-4">Market Cap</th>
                  <th className="py-3 px-4">Trend (7D)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50 tabular-nums">
                {watchedStocks.map((s) => {
                  const isPos = s.changePercent >= 0;
                  return (
                    <tr
                      key={s.ticker}
                      className="hover:bg-[var(--bg-main)]/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => onSelectStock(s.ticker)}
                          className="cursor-pointer group"
                        >
                          <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                            {s.ticker}
                          </span>
                          <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[160px]">
                            {s.name}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded bg-[var(--bg-main)] px-2 py-0.5 font-semibold text-[10px] text-[var(--text-secondary)] border border-[var(--border-color)]">
                          {s.exchange}
                        </span>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.country}</p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm text-[var(--text-primary)]">
                        {formatStockPrice(s.price, s.currency, baseCurrency)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            isPos ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isPos ? '+' : ''}{s.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                        {formatMarketCap(s.marketCap, s.currency)}
                      </td>

                      {/* Miniature Sparkline */}
                      <td className="py-3.5 px-4">
                        <div className="w-20 h-7">
                          <svg viewBox="0 0 80 25" className="w-full h-full">
                            <path
                              d={s.sparkline
                                .map((val, i) => {
                                  const min = Math.min(...s.sparkline);
                                  const max = Math.max(...s.sparkline);
                                  const x = (i / (s.sparkline.length - 1)) * 75 + 2;
                                  const y = 22 - ((val - min) / (max - min || 1)) * 18;
                                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                })
                                .join(' ')}
                              fill="none"
                              stroke={isPos ? '#00E599' : '#F43F5E'}
                              strokeWidth="1.8"
                            />
                          </svg>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAlertForStock(s.ticker)}
                            title="Set custom alert"
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-main)] transition-colors"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectStock(s.ticker)}
                            title="Research stock"
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveFromWatchlist(s.ticker)}
                            title="Remove from watchlist"
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-main)] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
