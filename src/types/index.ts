/**
 * PeekStox — Global Stock Market Intelligence Platform
 * Founded by Viraj Kumar, Varshith Reddy, and Suraj R
 * Core Type Definitions
 */

export type MarketRegion = 'US' | 'IN' | 'GLOBAL';
export type DisplayCurrency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF';
export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';
export type ChartType = 'line' | 'candlestick';

export interface Candle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface StockQuote {
  ticker: string;
  name: string;
  exchange: string;
  country: string;
  currency: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio?: number;
  psRatio?: number;
  pbRatio?: number;
  eps?: number;
  dividendYield?: number;
  description: string;
  lastUpdated: string;
  dataSource: 'Real-time (BATS/IEX)' | 'Delayed (15m)' | 'EOD' | 'Yahoo Finance (Live)';
  sparkline: number[];
  region?: string;
}

export interface TechnicalIndicators {
  sma50: number;
  sma200: number;
  ema20: number;
  rsi14: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr14: number;
  supportLevel: number;
  resistanceLevel: number;
  trendDirection: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  momentum: 'Strong Up' | 'Moderate Up' | 'Neutral' | 'Moderate Down' | 'Strong Down';
}

export interface CompanyFundamentals {
  // Performance
  revenue: number; // in millions/billions
  revenueGrowthYoY: number; // percentage
  grossProfit: number;
  netIncome: number;
  earningsGrowthYoY: number;
  freeCashFlow: number;
  // Profitability
  grossMargin: number; // %
  operatingMargin: number; // %
  netMargin: number; // %
  returnOnEquity: number; // %
  returnOnAssets: number; // %
  // Valuation
  peRatio: number;
  forwardPE: number;
  psRatio: number;
  evToEbitda: number;
  // Financial Health
  totalDebt: number;
  totalCash: number;
  debtToEquity: number;
  currentRatio: number;
  // Dividends
  dividendRate: number;
  dividendYield: number;
  payoutRatio: number;
  // Metadata
  filingDate: string;
  reportingPeriod: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  tickers: string[];
  summary: string;
  sentimentScore: number; // -1.0 to +1.0
  sentimentLabel: 'Bullish' | 'Bearish' | 'Neutral';
  aiTakeaway?: {
    whyItMatters: string;
    affectedSectors: string[];
    confirmedVsUncertain: string;
  };
}

export interface GlobalIndex {
  id: string;
  symbol: string;
  name: string;
  region: 'US' | 'IN' | 'EU' | 'ASIA';
  value: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  status: 'Open' | 'Closed' | 'Pre-Market' | 'After-Hours' | 'Live';
  lastUpdated: string;
  sparkline: number[];
}

export interface UserAlert {
  id: string;
  userId?: string;
  ticker: string;
  companyName: string;
  conditionType: 'price_above' | 'price_below' | 'change_percent' | 'rsi_overbought' | 'rsi_oversold' | 'moving_avg_cross' | 'breaking_news';
  targetValue?: number;
  note?: string;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  isTriggered: boolean;
}

export interface MarketNotification {
  id: string;
  alertId?: string;
  ticker: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'price' | 'indicator' | 'news' | 'system';
  isRead: boolean;
  severity: 'info' | 'bullish' | 'bearish' | 'warning';
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: 'member' | 'pro_trader' | 'researcher' | 'guest';
  accountType?: 'registered' | 'guest';
  preferredMarket: MarketRegion;
  baseCurrency: DisplayCurrency;
  defaultTimeframe: ChartTimeframe;
  emailAlertsEnabled: boolean;
  inAppAlertsEnabled: boolean;
  soundEnabled: boolean;
  language?: string;
  watchlist: string[]; // array of tickers
  alerts: UserAlert[];
  savedDrawings?: Record<string, ChartDrawing[]>;
}

export interface ChartDrawing {
  id: string;
  type: 'trendline' | 'fibonacci' | 'horizontal_level';
  color: string;
  points: { x: number; y: number; date?: string; price?: number }[];
}

export interface BacktestLogRecord {
  id: string;
  date: string;
  ticker: string;
  s1_technical: -1 | 0 | 1;
  s2_fundamental?: -1 | 0 | 1;
  s3_sentiment?: -1 | 0 | 1;
  consensusScore?: number;
  consensusSignal?: -1 | 0 | 1;
  label: -1 | 0 | 1;
  fwdReturn: number;
  netReturn: number;
  hit: boolean;
  costDeducted: number;
  provider: string;
  runType: 'backtest' | 'holdout' | 'forward';
  notes?: string;
  method_version?: 'model1_v1' | 'legacy' | string;
  pointInTimeBasis?: string;
}

export interface ModelPerformanceStats {
  setup: string;
  period: string;
  tickersCount: number;
  totalPredictions: number;
  coverage: number; // share of days with non-zero signal
  hitRate: number; // on non-zero signals
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  profitFactor: number;
  maxDrawdown: number;
  vsBuyAndHold: number;
  ciLow: number;
  ciHigh: number;
  configHash: string;
  runDate: string;
}

export interface AIAnalysisResult {
  ticker: string;
  companyName: string;
  timestamp: string;
  executiveSummary: string;
  trendAnalysis: {
    shortTerm: string;
    mediumTerm: string;
    longTerm: string;
  };
  technicalInterpretation: {
    classification: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed' | 'Inconclusive';
    supportingFactors: string[];
    contradictingFactors: string[];
  };
  fundamentalAssessment: {
    growthScore: string;
    profitabilityScore: string;
    valuationScore: string;
    financialHealthScore: string;
    summary: string;
  };
  newsAndCatalysts: {
    verifiedFacts: string[];
    marketSpeculation: string[];
  };
  riskAssessment: {
    volatilityRisk: string;
    valuationRisk: string;
    macroRisk: string;
    regulatoryRisk: string;
  };
  scenarioAnalysis: {
    bullish: { probabilityAssumption: string; catalysts: string; invalidation: string };
    neutral: { probabilityAssumption: string; catalysts: string; invalidation: string };
    bearish: { probabilityAssumption: string; catalysts: string; invalidation: string };
  };
  finalAssessment: {
    summary: string;
    keyRisks: string[];
    factorsToMonitor: string[];
    missingOrUncertainData: string[];
  };
}
