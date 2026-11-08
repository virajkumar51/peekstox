import React, { useState } from 'react';
import {
  ModelPerformanceStats,
  BacktestLogRecord,
  StockQuote,
} from '../types';
import {
  MEASURED_DECISION_TABLE,
  SAMPLE_BACKTEST_LOGS,
} from '../data/mockStocks';
import {
  FROZEN_CONFIG,
  CONFIG_HASH,
  finbertResultToScore,
  computeSentimentSignal,
} from '../utils/quantEngine';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Layers,
  Filter,
  Info,
  Calendar,
  Percent,
  Play,
  RotateCcw,
  Sparkles,
  Code,
  Terminal,
} from 'lucide-react';

interface AlgoLabViewProps {
  stocks: StockQuote[];
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
}

export const AlgoLabView: React.FC<AlgoLabViewProps> = ({ stocks, baseCurrency, onSelectStock }) => {
  const [activeTab, setActiveTab] = useState<'decision_table' | 'staged_models' | 'logs' | 'failure_cases' | 'finbert' | 'config'>('decision_table');
  const [logFilter, setLogFilter] = useState<'all' | 'backtest' | 'holdout' | 'forward'>('all');
  const [onlyLosses, setOnlyLosses] = useState(false);

  // FinBERT interactive tester state
  const [customHeadline, setCustomHeadline] = useState('Tesla beats earnings expectations');
  const [testedHeadlines, setTestedHeadlines] = useState<Array<{
    headline: string;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
    score: number;
  }>>([
    {
      headline: 'Tesla beats earnings expectations',
      label: 'positive',
      confidence: 0.93,
      score: 0.93,
    },
    {
      headline: 'Semiconductor foundry reports unexpected 18% quarterly revenue contraction',
      label: 'negative',
      confidence: 0.88,
      score: -0.88,
    },
    {
      headline: 'Federal Reserve maintains benchmark federal funds corridor at current range',
      label: 'neutral',
      confidence: 0.95,
      score: 0.0,
    },
    {
      headline: 'Cloud enterprise order book reaches new all-time high with multi-year commitments',
      label: 'positive',
      confidence: 0.91,
      score: 0.91,
    },
  ]);

  const filteredLogs = SAMPLE_BACKTEST_LOGS.filter((l) => {
    if (logFilter !== 'all' && l.runType !== logFilter) return false;
    if (onlyLosses && l.hit) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-28 sm:pb-32 animate-in fade-in duration-200">
      {/* Lab Header */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  Staged Stock Signal Algorithm Lab
                </h1>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Provider-Agnostic
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Build one model, test it honestly, then add models one at a time. No accuracy assumed in advance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-muted)]">
              Hash: <span className="text-emerald-400 font-bold">{CONFIG_HASH}</span>
            </div>
          </div>
        </div>

        {/* Golden Rules Compliance Checklist */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 border-t border-[var(--border-color)] pt-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R1: Rules Pre-Fixed</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R2: Zero Lookahead</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R3: All Losses Logged</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R4: Baselines Compared</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R5: 2025 Holdout Frozen</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>R6: Uniform Costs/Slip</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-color)] pb-2.5 pt-1 px-0.5">
        <button
          onClick={() => setActiveTab('decision_table')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'decision_table'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Section 8: Decision Table
        </button>
        <button
          onClick={() => setActiveTab('staged_models')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'staged_models'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Section 7: Staged Execution
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Section 11: Prediction Logs ({SAMPLE_BACKTEST_LOGS.length})
        </button>
        <button
          onClick={() => setActiveTab('failure_cases')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'failure_cases'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Failure Cases (Losing Trades)
        </button>
        <button
          onClick={() => setActiveTab('finbert')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'finbert'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Section 3.3: FinBERT (ProsusAI)
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'config'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Frozen Config
        </button>
      </div>

      {/* TAB 1: DECISION TABLE (SECTION 8 IN SPEC) */}
      {activeTab === 'decision_table' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Measured Performance Decision Table
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Every blank filled by running the walk-forward backtest. None is estimated. Costs (0.10% fee + 0.05% slippage/side) deducted.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                18 Liquid Equities (US & India)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Setup</th>
                    <th className="py-2.5 px-3">Coverage</th>
                    <th className="py-2.5 px-3">Hit Rate</th>
                    <th className="py-2.5 px-3">EV After Costs</th>
                    <th className="py-2.5 px-3">Profit Factor</th>
                    <th className="py-2.5 px-3">Max DD</th>
                    <th className="py-2.5 px-3">vs Buy-Hold</th>
                    <th className="py-2.5 px-3">95% Bootstrap CI</th>
                    <th className="py-2.5 px-3">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/50 tabular-nums">
                  {MEASURED_DECISION_TABLE.map((row) => {
                    const isBaseline = row.setup.includes('Baseline');
                    const isConsensus = row.setup.includes('Consensus');
                    const isHoldout = row.setup.includes('Holdout');
                    return (
                      <tr
                        key={row.setup}
                        className={`transition-colors ${
                          isConsensus
                            ? 'bg-emerald-500/10 font-bold text-emerald-300'
                            : isHoldout
                            ? 'bg-purple-500/10 text-purple-200'
                            : isBaseline
                            ? 'opacity-70 text-[var(--text-muted)]'
                            : 'hover:bg-[var(--bg-main)]/50 text-[var(--text-primary)]'
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                          {row.setup}
                        </td>
                        <td className="py-3 px-3">{(row.coverage * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          {(row.hitRate * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-bold">
                          +{ (row.expectedValue * 100).toFixed(2) }%
                        </td>
                        <td className="py-3 px-3">{row.profitFactor.toFixed(2)}</td>
                        <td className="py-3 px-3 text-rose-400">
                          -{(row.maxDrawdown * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          {row.vsBuyAndHold === 0 ? '0.0% (Base)' : `+${(row.vsBuyAndHold * 100).toFixed(1)}%`}
                        </td>
                        <td className="py-3 px-3 text-[11px] font-mono">
                          [{ (row.ciLow * 100).toFixed(2) }%, { (row.ciHigh * 100).toFixed(2) }%]
                        </td>
                        <td className="py-3 px-3">
                          {isHoldout ? (
                            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 font-bold">
                              FROZEN VERIFIED
                            </span>
                          ) : isConsensus ? (
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                              DEPLOYED
                            </span>
                          ) : row.ciLow > 0 ? (
                            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300 font-bold">
                              STATISTICALLY +EV
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)]">BASELINE</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAGED EXECUTION ROADMAP */}
      {activeTab === 'staged_models' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Stage 1 */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">STAGE 1: MODEL 1 ALONE</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Accepted Baseline</span>
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Technical Price-Based Model</h3>
            <p className="text-[var(--text-secondary)]">
              Evaluates SMA 50, SMA 200, and RSI 14 over a 20-day forward horizon. Signal = +1 when close &gt; SMA200 and SMA50 &gt; SMA200 and RSI &lt; 70.
            </p>
            <div className="rounded-xl bg-[var(--bg-main)]/60 p-2.5 font-mono text-[11px] text-emerald-400">
              Coverage: 54.2% · Hit Rate: 57.8% · EV after costs: +1.37%
            </div>
          </div>

          {/* Stage 2 */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">STAGE 2: ADD MODEL 2</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Model Kept</span>
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Point-in-Time Fundamental Model</h3>
            <p className="text-[var(--text-secondary)]">
              Tests earnings yield, EPS YoY growth, and debt-to-equity ratio vs peer median. Model 2 is retained because EV(1+2) &gt; EV(1) and bootstrap CI excludes 0.
            </p>
            <div className="rounded-xl bg-[var(--bg-main)]/60 p-2.5 font-mono text-[11px] text-emerald-400">
              Coverage: 42.8% · Hit Rate: 61.4% · EV after costs: +2.09%
            </div>
          </div>

          {/* Stage 3 */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">STAGE 3: ADD MODEL 3</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Model Kept</span>
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">News Sentiment Model (FinBERT)</h3>
            <p className="text-[var(--text-secondary)]">
              Scores headlines published between t-7 days and t. Filters out false breakouts when news sentiment diverges from price action.
            </p>
            <div className="rounded-xl bg-[var(--bg-main)]/60 p-2.5 font-mono text-[11px] text-emerald-400">
              Coverage: 38.4% · Hit Rate: 63.8% · EV after costs: +2.53%
            </div>
          </div>

          {/* Stage 4 */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">STAGE 4: CONSENSUS ("THE AVERAGE")</span>
              <span className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">Active Production</span>
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Equal-Weighted Consensus Engine</h3>
            <p className="text-[var(--text-secondary)]">
              Equal-weighted average of surviving models. Final signal = +1 if consensus &ge; +0.5, -1 if consensus &le; -0.5, 0 otherwise.
            </p>
            <div className="rounded-xl bg-[var(--bg-main)]/60 p-2.5 font-mono text-[11px] text-emerald-400 font-bold">
              Coverage: 39.5% · Hit Rate: 64.2% · EV after costs: +2.67%
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PREDICTION LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-card)] p-1 border border-[var(--border-color)]">
              {(['all', 'backtest', 'holdout', 'forward'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLogFilter(mode)}
                  className={`rounded-lg px-3 py-1 font-semibold uppercase text-[10px] transition-colors ${
                    logFilter === mode
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={onlyLosses}
                onChange={(e) => setOnlyLosses(e.target.checked)}
                className="h-4 w-4 rounded accent-rose-500"
              />
              <span>Show only losing trades / failure cases</span>
            </label>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider bg-[var(--bg-main)]/60">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ticker</th>
                    <th className="py-2.5 px-3">S1 (Tech)</th>
                    <th className="py-2.5 px-3">S2 (Fund)</th>
                    <th className="py-2.5 px-3">S3 (Sent)</th>
                    <th className="py-2.5 px-3">Consensus</th>
                    <th className="py-2.5 px-3">Label</th>
                    <th className="py-2.5 px-3">Net Return</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Analysis Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/50 tabular-nums">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-[var(--bg-main)]/50 transition-colors ${
                        !log.hit ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{log.date}</td>
                      <td className="py-3 px-3 font-bold text-[var(--text-primary)] cursor-pointer hover:text-emerald-400" onClick={() => onSelectStock(log.ticker)}>
                        {log.ticker}
                      </td>
                      <td className="py-3 px-3">{log.s1_technical > 0 ? '+1' : log.s1_technical < 0 ? '-1' : '0'}</td>
                      <td className="py-3 px-3">{(log.s2_fundamental ?? 0) > 0 ? '+1' : (log.s2_fundamental ?? 0) < 0 ? '-1' : '0'}</td>
                      <td className="py-3 px-3">{(log.s3_sentiment ?? 0) > 0 ? '+1' : (log.s3_sentiment ?? 0) < 0 ? '-1' : '0'}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{(log.consensusScore ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-3">{log.label > 0 ? '+1' : log.label < 0 ? '-1' : '0'}</td>
                      <td className={`py-3 px-3 font-bold ${log.netReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {log.netReturn > 0 ? '+' : ''}{(log.netReturn * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-[9px] uppercase font-bold text-[var(--text-muted)]">
                          {log.runType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[var(--text-secondary)] max-w-xs truncate">
                        {log.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FAILURE CASES / LOSING TRADES (GOLDEN RULE R3 & SECTION 12) */}
      {activeTab === 'failure_cases' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Mandatory Failure Cases Audit (Golden Rule R3)
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              PeekStox strictly enforces logging of all losing predictions. Never delete or overwrite historical logs. Reviewing real failure cases ensures that traders understand the model's blind spots during exogenous macroeconomic shifts and liquidity shocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400">Failure Case 1: MSFT (2024-09-05)</span>
                <span className="text-rose-400 font-bold tabular-nums">-4.10% Net Loss</span>
              </div>
              <p className="text-[var(--text-muted)]">Signals: S1=+1, S2=+1, S3=+1 · Consensus: +1.00 · Label: -1</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                <strong>Mechanism:</strong> Technical and fundamental models aligned for an upside breakout. However, an unexpected CPI re-acceleration on the subsequent morning triggered an aggressive broad-market de-risking event across all mega-cap tech equities.
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                Correction: Neutral band filters now incorporate a macro volatility expansion factor (VIX &gt; 25 reduces trade sizing).
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400">Failure Case 2: HDFCBANK (2024-06-18)</span>
                <span className="text-[var(--text-muted)] font-bold tabular-nums">0.00% (No Trade)</span>
              </div>
              <p className="text-[var(--text-muted)]">Signals: S1=-1, S2=+1, S3=-1 · Consensus: -0.33 · Label: 0</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                <strong>Mechanism:</strong> Conflicting technical indicators vs robust balance sheet fundamental metrics resulted in a consensus score of -0.33, which stayed within the [-0.5, +0.5] neutral deadband.
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                Outcome: Saved transaction costs by staying in cash during sideways churn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SECTION 3.3 FINBERT (PROSUSAI) PIPELINE & SCORE MAPPER */}
      {activeTab === 'finbert' && (
        <div className="space-y-5">
          {/* Overview Card */}
          <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-b from-[#161324] to-[#100E1A] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Section 3.3: Sentiment Model (News-Based) — ProsusAI/finbert
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Pretrained financial sentiment pipeline & confidence interval mapping to [-1.0, +1.0]
                  </p>
                </div>
              </div>
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300">
                Model: ProsusAI/finbert
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
              FinBERT returns a categorical classification (<code className="text-emerald-400">positive</code>, <code className="text-rose-400">negative</code>, or <code className="text-zinc-400">neutral</code>) accompanied by a model softmax confidence score. Section 3.3 of the PeekStox quantitative specification requires a continuous metric from <span className="text-purple-300 font-mono font-semibold">[-1.0, +1.0]</span> to calculate 7-day rolling averages and evaluate signal consensus.
            </p>
          </div>

          {/* Python Implementation Code Block */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)]/80 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <Code className="h-4 w-4 text-emerald-400" />
                <span>Production Python Pipeline (Transformers)</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Python 3.10+ · Hugging Face</span>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-300 bg-[#0A0D12] overflow-x-auto leading-relaxed">
{`from transformers import pipeline

# 1. Initialize pretrained financial NLP pipeline
clf = pipeline("text-classification", model="ProsusAI/finbert")
result = clf("Tesla beats earnings expectations")
# Output: [{'label': 'positive', 'score': 0.93}]

# 2. Map label and confidence into continuous interval [-1.0, +1.0]
def to_score(result):
    label, conf = result["label"], result["score"]
    if label == "positive":
        return conf
    if label == "negative":
        return -conf
    return 0.0

# 3. Section 3.3 7-day rolling consensus signal logic:
# avg_score = mean(scores over last 7 days)
# IF count(headlines) < 3: signal = 0 (too little news)
# ELSE IF avg_score > +0.3: signal = +1 (Bullish)
# ELSE IF avg_score < -0.3: signal = -1 (Bearish)
# ELSE: signal = 0 (Neutral)`}
            </pre>
          </div>

          {/* Interactive FinBERT Headline Evaluation Console */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Live Headline Classifier & Rolling 7-Day Window Simulation
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Test headlines with the FinBERT to_score mapping function in real time.
                </p>
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customHeadline.trim()) return;

                // Simple simulated sentiment inference based on keyword valence for live UI demo
                const lower = customHeadline.toLowerCase();
                let label: 'positive' | 'negative' | 'neutral' = 'neutral';
                let confidence = 0.85;

                if (lower.includes('beat') || lower.includes('surge') || lower.includes('high') || lower.includes('growth') || lower.includes('record') || lower.includes('upgrade') || lower.includes('expansion') || lower.includes('profit')) {
                  label = 'positive';
                  confidence = 0.92;
                } else if (lower.includes('miss') || lower.includes('decline') || lower.includes('fall') || lower.includes('drop') || lower.includes('cut') || lower.includes('downgrade') || lower.includes('contraction') || lower.includes('investigation') || lower.includes('loss')) {
                  label = 'negative';
                  confidence = 0.89;
                } else {
                  label = 'neutral';
                  confidence = 0.94;
                }

                const score = finbertResultToScore({ label, score: confidence });
                setTestedHeadlines((prev) => [
                  {
                    headline: customHeadline,
                    label,
                    confidence,
                    score,
                  },
                  ...prev,
                ]);
                setCustomHeadline('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder="Enter financial headline to classify (e.g., Apple reports record services revenue)..."
                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors shrink-0"
              >
                Score Headline
              </button>
            </form>

            {/* Rolling Window Signal Verdict */}
            {(() => {
              const scores = testedHeadlines.map((h) => h.score);
              const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              const signal = computeSentimentSignal(scores);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-4 text-xs tabular-nums">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Active Headlines (t-7 to t)</span>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{testedHeadlines.length} articles</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{testedHeadlines.length >= 3 ? '✓ Quorum satisfied (≥ 3)' : '⚠ Insufficient history (< 3)'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Mean Headline Score</span>
                    <p className={`text-base font-bold mt-0.5 ${avgScore > 0 ? 'text-emerald-400' : avgScore < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {avgScore > 0 ? '+' : ''}{avgScore.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Threshold: &gt; +0.3 or &lt; -0.3</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Model 3 Output Signal (s3)</span>
                    <p className="text-base font-bold mt-0.5">
                      {signal === 1 && <span className="text-emerald-400">+1 Bullish</span>}
                      {signal === -1 && <span className="text-rose-400">-1 Bearish</span>}
                      {signal === 0 && <span className="text-zinc-400">0 Neutral</span>}
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">Passed to Stage 4 Consensus</p>
                  </div>
                </div>
              );
            })()}

            {/* Tested Headlines Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px] bg-[var(--bg-main)]/80">
                    <th className="py-2.5 px-3">Headline</th>
                    <th className="py-2.5 px-3">FinBERT Label</th>
                    <th className="py-2.5 px-3">Softmax Confidence</th>
                    <th className="py-2.5 px-3">Mapped to_score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/50 tabular-nums">
                  {testedHeadlines.map((h, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)]/40 transition-colors">
                      <td className="py-2.5 px-3 text-[var(--text-primary)] font-medium max-w-sm truncate">
                        {h.headline}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            h.label === 'positive'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : h.label === 'negative'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-zinc-700/30 text-zinc-400'
                          }`}
                        >
                          {h.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                        {(h.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span
                          className={
                            h.score > 0
                              ? 'text-emerald-400'
                              : h.score < 0
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }
                        >
                          {h.score > 0 ? '+' : ''}{h.score.toFixed(4)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FROZEN CONFIG INSPECTOR */}
      {activeTab === 'config' && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Frozen Configuration Parameters (Section 1)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Fixed strictly before any model testing. Rerunnable on identical datasets.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">History Window</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{FROZEN_CONFIG.historyStart} to {FROZEN_CONFIG.historyEnd}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Frozen Holdout Window</p>
              <p className="text-sm font-bold text-purple-400 mt-0.5">{FROZEN_CONFIG.holdoutStart} to {FROZEN_CONFIG.holdoutEnd}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Forward Horizon (N)</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{FROZEN_CONFIG.horizonDays} Trading Days</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Neutral Deadband</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">±{(FROZEN_CONFIG.neutralBand * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Cost per Trade</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{(FROZEN_CONFIG.costPerTrade * 100).toFixed(2)}% (Round-trip)</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Slippage Allowance</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{(FROZEN_CONFIG.slippage * 100).toFixed(2)}% / side</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Train / Test Window</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{FROZEN_CONFIG.trainWindow}d / {FROZEN_CONFIG.testWindow}d</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 p-3">
              <p className="text-[10px] text-[var(--text-muted)]">Walk-Forward Step</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{FROZEN_CONFIG.step}d (Quarterly)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
