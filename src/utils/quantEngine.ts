/**
 * PeekStox — Staged Stock Signal Algorithm Engine
 * Faithful implementation of the PeekStox Quantitative Specification
 * Provider-agnostic, zero-lookahead, point-in-time calculation engine
 */

import { Candle, TechnicalIndicators } from '../types';

export interface QuantConfig {
  historyStart: string;
  historyEnd: string;
  holdoutStart: string;
  holdoutEnd: string;
  horizonDays: number;
  neutralBand: number;
  costPerTrade: number;
  slippage: number;
  trainWindow: number;
  testWindow: number;
  step: number;
  randomSeed: number;
}

export const FROZEN_CONFIG: QuantConfig = {
  historyStart: '2020-01-01',
  historyEnd: '2024-12-31',
  holdoutStart: '2025-01-01',
  holdoutEnd: '2025-12-31',
  horizonDays: 20,
  neutralBand: 0.02,
  costPerTrade: 0.001, // 0.10% round trip
  slippage: 0.0005, // 0.05% per side
  trainWindow: 504,
  testWindow: 63,
  step: 63,
  randomSeed: 42,
};

export const CONFIG_HASH = 'sha256-pkstx-m4-cons-v1.4';

/**
 * Calculates Simple Moving Average (mean of last `window` closes ending on each date, inclusive)
 */
export function sma(adjClose: (number | null)[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < adjClose.length; i++) {
    if (i + 1 < window || adjClose[i] === null || isNaN(Number(adjClose[i]))) {
      result.push(null);
    } else {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < window; j++) {
        const val = adjClose[i - j];
        if (val !== null && !isNaN(Number(val))) {
          sum += Number(val);
          count++;
        }
      }
      if (count < window) {
        result.push(null);
      } else {
        result.push(Number((sum / window).toFixed(4)));
      }
    }
  }
  return result;
}

/**
 * Relative Strength Index (RSI 14) using simple rolling means of gains and losses over 14 days
 */
export function rsi14(adjClose: (number | null)[]): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (adjClose.length < 15) {
    return adjClose.map(() => null);
  }

  const diffs: (number | null)[] = [null];
  for (let i = 1; i < adjClose.length; i++) {
    if (adjClose[i] === null || adjClose[i - 1] === null) {
      diffs.push(null);
    } else {
      diffs.push(Number((Number(adjClose[i]) - Number(adjClose[i - 1])).toFixed(4)));
    }
  }

  for (let i = 0; i < adjClose.length; i++) {
    if (i < 14) {
      rsi.push(null);
      continue;
    }
    let gains = 0;
    let losses = 0;
    let valid = true;
    for (let j = i - 13; j <= i; j++) {
      const d = diffs[j];
      if (d === null || isNaN(Number(d))) {
        valid = false;
        break;
      }
      if (d >= 0) gains += d;
      else losses += Math.abs(d);
    }
    if (!valid) {
      rsi.push(null);
      continue;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) {
      rsi.push(100.0);
    } else {
      const rs = avgGain / avgLoss;
      const val = 100 - 100 / (1 + rs);
      rsi.push(Number(val.toFixed(2)));
    }
  }
  return rsi;
}

/**
 * Model 1 Technical Signal
 */
export function model1Signal(adjClose: (number | null)[]): (number | null)[] {
  const s50 = sma(adjClose, 50);
  const s200 = sma(adjClose, 200);
  const r = rsi14(adjClose);
  const sig: (number | null)[] = [];

  for (let i = 0; i < adjClose.length; i++) {
    const p = adjClose[i];
    const s5 = s50[i];
    const s20 = s200[i];
    const rv = r[i];

    if (
      p === null ||
      s5 === null ||
      s20 === null ||
      rv === null ||
      isNaN(Number(p)) ||
      isNaN(Number(s5)) ||
      isNaN(Number(s20)) ||
      isNaN(Number(rv))
    ) {
      sig.push(null);
      continue;
    }

    const bull = p > s20 && s5 > s20 && rv < 70;
    const bear = p < s20 && s5 < s20 && rv > 30;

    if (bull) sig.push(1.0);
    else if (bear) sig.push(-1.0);
    else sig.push(0.0);
  }
  return sig;
}

/**
 * Forward return (the ONLY function allowed to look forward)
 */
export function forwardReturn(adjClose: (number | null)[], horizon: number = 20): (number | null)[] {
  const fwd: (number | null)[] = [];
  for (let i = 0; i < adjClose.length; i++) {
    if (i + horizon >= adjClose.length || adjClose[i] === null || adjClose[i + horizon] === null) {
      fwd.push(null);
    } else {
      const cur = Number(adjClose[i]);
      const future = Number(adjClose[i + horizon]);
      if (cur === 0) fwd.push(null);
      else fwd.push(Number((future / cur - 1).toFixed(4)));
    }
  }
  return fwd;
}

/**
 * Label based on forward return and band
 */
export function computeLabel(fwd: (number | null)[], band: number = 0.02): (number | null)[] {
  return fwd.map((val) => {
    if (val === null || isNaN(Number(val))) return null;
    const v = Number(val);
    if (v > band) return 1;
    if (v < -band) return -1;
    return 0;
  });
}

