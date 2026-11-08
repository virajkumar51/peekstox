import React, { useState } from 'react';
import { StockQuote, CompanyFundamentals } from '../types';
import { STOCK_FUNDAMENTALS } from '../data/mockStocks';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatStockPrice, formatMarketCap } from '../utils/currency';

interface CompareViewProps {
  stocks: StockQuote[];
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({ stocks, baseCurrency, onSelectStock }) => {
  const [ticker1, setTicker1] = useState<string>('AAPL');
  const [ticker2, setTicker2] = useState<string>('MSFT');
  const [aiComparisonLoading, setAiComparisonLoading] = useState(false);
  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);

  const stock1 = stocks.find((s) => s.ticker === ticker1) || stocks[0];
  const stock2 = stocks.find((s) => s.ticker === ticker2) || stocks[1];

  const fund1 = STOCK_FUNDAMENTALS[stock1.ticker] || STOCK_FUNDAMENTALS['AAPL'];
  const fund2 = STOCK_FUNDAMENTALS[stock2.ticker] || STOCK_FUNDAMENTALS['MSFT'];

  const handleGenerateComparison = async () => {
    setAiComparisonLoading(true);
    try {
      const res = await fetch('/api/ai/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Provide a balanced, objective institutional comparison between ${stock1.name} (${stock1.ticker}) and ${stock2.name} (${stock2.ticker}). Compare valuation multiples (P/E: ${fund1.peRatio}x vs ${fund2.peRatio}x), revenue growth (${fund1.revenueGrowthYoY}% vs ${fund2.revenueGrowthYoY}%), operating margins (${fund1.operatingMargin}% vs ${fund2.operatingMargin}%), and balance sheet resilience. Discuss trade-offs without declaring a single universal winner.`,
          contextStock: stock1,
        }),
      });
      const data = await res.json();
      setAiSynthesis(data.answer || `Both ${stock1.ticker} and ${stock2.ticker} present distinct risk-adjusted investment profiles.`);
    } catch (err) {
      console.error(err);
    } finally {
      setAiComparisonLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32 animate-in fade-in duration-200">
      {/* Header */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Stock Comparison Workspace
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Side-by-side performance, fundamental ratios, and PeekStox AI multi-factor synthesis
              </p>
            </div>
          </div>

          {/* Selectors */}
          <div className="flex items-center gap-3">
            <select
              value={ticker1}
              onChange={(e) => setTicker1(e.target.value)}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </select>

            <span className="text-xs font-bold text-[var(--text-muted)]">VS</span>

            <select
              value={ticker2}
              onChange={(e) => setTicker2(e.target.value)}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Company 1 Card */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase">Primary Asset</span>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {stock1.name} ({stock1.ticker})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{stock1.sector} · {stock1.exchange}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                {formatStockPrice(stock1.price, stock1.currency, baseCurrency)}
              </p>
              <p className={`text-xs font-bold tabular-nums ${stock1.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stock1.changePercent >= 0 ? '+' : ''}{stock1.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Market Capitalization</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                {formatMarketCap(stock1.marketCap, stock1.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">P/E Multiple (TTM)</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund1.peRatio}x</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Forward P/E Multiple</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund1.forwardPE}x</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Revenue Growth (YoY)</span>
              <span className="font-semibold text-emerald-400 tabular-nums">+{fund1.revenueGrowthYoY}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Operating Margin</span>
              <span className="font-semibold text-emerald-400 tabular-nums">{fund1.operatingMargin}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Return on Equity (ROE)</span>
              <span className="font-semibold text-purple-400 tabular-nums">{fund1.returnOnEquity}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Debt to Equity Ratio</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund1.debtToEquity}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--text-muted)]">Dividend Yield</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund1.dividendYield}%</span>
            </div>
          </div>

          <button
            onClick={() => onSelectStock(stock1.ticker)}
            className="w-full rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500/40 transition-colors"
          >
            Open Full {stock1.ticker} Explorer
          </button>
        </div>

        {/* Company 2 Card */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase">Comparison Asset</span>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {stock2.name} ({stock2.ticker})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{stock2.sector} · {stock2.exchange}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                {formatStockPrice(stock2.price, stock2.currency, baseCurrency)}
              </p>
              <p className={`text-xs font-bold tabular-nums ${stock2.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stock2.changePercent >= 0 ? '+' : ''}{stock2.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Market Capitalization</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                {formatMarketCap(stock2.marketCap, stock2.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">P/E Multiple (TTM)</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund2.peRatio}x</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Forward P/E Multiple</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund2.forwardPE}x</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Revenue Growth (YoY)</span>
              <span className="font-semibold text-emerald-400 tabular-nums">+{fund2.revenueGrowthYoY}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Operating Margin</span>
              <span className="font-semibold text-emerald-400 tabular-nums">{fund2.operatingMargin}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Return on Equity (ROE)</span>
              <span className="font-semibold text-purple-400 tabular-nums">{fund2.returnOnEquity}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
              <span className="text-[var(--text-muted)]">Debt to Equity Ratio</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund2.debtToEquity}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--text-muted)]">Dividend Yield</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{fund2.dividendYield}%</span>
            </div>
          </div>

          <button
            onClick={() => onSelectStock(stock2.ticker)}
            className="w-full rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500/40 transition-colors"
          >
            Open Full {stock2.ticker} Explorer
          </button>
        </div>
      </div>

      {/* PeekStox AI Comparison Synthesis Panel */}
      <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-b from-[#171424] to-[#110F1B] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                PeekStox AI Comparative Synthesis
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Objective analysis of trade-offs, strengths, and risk profiles
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateComparison}
            disabled={aiComparisonLoading}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{aiComparisonLoading ? 'Synthesizing...' : aiSynthesis ? 'Regenerate Analysis' : `Compare ${stock1.ticker} vs ${stock2.ticker}`}</span>
          </button>
        </div>

        {aiSynthesis ? (
          <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
            {aiSynthesis}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-purple-400 opacity-60 mb-2" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Click above to synthesize an AI-powered comparative evaluation
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Weighs growth vs valuation, margins, balance sheet health, and sensitivity to macroeconomic trends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
