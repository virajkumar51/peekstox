import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Globe,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StockQuote } from '../types';
import { formatStockPrice } from '../utils/currency';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockQuote[];
  onSelectStock: (ticker: string) => void;
}

interface ExternalSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
  sector: string;
  industry: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  stocks,
  onSelectStock,
}) => {
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America'>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setExternalResults([]);
    }
  }, [isOpen]);

  // Debounced live Yahoo Finance search for ANY company in the world
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setExternalResults([]);
      setIsSearchingExternal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingExternal(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out tickers already in the local stocks list
          const existingTickers = new Set(stocks.map((s) => s.ticker.toUpperCase()));
          const newQuotes = (data.quotes || []).filter(
            (item: ExternalSearchResult) => !existingTickers.has(item.symbol.toUpperCase())
          );
          setExternalResults(newQuotes.slice(0, 8));
        }
      } catch (err) {
        console.warn('Global search lookup error:', err);
      } finally {
        setIsSearchingExternal(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, stocks]);

  if (!isOpen) return null;

  // Filter local stocks
  const filteredStocks = stocks.filter((s) => {
    const q = query.toLowerCase().trim();
    if (regionFilter !== 'ALL' && s.region && s.region !== regionFilter) {
      return false;
    }
    if (!q) return true;
    return (
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      s.exchange.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q)
    );
  });

  const totalResultsCount = filteredStocks.length + externalResults.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResultsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalResultsCount) % Math.max(1, totalResultsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredStocks.length) {
        const stock = filteredStocks[selectedIndex];
        if (stock) {
          onSelectStock(stock.ticker);
          onClose();
        }
      } else {
        const extIdx = selectedIndex - filteredStocks.length;
        const extItem = externalResults[extIdx];
        if (extItem) {
          onSelectStock(extItem.symbol);
          onClose();
        }
      }
    }
  };

  const regions = [
    { id: 'ALL', label: 'All World' },
    { id: 'North America', label: 'North America' },
    { id: 'Europe', label: 'Europe' },
    { id: 'Asia-Pacific', label: 'Asia-Pacific' },
    { id: 'Latin America', label: 'Latin America' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2.5 sm:p-6 md:p-16 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] my-auto sm:my-0"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-[var(--border-color)] px-3 sm:px-4 py-3 sm:py-3.5 bg-[var(--bg-main)]/60 gap-2 min-w-0">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search company, ticker, exchange worldwide..."
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {isSearchingExternal && (
            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setExternalResults([]);
              }}
              aria-label="Clear query"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline">ESC</span>
            <span className="sm:hidden font-sans font-semibold">Done</span>
          </button>
        </div>

        {/* Region Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border-color)]/60 bg-[var(--bg-card)] overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1 shrink-0">
            Region:
          </span>
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRegionFilter(r.id as any);
                setSelectedIndex(0);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                regionFilter === r.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border-color)]/40">
          {totalResultsCount === 0 && !isSearchingExternal ? (
            <div className="py-14 text-center">
              <Building2 className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40 mb-3" />
              <p className="text-base font-semibold text-[var(--text-primary)]">
                No immediate matches found for "{query}"
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-md mx-auto">
                Type any company name or stock symbol from any world exchange (NYSE, NASDAQ, LSE, Euronext, Frankfurt, Tokyo, HKEX, NSE, etc.)
              </p>
            </div>
          ) : (
            <>
              {/* Primary Curated Stocks */}
              {filteredStocks.map((stock, idx) => {
                const isSelected = idx === selectedIndex;
                const isPositive = stock.changePercent >= 0;
                return (
                  <div
                    key={stock.ticker}
                    onClick={() => {
                      onSelectStock(stock.ticker);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 transition-colors ${
                      isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-[var(--bg-card-hover)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]">
                        {stock.ticker.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {stock.ticker}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-sm">
                            {stock.name}
                          </span>
                          {stock.region && (
                            <span className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">
                              {stock.region}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                          <span className="font-medium text-[var(--text-secondary)]">{stock.exchange}</span>
                          <span>·</span>
                          <span>{stock.sector}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Globe className="h-3 w-3 inline text-emerald-400/80" />
                            {stock.country}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        {formatStockPrice(stock.price, stock.currency)}
                      </p>
                      <p
                        className={`flex items-center justify-end text-xs font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-0.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Dynamic Live Yahoo Finance Search Hits Worldwide */}
              {externalResults.length > 0 && (
                <div className="pt-2 mt-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Global Live Ticker Lookup (Worldwide via Yahoo Finance)</span>
                  </div>
                  {externalResults.map((item, i) => {
                    const globalIdx = filteredStocks.length + i;
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={`ext_${item.symbol}_${i}`}
                        onClick={() => {
                          onSelectStock(item.symbol);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 transition-colors ${
                          isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-[var(--bg-card-hover)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                            {item.symbol.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--text-primary)]">
                                {item.symbol}
                              </span>
                              <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-sm">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                              <span className="font-medium text-[var(--text-secondary)]">{item.exchange}</span>
                              <span>·</span>
                              <span>{item.sector}</span>
                              <span>·</span>
                              <span className="text-emerald-400 font-semibold">{item.quoteType}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-4">
                          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span>Connect Live</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Worldwide Market Coverage · Live Yahoo Finance Feed</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
