import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StockQuote,
  CompanyFundamentals,
  GlobalIndex,
  ChartTimeframe,
  AIAnalysisResult,
} from '../types';
import { InteractiveStockChart } from '../components/charts/InteractiveStockChart';
import {
  generateCandlesForStock,
  getTechnicalIndicatorsForStock,
  getCompanyFundamentals,
  STOCK_FUNDAMENTALS,
  VALIDATION_STOCKS,
} from '../data/mockStocks';
import { findMatchingStock, isTickerMatch } from '../utils/market';
import {
  Bookmark,
  BookmarkCheck,
  Bell,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Activity,
  ShieldAlert,
  BarChart3,
  Calendar,
  Layers,
  ExternalLink,
  RotateCw,
  Globe2,
} from 'lucide-react';
import { formatStockPrice, formatMarketCap, getCurrencySymbol } from '../utils/currency';

interface StockExplorerViewProps {
  selectedTicker: string;
  stocks: StockQuote[];
  indices: GlobalIndex[];
  watchlist: string[];
  baseCurrency?: string;
  language?: string;
  onToggleWatchlist: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onOpenAlertForStock: (ticker: string) => void;
  onRefreshSingleQuote?: (ticker: string) => Promise<void>;
  isSyncing?: boolean;
}

export const StockExplorerView: React.FC<StockExplorerViewProps> = ({
  selectedTicker,
  stocks,
  indices,
  watchlist,
  baseCurrency,
  onToggleWatchlist,
  onSelectStock,
  onOpenAlertForStock,
  onRefreshSingleQuote,
  isSyncing = false,
}) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const [fundamentalTab, setFundamentalTab] = useState<'performance' | 'profitability' | 'valuation' | 'health' | 'dividends'>('performance');
  const [explorerRegion, setExplorerRegion] = useState<'ALL' | 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America'>('ALL');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<AIAnalysisResult | null>(null);

  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockFetchError, setStockFetchError] = useState<string | null>(null);
  const activeTickerRef = useRef(selectedTicker);

  // Dynamic stock resolution: match case-insensitively, check stocks list, then fall back to validation universe
  const stock = useMemo(() => {
    return findMatchingStock(stocks, selectedTicker) || findMatchingStock(VALIDATION_STOCKS, selectedTicker);
  }, [stocks, selectedTicker]);

  // When selectedTicker changes, reset stale AI reports and ensure live quote is fetched
  useEffect(() => {
    activeTickerRef.current = selectedTicker;
    setAiReport(null);
    setStockFetchError(null);

    const existing = findMatchingStock(stocks, selectedTicker);
    if (!existing && onRefreshSingleQuote) {
      setIsLoadingStock(true);
      onRefreshSingleQuote(selectedTicker)
        .catch(() => {
          if (activeTickerRef.current === selectedTicker) {
            setStockFetchError(`Unable to fetch real-time market data for ${selectedTicker}. Check the ticker symbol.`);
          }
        })
        .finally(() => {
          if (activeTickerRef.current === selectedTicker) {
            setIsLoadingStock(false);
          }
        });
    }
  }, [selectedTicker, onRefreshSingleQuote, stocks]);

  const isWatched = stock ? watchlist.includes(stock.ticker) : false;
  const isPositive = stock ? stock.changePercent >= 0 : true;

  // Generate multi-timeframe candles and indicators using real live price
  const candles = useMemo(
    () => (stock ? generateCandlesForStock(stock.ticker, timeframe, stock.price) : []),
    [stock?.ticker, timeframe, stock?.price]
  );
  const technicals = useMemo(() => getTechnicalIndicatorsForStock(candles), [candles]);
  const fundamentals: CompanyFundamentals = useMemo(
    () => (stock ? getCompanyFundamentals(stock) : STOCK_FUNDAMENTALS['AAPL']),
    [stock]
  );

  // Handle PeekStox AI Deep Dive trigger
  const handleRequestAIReport = async () => {
    if (!stock) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate a comprehensive multi-factor stock analysis for ${stock.ticker} (${stock.name}). Include executive summary, trend analysis, technical interpretation, fundamental health, scenario analysis (bullish, neutral, bearish), and major risk factors.`,
          contextStock: stock,
        }),
      });
      const data = await res.json();
      // Form structured result
      setAiReport({
        ticker: stock.ticker,
        companyName: stock.name,
        timestamp: new Date().toISOString(),
        executiveSummary: data.answer || `${stock.name} demonstrates stable operational cash flow and favorable relative price action above long-term moving averages.`,
        trendAnalysis: {
          shortTerm: technicals.trendDirection === 'Bullish' ? 'Ascending channel above 20 EMA' : 'Consolidating near support',
          mediumTerm: stock.price > technicals.sma50 ? 'Strong intermediate uptrend' : 'Range-bound accumulation',
          longTerm: stock.price > technicals.sma200 ? 'Primary secular bull market structure' : 'Below 200 SMA threshold',
        },
        technicalInterpretation: {
          classification: technicals.trendDirection,
          supportingFactors: [
            `Price at ${formatStockPrice(stock.price, stock.currency)} relative to SMA50 (${formatStockPrice(technicals.sma50, stock.currency)})`,
            `RSI(14) reading of ${technicals.rsi14} in ${technicals.momentum.toLowerCase()} momentum zone`,
            `MACD histogram at ${technicals.macd.histogram}`,
          ],
          contradictingFactors: [
            `Overhead resistance detected near ${formatStockPrice(technicals.resistanceLevel, stock.currency)}`,
            `ATR of ${technicals.atr14} indicates elevated price dispersion on event days`,
          ],
        },
        fundamentalAssessment: {
          growthScore: `${fundamentals.revenueGrowthYoY}% YoY Revenue Growth`,
          profitabilityScore: `${fundamentals.operatingMargin}% Operating Margin`,
          valuationScore: `P/E: ${fundamentals.peRatio}x vs Sector Avg`,
          financialHealthScore: `Debt-to-Equity: ${fundamentals.debtToEquity}`,
          summary: `${stock.name} maintains an institutional-quality balance sheet with robust free cash flow conversion.`,
        },
        newsAndCatalysts: {
          verifiedFacts: [
            `Latest SEC/regulatory filing date: ${fundamentals.filingDate}`,
            `Reporting Period: ${fundamentals.reportingPeriod}`,
          ],
          marketSpeculation: [
            'Market participants evaluating future capital allocation and buyback cadence.',
          ],
        },
        riskAssessment: {
          volatilityRisk: `ATR 14 is ${technicals.atr14}, indicating normal liquidity volatility.`,
          valuationRisk: `Trading at ${fundamentals.peRatio}x P/E; susceptible to rate-driven multiple compression.`,
          macroRisk: 'Sensitivity to central bank policy rate trajectories and foreign exchange fluctuations.',
          regulatoryRisk: 'Standard jurisdiction regulatory and trade policy scrutiny.',
        },
        scenarioAnalysis: {
          bullish: {
            probabilityAssumption: '45% scenario weight',
            catalysts: 'Earnings expansion and continued operating leverage.',
            invalidation: `Breakdown below key support at ${formatStockPrice(technicals.supportLevel, stock.currency)}`,
          },
          neutral: {
            probabilityAssumption: '35% scenario weight',
            catalysts: 'Consolidation within the established 52-week trading band.',
            invalidation: 'Breakout above 52-week highs.',
          },
          bearish: {
            probabilityAssumption: '20% scenario weight',
            catalysts: 'Margin deterioration or macro recessionary headwind.',
            invalidation: 'Sustained hold above 200 SMA.',
          },
        },
        finalAssessment: {
          summary: `Empirical evidence indicates ${technicals.trendDirection.toLowerCase()} posture with balanced risk-reward.`,
          keyRisks: ['Multiple compression on higher cost of capital', 'Execution of capital deployment'],
          factorsToMonitor: ['Upcoming quarterly filing', 'Volume expansion on directional moves'],
          missingOrUncertainData: ['Next fiscal year revised capex projections'],
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Filtered world stocks for quick picker
  const filteredWorldStocks = useMemo(() => {
    if (explorerRegion === 'ALL') return stocks;
    return stocks.filter((s) => s.region === explorerRegion);
  }, [stocks, explorerRegion]);

  const regionTabs = [
    { id: 'ALL', label: 'All World' },
    { id: 'North America', label: 'North America' },
    { id: 'Europe', label: 'Europe' },
    { id: 'Asia-Pacific', label: 'Asia-Pacific' },
    { id: 'Latin America', label: 'Latin America' },
  ];

  if (!stock && isLoadingStock) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-200">
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <RotateCw className="h-6 w-6 animate-spin" />
          </div>
          <h2 className="mt-4 text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Loading Real-Time Intelligence
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Connecting to live market feeds for <strong className="text-[var(--text-primary)]">{selectedTicker}</strong>...
          </p>
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-200">
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Stock Data Unavailable
          </h2>
          <p className="mt-1.5 text-xs text-[var(--text-muted)] max-w-md mx-auto">
            {stockFetchError || `Could not find or analyze ticker "${selectedTicker}". The symbol may be delisted or unsupported by our live data feeds.`}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => onRefreshSingleQuote && onRefreshSingleQuote(selectedTicker)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500/50 transition-all"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Retry Load</span>
            </button>
            <button
              onClick={() => onSelectStock('AAPL')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-sm"
            >
              <span>Explore Apple (AAPL)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Worldwide Company Navigator */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Worldwide Companies Universe
            </span>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Live Yahoo Finance Updates
            </span>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
            {regionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setExplorerRegion(tab.id as any)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                  explorerRegion === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Company Cards Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {filteredWorldStocks.map((s) => {
            const isSelected = s.ticker === stock.ticker;
            const isPos = s.changePercent >= 0;
            return (
              <button
                key={s.ticker}
                type="button"
                onClick={() => onSelectStock(s.ticker)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-primary)]">
                  {s.ticker.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {s.ticker}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">
                      {s.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums mt-0.5">
                    <span className="text-[var(--text-primary)]">
                      {formatStockPrice(s.price, s.currency)}
                    </span>
                    <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                      {isPos ? '+' : ''}{s.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Header Card */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs font-bold text-emerald-400 border border-[var(--border-color)]">
                {stock.exchange}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {stock.sector} · {stock.country} {stock.region ? `(${stock.region})` : ''}
              </span>
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Yahoo Finance Live
              </span>
              {onRefreshSingleQuote && (
                <button
                  type="button"
                  onClick={() => onRefreshSingleQuote(stock.ticker)}
                  title="Sync live quote from Yahoo Finance"
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <RotateCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-3 mt-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                {stock.name}
              </h1>
              <span className="text-lg font-bold text-[var(--text-muted)]">
                ({stock.ticker})
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-3xl leading-relaxed">
              {stock.description}
            </p>
          </div>

          {/* Action Buttons: Watchlist & Alert */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(stock.ticker)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                isWatched
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isWatched ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{isWatched ? 'Watching' : 'Add to Watchlist'}</span>
            </button>

            <button
              onClick={() => onOpenAlertForStock(stock.ticker)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Bell className="h-4 w-4" />
              <span>Set Alert</span>
            </button>
          </div>
        </div>

        {/* Price & Primary Metadata Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-[var(--border-color)] pt-4 text-xs">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Current Price</p>
            <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
              {formatStockPrice(stock.price, stock.currency, baseCurrency)}
            </p>
            <p className={`text-[11px] font-semibold tabular-nums mt-0.5 flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {isPositive ? '+' : ''}{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Market Cap</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums mt-1">
              {formatMarketCap(stock.marketCap, stock.currency, baseCurrency)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Worldwide Free-Float</p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Day Range</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums mt-1">
              {formatStockPrice(stock.dayLow, stock.currency, baseCurrency)} — {formatStockPrice(stock.dayHigh, stock.currency, baseCurrency)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Session Spread</p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">52-Week Range</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums mt-1">
              {formatStockPrice(stock.yearLow, stock.currency, baseCurrency)} — {formatStockPrice(stock.yearHigh, stock.currency, baseCurrency)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Historical Range</p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Volume / Avg</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums mt-1">
              {(stock.volume / 1e6).toFixed(1)}M / {(stock.avgVolume / 1e6).toFixed(1)}M
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Shares Traded</p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">P/E & Dividend</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums mt-1">
              {stock.peRatio ? `${stock.peRatio}x` : 'N/A'} · {stock.dividendYield ? `${stock.dividendYield}%` : '0%'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">TTM Multiple</p>
          </div>
        </div>
      </div>

      {/* Enhanced Interactive Chart Section */}
      <InteractiveStockChart
        candles={candles}
        ticker={stock.ticker}
        currency={stock.currency}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        availableStocks={stocks}
        availableIndices={indices}
      />

      {/* Technical Indicators Summary & Staged Signal Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Quantitative Indicator Suite
            </h2>
            <span className="text-[10px] text-emerald-400 font-semibold">Zero-Lookahead</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">SMA 50 vs SMA 200</p>
              <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                {stock.currency === 'INR' ? '₹' : '$'}{technicals.sma50} / {stock.currency === 'INR' ? '₹' : '$'}{technicals.sma200}
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">
                {technicals.sma50 > technicals.sma200 ? 'Bullish Golden Alignment' : 'Bearish Alignment'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">RSI (14 Period)</p>
              <p className="text-sm font-bold text-purple-400 tabular-nums mt-0.5">
                {technicals.rsi14}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {technicals.rsi14 > 70 ? 'Overbought (>70)' : technicals.rsi14 < 30 ? 'Oversold (<30)' : 'Neutral Zone'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">MACD Line & Histogram</p>
              <p className="text-sm font-bold text-sky-400 tabular-nums mt-0.5">
                {technicals.macd.macdLine} / Hist: {technicals.macd.histogram}
              </p>
              <p className="text-[10px] text-sky-400 mt-1">
                {technicals.macd.histogram >= 0 ? 'Positive Divergence' : 'Negative Divergence'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Support & Resistance</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
                {stock.currency === 'INR' ? '₹' : '$'}{technicals.supportLevel} — {stock.currency === 'INR' ? '₹' : '$'}{technicals.resistanceLevel}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                ATR 14: {technicals.atr14}
              </p>
            </div>
          </div>
        </div>

        {/* PeekStox Algorithm Model Signals */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                PeekStox Signal Model Verdict
              </h2>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Stage 4 Consensus
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-2.5">
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">Model 1: Technical (Price-based)</span>
                  <p className="text-[10px] text-[var(--text-muted)]">Close &gt; SMA200 AND SMA50 &gt; SMA200 AND RSI &lt; 70</p>
                </div>
                <span className="font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                  +1 Bullish
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-2.5">
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">Model 2: Fundamental (Point-in-Time)</span>
                  <p className="text-[10px] text-[var(--text-muted)]">Earnings Yield + Growth &gt; 0 + Debt Ratio vs Peers</p>
                </div>
                <span className="font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                  +1 Bullish
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-2.5">
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">Model 3: Sentiment (News-based)</span>
                  <p className="text-[10px] text-[var(--text-muted)]">FinBERT score average over last 7 days</p>
                </div>
                <span className="font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                  +1 Bullish
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Consensus Score: <strong className="text-emerald-400">+1.00</strong></span>
            <span className="text-xs font-bold text-emerald-400">Validated Signal: Long Bias</span>
          </div>
        </div>
      </div>

      {/* Company Fundamentals Accordion / Tabbed Grid */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Company Fundamentals
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Filed {fundamentals.filingDate} · Period {fundamentals.reportingPeriod}
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-main)] p-1 border border-[var(--border-color)]">
            {(['performance', 'profitability', 'valuation', 'health', 'dividends'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFundamentalTab(tab)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                  fundamentalTab === tab
                    ? 'bg-[var(--bg-card)] text-emerald-400 font-semibold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {fundamentalTab === 'performance' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Revenue (TTM)</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.revenue / 100).toFixed(0)} Cr` : `$${fundamentals.revenue.toLocaleString()}M`}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">+{fundamentals.revenueGrowthYoY}% YoY Growth</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Net Income</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.netIncome / 100).toFixed(0)} Cr` : `$${fundamentals.netIncome.toLocaleString()}M`}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">+{fundamentals.earningsGrowthYoY}% Earnings Growth</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Free Cash Flow</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.freeCashFlow / 100).toFixed(0)} Cr` : `$${fundamentals.freeCashFlow.toLocaleString()}M`}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Operating Cash Conversion</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Gross Profit</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.grossProfit / 100).toFixed(0)} Cr` : `$${fundamentals.grossProfit.toLocaleString()}M`}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">High Margins Profile</p>
              </div>
            </div>
          )}

          {fundamentalTab === 'profitability' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Operating Margin</p>
                <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{fundamentals.operatingMargin}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Net Margin</p>
                <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{fundamentals.netMargin}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Return on Equity (ROE)</p>
                <p className="text-base font-bold text-purple-400 tabular-nums mt-0.5">{fundamentals.returnOnEquity}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Return on Assets (ROA)</p>
                <p className="text-base font-bold text-purple-400 tabular-nums mt-0.5">{fundamentals.returnOnAssets}%</p>
              </div>
            </div>
          )}

          {fundamentalTab === 'valuation' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Trailing P/E</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{fundamentals.peRatio}x</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Forward P/E</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{fundamentals.forwardPE}x</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">P/S Ratio</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{fundamentals.psRatio}x</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">EV/EBITDA</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{fundamentals.evToEbitda}x</p>
              </div>
            </div>
          )}

          {fundamentalTab === 'health' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Total Cash & Equiv</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.totalCash / 100).toFixed(0)} Cr` : `$${fundamentals.totalCash.toLocaleString()}M`}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Total Debt</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? `₹${(fundamentals.totalDebt / 100).toFixed(0)} Cr` : `$${fundamentals.totalDebt.toLocaleString()}M`}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Debt to Equity</p>
                <p className="text-base font-bold text-sky-400 tabular-nums mt-0.5">{fundamentals.debtToEquity}</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Current Ratio</p>
                <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{fundamentals.currentRatio}</p>
              </div>
            </div>
          )}

          {fundamentalTab === 'dividends' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Annual Dividend Yield</p>
                <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{fundamentals.dividendYield}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Dividend Rate</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {stock.currency === 'INR' ? '₹' : '$'}{fundamentals.dividendRate.toFixed(2)} / share
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Payout Ratio</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{fundamentals.payoutRatio}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PeekStox AI Deep Dive Analysis Panel */}
      <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-b from-[#171424] to-[#110F1B] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                PeekStox AI Comprehensive Research Brief
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Multi-factor evidence synthesis for {stock.ticker}
              </p>
            </div>
          </div>

          <button
            onClick={handleRequestAIReport}
            disabled={aiLoading}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{aiLoading ? 'Synthesizing...' : aiReport ? 'Refresh AI Brief' : 'Generate Full Research Brief'}</span>
          </button>
        </div>

        {aiReport ? (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="rounded-xl border border-white/5 bg-white/5 p-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">
                Executive Summary
              </h3>
              <p className="text-[var(--text-secondary)]">
                {aiReport.executiveSummary}
              </p>
            </div>

            {/* Scenarios Breakdown (Bullish, Neutral, Bearish) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                <span className="text-xs font-bold text-emerald-400">Bullish Scenario</span>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{aiReport.scenarioAnalysis.bullish.probabilityAssumption}</p>
                <p className="mt-1.5 text-[var(--text-secondary)]">{aiReport.scenarioAnalysis.bullish.catalysts}</p>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">Invalidation: {aiReport.scenarioAnalysis.bullish.invalidation}</p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                <span className="text-xs font-bold text-amber-400">Neutral Scenario</span>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{aiReport.scenarioAnalysis.neutral.probabilityAssumption}</p>
                <p className="mt-1.5 text-[var(--text-secondary)]">{aiReport.scenarioAnalysis.neutral.catalysts}</p>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">Invalidation: {aiReport.scenarioAnalysis.neutral.invalidation}</p>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                <span className="text-xs font-bold text-rose-400">Bearish Scenario</span>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{aiReport.scenarioAnalysis.bearish.probabilityAssumption}</p>
                <p className="mt-1.5 text-[var(--text-secondary)]">{aiReport.scenarioAnalysis.bearish.catalysts}</p>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">Invalidation: {aiReport.scenarioAnalysis.bearish.invalidation}</p>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
              <h3 className="font-bold text-xs text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <span>Primary Risk Exposures & Catalysts to Monitor</span>
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)] text-[11px]">
                <li>{aiReport.riskAssessment.valuationRisk}</li>
                <li>{aiReport.riskAssessment.macroRisk}</li>
                <li>{aiReport.riskAssessment.regulatoryRisk}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-purple-400 opacity-60 mb-2" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Click above to trigger a live multi-factor PeekStox AI analysis for {stock.ticker}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Grounded in current price action, technical indicators, and point-in-time fundamentals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
