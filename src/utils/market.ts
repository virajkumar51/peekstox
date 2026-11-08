export const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

import { formatStockPrice } from './currency';
import type { StockQuote } from '../types';

export function normalizeTicker(ticker?: string): string {
  if (!ticker) return '';
  return ticker.trim().toUpperCase();
}

export function isTickerMatch(t1?: string, t2?: string): boolean {
  if (!t1 || !t2) return false;
  const n1 = normalizeTicker(t1);
  const n2 = normalizeTicker(t2);
  if (n1 === n2) return true;

  // Clean dots, hyphens, and exchange suffixes
  const base1 = n1.split('.')[0].replace(/[\-]/g, '');
  const base2 = n2.split('.')[0].replace(/[\-]/g, '');
  if (base1 === base2) return true;

  // Compare without any special characters
  const clean1 = n1.replace(/[\.\-]/g, '');
  const clean2 = n2.replace(/[\.\-]/g, '');
  return clean1 === clean2;
}

export function findMatchingStock(stocks: StockQuote[], tickerOrSymbol?: string): StockQuote | undefined {
  if (!tickerOrSymbol || !stocks?.length) return undefined;
  const q = normalizeTicker(tickerOrSymbol);

  // 1. Exact ticker match
  const exact = stocks.find((s) => normalizeTicker(s.ticker) === q);
  if (exact) return exact;

  // 2. Loose ticker match (handles RELIANCE.NS, BRK-B, etc.)
  const loose = stocks.find((s) => isTickerMatch(s.ticker, q));
  if (loose) return loose;

  // 3. Name or company match
  return stocks.find((s) => s.name && normalizeTicker(s.name) === q);
}

let _activeBaseCurrency: string = 'USD';
export function setActiveCurrencyPreference(curr: string) {
  _activeBaseCurrency = curr || 'USD';
}
export function getActiveCurrencyPreference(): string {
  return _activeBaseCurrency;
}

export function formatPrice(value: number, currency = 'USD', baseCurrency?: string): string {
  const targetBase = baseCurrency || _activeBaseCurrency;
  if (!targetBase || targetBase.toUpperCase() === currency.toUpperCase()) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }
  return formatStockPrice(value, currency, targetBase);
}

/** Index levels are points, not money, so no currency symbol. */
export const formatLevel = (value: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/** "+1.35%" / "−0.18%" (fixes the "+-0.18%" the old code produced). */
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function timeAgo(input?: string | number | Date): string {
  if (input === undefined || input === null || input === '') return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ---- Indicators (computed from the price series you already have) ----

export function emaSeries(v: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
}

const rsOf = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));

/** Wilder RSI. Returns [] when there is not enough data. */
export function rsiSeries(v: number[], period = 14): number[] {
  const p = Math.min(period, Math.max(2, v.length - 2));
  if (v.length < p + 1) return [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= p; i++) {
    const d = v[i] - v[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= p;
  loss /= p;
  const out = [rsOf(gain, loss)];
  for (let i = p + 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    gain = (gain * (p - 1) + Math.max(d, 0)) / p;
    loss = (loss * (p - 1) + Math.max(-d, 0)) / p;
    out.push(rsOf(gain, loss));
  }
  return out;
}

/** MACD line. Periods shrink for short series so it still renders. */
export function macdSeries(v: number[]): number[] {
  if (v.length < 6) return [];
  const slow = Math.min(26, v.length - 1);
  const fast = Math.max(2, Math.min(12, Math.floor(slow / 2)));
  const f = emaSeries(v, fast);
  const s = emaSeries(v, slow);
  return v.map((_, i) => f[i] - s[i]);
}

export function smaSeries(v: number[], period: number): number[] {
  const p = Math.min(period, v.length);
  const out: number[] = [];
  for (let i = p - 1; i < v.length; i++) {
    out.push(v.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p);
  }
  return out;
}

export function bollinger(v: number[], period = 20) {
  const p = Math.min(period, v.length);
  const mid: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = p - 1; i < v.length; i++) {
    const w = v.slice(i - p + 1, i + 1);
    const m = w.reduce((a, b) => a + b, 0) / p;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / p);
    mid.push(m);
    upper.push(m + 2 * sd);
    lower.push(m - 2 * sd);
  }
  return { mid, upper, lower };
}

/** Least-squares trend over the last `lookback` points, extended forward.
 *  An extrapolation of the line, not a forecast. */
export function trendProjection(v: number[], lookback = 30) {
  const w = v.slice(-lookback);
  const n = w.length;
  if (n < 4) return null;
  const mx = (n - 1) / 2;
  const my = w.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  w.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  const slope = num / den;
  const at = (x: number) => my + slope * (x - mx);
  const horizon = Math.max(3, Math.ceil(n / 3));
  const projected = Array.from({ length: horizon }, (_, k) => at(n - 1 + k + 1));
  const last = w[n - 1];
  return { history: w, projected, driftPct: ((projected[horizon - 1] - last) / last) * 100 };
}

/** Share of tracked stocks that are up today, 0-100. */
export function breadthPercent(stocks: { changePercent: number }[]): number {
  const valid = stocks.filter((s) => Number.isFinite(s.changePercent));
  if (!valid.length) return 50;
  return Math.round((valid.filter((s) => s.changePercent > 0).length / valid.length) * 100);
}
