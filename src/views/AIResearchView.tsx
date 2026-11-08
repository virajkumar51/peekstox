import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StockQuote } from '../types';
import {
  Sparkles,
  Send,
  User,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { formatStockPrice } from '../utils/currency';
import { MessageText } from '../components/MessageText';
import { findMatchingStock } from '../utils/market';
import { VALIDATION_STOCKS } from '../data/mockStocks';

interface AIResearchViewProps {
  stocks: StockQuote[];
  activeStockTicker: string;
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

export const AIResearchView: React.FC<AIResearchViewProps> = ({
  stocks,
  activeStockTicker,
  onSelectStock,
}) => {
  const [selectedTicker, setSelectedTicker] = useState(activeStockTicker || 'AAPL');

  useEffect(() => {
    if (activeStockTicker) {
      setSelectedTicker(activeStockTicker);
    }
  }, [activeStockTicker]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: `Welcome to **PeekStox AI Research Assistant**. I am configured to deliver rigorous, evidence-based financial intelligence grounded strictly in current market data, SEC filings, and quantitative indicators.\n\nHow can I assist your market research today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['PeekStox Technical Engine', 'Regulatory Filings'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentStock = useMemo(() => {
    return findMatchingStock(stocks, selectedTicker) || findMatchingStock(VALIDATION_STOCKS, selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

  useEffect(() => {
    const list = messagesContainerRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
      list.scrollLeft = 0;
    }
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          contextStock: currentStock,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Unable to generate response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [currentStock.ticker, 'Regulatory Filings'],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          content: 'A network error occurred while querying the PeekStox AI engine. Please verify connectivity or check the quantitative indicators directly.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    `Why has ${currentStock.ticker} moved recently?`,
    `What does ${currentStock.ticker}'s RSI(14) indicate about momentum?`,
    `How does ${currentStock.ticker}'s valuation compare to historical norms?`,
    `What evidence supports a bullish or bearish thesis for ${currentStock.ticker}?`,
    `Which key information or filings are missing from current analysis?`,
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden min-w-0 shadow-sm animate-in fade-in duration-200">
      {/* Top Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] px-5 py-3.5 bg-[var(--bg-main)]/50 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[var(--text-primary)] truncate">
              PeekStox AI Research Assistant
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              Strictly grounded in empirical financial data, filings, and quantitative indicators
            </p>
          </div>
        </div>

        {/* Stock Context Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--text-muted)] font-medium">Active Context:</span>
          <select
            value={selectedTicker}
            onChange={(e) => {
              setSelectedTicker(e.target.value);
              onSelectStock(e.target.value);
            }}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] focus:border-purple-500 focus:outline-none"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} — {s.name} ({formatStockPrice(s.price, s.currency)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Conversation Stream */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 min-w-0 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 mt-1">
                <Sparkles className="h-4 w-4" />
              </div>
            )}

            <div
              className={`min-w-0 max-w-[min(100%,48rem)] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-500 text-black font-medium'
                  : 'border border-[var(--border-color)] bg-[var(--bg-main)]/60 text-[var(--text-primary)]'
              }`}
            >
              <MessageText text={m.content} />

              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[var(--border-color)]/40 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)] min-w-0">
                  <span className="font-semibold uppercase tracking-wider shrink-0">Sources:</span>
                  {m.sources.map((src, i) => (
                    <span key={i} className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 border border-[var(--border-color)] truncate">
                      {src}
                    </span>
                  ))}
                  <span className="ml-auto tabular-nums shrink-0">{m.timestamp}</span>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 animate-pulse">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 px-4 py-3 text-xs text-[var(--text-muted)]">
              <span>PeekStox AI is evaluating financial metrics, technical indicators, and filings...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions Carousel */}
      <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]/30 px-4 py-2.5 min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] hscroll min-w-0">
          <span className="text-[var(--text-muted)] font-semibold shrink-0">Prompts:</span>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-[var(--text-secondary)] hover:border-purple-500/40 hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Composer Input Bar */}
      <div className="border-t border-[var(--border-color)] bg-[var(--bg-card)] p-3 sm:p-4 min-w-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 min-w-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask PeekStox AI about ${currentStock.ticker} financials, technicals, or scenarios...`}
            className="flex-1 min-w-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
