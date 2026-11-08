import React, { useState } from 'react';
import { GlobalIndex, StockQuote } from '../types';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Activity,
  Layers,
  Building2,
  Sparkles,
} from 'lucide-react';
import { WORLD_EXCHANGES, getExchangeStatus, formatStockPrice, formatMarketCap } from '../utils/currency';

interface MarketOverviewViewProps {
  indices: GlobalIndex[];
  stocks?: StockQuote[];
  baseCurrency?: string;
  language?: string;
  onSelectStock?: (ticker: string) => void;
}

export const MarketOverviewView: React.FC<MarketOverviewViewProps> = ({
  indices,
  stocks = [],
  baseCurrency,
  onSelectStock,
}) => {
  const regions = [
    { id: 'ALL', label: 'All Global Indices' },
    { id: 'US', label: 'United States' },
    { id: 'IN', label: 'India (NSE/BSE)' },
    { id: 'EU', label: 'Europe' },
    { id: 'ASIA', label: 'Asia-Pacific' },
  ];
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [stockRegionFilter, setStockRegionFilter] = useState<'ALL' | 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America'>('ALL');

  const filteredIndices = indices.filter((i) => {
    if (selectedRegion === 'ALL') return true;
    return i.region === selectedRegion;
  });

  const filteredStocks = stocks.filter((s) => {
    if (stockRegionFilter === 'ALL') return true;
    return s.region === stockRegionFilter;
  });

  // Calculate live exchange statuses
  const exchangeStatuses = WORLD_EXCHANGES.map((ex) => getExchangeStatus(ex));

  return (
    <div className="space-y-6 pb-28 sm:pb-32 animate-in fade-in duration-200">
      {/* Header */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  Worldwide Market Intelligence
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Live Yahoo Finance Feed
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Real-time stock prices, world exchange clocks, global indices, and cross-border equities
              </p>
            </div>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[var(--bg-main)] p-1 border border-[var(--border-color)]">
            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedRegion === r.id
                    ? 'bg-[var(--bg-card)] text-emerald-400 shadow-sm font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* World Exchange Trading Sessions & Clocks */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Global Stock Exchanges · Live Session Clocks
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Synchronized to UTC
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {exchangeStatuses.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="font-bold text-[var(--text-primary)] text-xs">
                  {ex.city}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${ex.statusColor}`}
                >
                  {ex.status === 'Open' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {ex.status}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] truncate mb-2">
                {ex.id}
              </p>
              <div className="border-t border-[var(--border-color)]/60 pt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)] font-mono">{ex.localTime}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">Local</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Benchmark Indices Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            World Benchmark Equity Indices
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredIndices.map((idx) => {
            const isPos = idx.changePercent >= 0;
            return (
              <div
                key={idx.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm hover:border-[var(--border-hover)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {idx.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        idx.status === 'Open' || idx.status === 'Live'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-700/30 text-[var(--text-muted)]'
                      }`}
                    >
                      {idx.status}
                    </span>
                  </div>

                  <p className="text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                    {idx.value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`flex items-center text-xs font-bold tabular-nums ${
                        isPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPos ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {isPos ? '+' : ''}{idx.change.toFixed(1)} ({isPos ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* Miniature Sparkline */}
                <div className="my-3 h-10 w-full">
                  <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                    <path
                      d={idx.sparkline
                        .map((val, i) => {
                          const min = Math.min(...idx.sparkline);
                          const max = Math.max(...idx.sparkline);
                          const x = (i / (idx.sparkline.length - 1)) * 95 + 2;
                          const y = 26 - ((val - min) / (max - min || 1)) * 22;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke={isPos ? '#00E599' : '#F43F5E'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="border-t border-[var(--border-color)]/50 pt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span className="font-mono">{idx.symbol}</span>
                  <span>{idx.lastUpdated.split(' ')[1] || idx.lastUpdated}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Worldwide Companies Directory with Live Updates */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Top Worldwide Companies · Live Stock Quotes & Market Caps
            </h3>
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
              {filteredStocks.length} Companies Tracked
            </span>
          </div>

          {/* Regional Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
            {(['ALL', 'North America', 'Europe', 'Asia-Pacific', 'Latin America'] as const).map((reg) => (
              <button
                key={reg}
                onClick={() => setStockRegionFilter(reg)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                  stockRegionFilter === reg
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {reg === 'ALL' ? 'All Continents' : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Worldwide Equities Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="pb-3 pl-3">Company</th>
                <th className="pb-3">Exchange & Country</th>
                <th className="pb-3 text-right">Live Price</th>
                <th className="pb-3 text-right">Day Change</th>
                <th className="pb-3 text-right">Market Cap</th>
                <th className="pb-3 text-right">Volume</th>
                <th className="pb-3 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/40">
              {filteredStocks.map((stock) => {
                const isPos = stock.changePercent >= 0;
                return (
                  <tr
                    key={stock.ticker}
                    className="hover:bg-[var(--bg-card-hover)] transition-colors group cursor-pointer"
                    onClick={() => onSelectStock && onSelectStock(stock.ticker)}
                  >
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] font-bold text-xs text-[var(--text-primary)]">
                          {stock.ticker.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                              {stock.ticker}
                            </span>
                            {stock.region && (
                              <span className="hidden sm:inline-block rounded px-1.5 py-0.2 text-[9px] bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">
                                {stock.region}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[160px] sm:max-w-xs">
                            {stock.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-[var(--text-secondary)]">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">{stock.exchange}</span>
                        <p className="text-[11px] text-[var(--text-muted)]">{stock.country} · {stock.sector}</p>
                      </div>
                    </td>

                    <td className="py-3 text-right font-bold text-sm text-[var(--text-primary)] tabular-nums">
                      {formatStockPrice(stock.price, stock.currency, baseCurrency)}
                    </td>

                    <td className="py-3 text-right font-semibold tabular-nums">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold ${
                          isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-3 text-right font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatMarketCap(stock.marketCap, stock.currency)}
                    </td>

                    <td className="py-3 text-right text-[var(--text-muted)] tabular-nums">
                      {(stock.volume / 1e6).toFixed(1)}M
                    </td>

                    <td className="py-3 pr-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStock) onSelectStock(stock.ticker);
                        }}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-all"
                      >
                        Explore
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Macro Indicators & Market Breadth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">CBOE Volatility Index</span>
            <span className="text-emerald-400 font-bold">VIX</span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">14.85</p>
          <p className="text-[11px] text-emerald-400 font-medium">Low Volatility Regime (&lt; 20 threshold)</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">US 10-Year Treasury</span>
            <span className="text-sky-400 font-bold">TNX</span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">4.02%</p>
          <p className="text-[11px] text-[var(--text-secondary)]">Consolidating near neutral real yield band</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Brent Crude Oil</span>
            <span className="text-amber-400 font-bold">BRENT</span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">$74.40</p>
          <p className="text-[11px] text-emerald-400 font-medium">+0.8% Weekly Spread</p>
        </div>
      </div>
    </div>
  );
};