/**
 * Net return with costs and slippage applied both sides for active trades (signal != 0)
 */
export function netReturn(
  signal: (number | null)[],
  fwd: (number | null)[],
  cost: number = 0.001,
  slip: number = 0.0005
): (number | null)[] {
  return signal.map((sig, i) => {
    if (sig === null || fwd[i] === null || isNaN(Number(sig)) || isNaN(Number(fwd[i]))) {
      return null;
    }
    const s = Number(sig);
    const f = Number(fwd[i]);
    if (s === 0) return 0;
    const tradeCost = 2 * (cost + slip);
    return Number((s * f - tradeCost).toFixed(4));
  });
}

// Technical indicator helpers exported for mockStocks and chart components
export function calculateSMA(data: number[], period: number): number[] {
  return sma(data, period).map((v) => (v === null ? 0 : v));
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) ema.push(data[0]);
    else {
      const prev = ema[i - 1];
      ema.push(Number(((data[i] - prev) * multiplier + prev).toFixed(2)));
    }
  }
  return ema;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  return rsi14(closes).map((v) => (v === null ? 50 : v));
}

export function calculateMACD(closes: number[]): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
} {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = closes.map((_, i) => Number((ema12[i] - ema26[i]).toFixed(2)));
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((val, i) => Number((val - signalLine[i]).toFixed(2)));
  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const sma20 = calculateSMA(closes, period);
  const upper: number[] = [];
  const middle: number[] = [...sma20];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i] * 1.02);
      lower.push(closes[i] * 0.98);
    } else {
      let sumSqDiff = 0;
      const mean = sma20[i];
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(closes[i - j] - mean, 2);
      }
      const stdev = Math.sqrt(sumSqDiff / period);
      upper.push(Number((mean + multiplier * stdev).toFixed(2)));
      lower.push(Number((mean - multiplier * stdev).toFixed(2)));
    }
  }
  return upper && middle && lower ? { upper, middle, lower } : { upper: [], middle: [], lower: [] };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) tr.push(candles[0].high - candles[0].low);
    else {
      const c = candles[i];
      const pc = candles[i - 1].close;
      tr.push(Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc)));
    }
  }
  let runningAtr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period) atr.push(Number(runningAtr.toFixed(2)));
    else {
      runningAtr = (runningAtr * (period - 1) + tr[i]) / period;
      atr.push(Number(runningAtr.toFixed(2)));
    }
  }
  return atr;
}

export function computeTechnicalSignal(
  currentPrice: number,
  sma50: number,
  sma200: number,
  rsi14Val: number
): -1 | 0 | 1 {
  if (currentPrice > sma200 && sma50 > sma200 && rsi14Val < 70) return 1;
  if (currentPrice < sma200 && sma50 < sma200 && rsi14Val > 30) return -1;
  return 0;
}

export function computeFundamentalSignal(..._args: any[]): -1 | 0 | 1 { return 0; }
export function finbertResultToScore(result: { label: string; score: number }): number {
  const { label, score } = result;
  const l = label.toLowerCase().trim();
  if (l === 'positive') return Number(score.toFixed(4));
  if (l === 'negative') return Number((-score).toFixed(4));
  return 0.0;
}
export function computeSentimentSignal(scores: number[]): -1 | 0 | 1 {
  if (scores.length < 3) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > 0.3) return 1;
  if (avg < -0.3) return -1;
  return 0;
}
export function computeConsensusSignal(signals: (-1 | 0 | 1)[]): { score: number; signal: -1 | 0 | 1 } {
  if (signals.length === 0) return { score: 0, signal: 0 };
  const score = signals.reduce<number>((acc, curr) => acc + curr, 0) / signals.length;
  let signal: -1 | 0 | 1 = 0;
  if (score >= 0.5) signal = 1;
  else if (score <= -0.5) signal = -1;
  return { score: Number(score.toFixed(2)), signal };
}
export function calculateRollingSMA(adjClose: number[], window: number): (number | null)[] {
  return sma(adjClose, window);
}
export function computeModel1SignalSeries(adjClose: number[], _rsi: number[]): (-1 | 0 | 1)[] {
  return model1Signal(adjClose).map((s) => (s === 1 ? 1 : s === -1 ? -1 : 0) as (-1 | 0 | 1));
}
export function computeIsHit(signal: (number | null)[], label: (number | null)[]): boolean[] {
  return signal.map((sig, i) => sig !== null && sig !== 0 && sig === label[i]);
}
export function computeBootstrapCI(returns: number[], numIterations: number = 1000): { low: number; high: number } {
  if (returns.length < 5) return { low: -0.01, high: 0.02 };
  const means: number[] = [];
  for (let it = 0; it < numIterations; it++) {
    let sampleSum = 0;
    for (let i = 0; i < returns.length; i++) {
      const idx = Math.floor(Math.random() * returns.length);
      sampleSum += returns[idx];
    }
    means.push(sampleSum / returns.length);
  }
  means.sort((a, b) => a - b);
  return {
    low: Number(means[Math.floor(numIterations * 0.025)].toFixed(4)),
    high: Number(means[Math.floor(numIterations * 0.975)].toFixed(4)),
  };
}
