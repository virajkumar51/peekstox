import React, { useState } from 'react';
import { NewsItem, StockQuote } from '../types';
import {
  Newspaper,
  ExternalLink,
  Sparkles,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
} from 'lucide-react';

interface NewsCenterViewProps {
  news: NewsItem[];
  stocks: StockQuote[];
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
}

export const NewsCenterView: React.FC<NewsCenterViewProps> = ({
  news,
  stocks,
  onSelectStock,
}) => {
  const [selectedTickerFilter, setSelectedTickerFilter] = useState('ALL');
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState('ALL');

  const filteredNews = news.filter((item) => {
    if (selectedTickerFilter !== 'ALL' && !item.tickers.includes(selectedTickerFilter)) return false;
    if (selectedSentimentFilter !== 'ALL' && item.sentimentLabel !== selectedSentimentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-28 sm:pb-32 animate-in fade-in duration-200">
      {/* Header */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Financial News & Catalyst Center
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Editorial financial coverage with PeekStox AI impact analysis and verified source links
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Ticker Filter */}
            <select
              value={selectedTickerFilter}
              onChange={(e) => setSelectedTickerFilter(e.target.value)}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1.5 font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Equities</option>
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} ({s.name})
                </option>
              ))}
            </select>

            {/* Sentiment Filter */}
            <select
              value={selectedSentimentFilter}
              onChange={(e) => setSelectedSentimentFilter(e.target.value)}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1.5 font-semibold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Sentiments</option>
              <option value="Bullish">Bullish</option>
              <option value="Neutral">Neutral</option>
              <option value="Bearish">Bearish</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editorial News Feed */}
      <div className="space-y-4">
        {filteredNews.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-6 shadow-sm hover:border-[var(--border-hover)] transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)] mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{item.source}</span>
                <span>·</span>
                <span>{new Date(item.publishedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Ticker Tags */}
                {item.tickers.map((t) => (
                  <button
                    key={t}
                    onClick={() => onSelectStock(t)}
                    className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-primary)] hover:border-emerald-500 border border-[var(--border-color)] transition-colors"
                  >
                    ${t}
                  </button>
                ))}
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    item.sentimentLabel === 'Bullish'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : item.sentimentLabel === 'Bearish'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-zinc-700/30 text-[var(--text-muted)]'
                  }`}
                >
                  {item.sentimentLabel} ({item.sentimentScore > 0 ? '+' : ''}{item.sentimentScore.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
              >
                <span>{item.headline}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60 inline shrink-0" />
              </a>
            </h2>

            {/* Summary */}
            <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {item.summary}
            </p>

            {/* PeekStox AI Takeaway Card */}
            {item.aiTakeaway && (
              <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>PeekStox AI Impact Interpretation</span>
                </div>
                <p className="text-[var(--text-primary)]">
                  <strong>Why it matters:</strong> {item.aiTakeaway.whyItMatters}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1">
                  <span>
                    <strong>Sectors:</strong> {item.aiTakeaway.affectedSectors.join(', ')}
                  </span>
                  <span>·</span>
                  <span>
                    <strong>Status:</strong> {item.aiTakeaway.confirmedVsUncertain}
                  </span>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
