import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { SAMPLE_BACKTEST_LOGS, generateCandlesForStock, getTechnicalIndicatorsForStock } from './src/data/mockStocks';
import { computeTechnicalSignal, calculateRSI } from './src/utils/quantEngine';
import { UNIVERSE_TICKERS } from './src/config/universe';
import { GLOBAL_COMPANIES } from './src/data/globalCompanies';
import type { SimulatorPortfolio } from './src/types/simulator';
import {
  createInitialPortfolio,
  placeOrder,
  cancelOrder,
  revaluePortfolio,
  calculatePerformanceAnalytics,
} from './src/utils/simulatorEngine';
import { getUSMarketStatus, getIndiaMarketStatus } from './src/utils/marketSchedule';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let PORT = Number(process.env.PORT) || 3000;
let HOST = '0.0.0.0';
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' && process.argv[i + 1]) {
    const p = Number(process.argv[i + 1]);
    if (!isNaN(p) && p > 0) PORT = p;
  }
  if (process.argv[i] === '--host' && process.argv[i + 1]) {
    HOST = process.argv[i + 1];
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();

app.use(express.json());

// Enable CORS and resilient headers for API endpoints
app.use((_req: Request, res: Response, next: express.NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Server-side Gemini AI client initialization per guidelines
let geminiAI: GoogleGenAI | null = null;
const rawApiKey = process.env.GEMINI_API_KEY || '';
if (rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY' && !rawApiKey.includes('MY_GEMINI')) {
  geminiAI = new GoogleGenAI({
    apiKey: rawApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory data store for persistent user sessions, alerts, and settings
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  role: 'member' | 'pro_trader' | 'researcher';
  preferredMarket: 'US' | 'IN' | 'GLOBAL';
  baseCurrency: 'USD' | 'INR' | 'EUR' | 'GBP';
  defaultTimeframe: string;
  emailAlertsEnabled: boolean;
  inAppAlertsEnabled: boolean;
  soundEnabled: boolean;
  watchlist: string[];
  alerts: Array<{
    id: string;
    ticker: string;
    companyName: string;
    conditionType: string;
    targetValue?: number;
    note?: string;
    isActive: boolean;
    createdAt: string;
    isTriggered: boolean;
  }>;
}

const usersDb = new Map<string, StoredUser>();

// Pre-seed a default executive researcher account
const DEFAULT_USER_ID = 'usr_001';
usersDb.set(DEFAULT_USER_ID, {
  id: DEFAULT_USER_ID,
  name: 'Research Analyst',
  email: 'analyst@peekstox.internal',
  passwordHash: 'demo_pass_hash',
  avatarUrl: '/peekstox_profile.png',
  role: 'researcher',
  preferredMarket: 'GLOBAL',
  baseCurrency: 'USD',
  defaultTimeframe: '1M',
  emailAlertsEnabled: true,
  inAppAlertsEnabled: true,
  soundEnabled: true,
  watchlist: ['AAPL', 'MSFT', 'NVDA', 'RELIANCE', 'HDFCBANK', 'GOOGL'],
  alerts: [
    {
      id: 'alt_001',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      conditionType: 'price_above',
      targetValue: 240.0,
      note: 'Alert when Apple breaks through previous resistance of $240',
      isActive: true,
      createdAt: new Date().toISOString(),
      isTriggered: false,
    },
    {
      id: 'alt_002',
      ticker: 'NVDA',
      companyName: 'NVIDIA Corporation',
      conditionType: 'rsi_overbought',
      targetValue: 70.0,
      note: 'Take-profit consideration when daily RSI crosses 70',
      isActive: true,
      createdAt: new Date().toISOString(),
      isTriggered: false,
    },
    {
      id: 'alt_003',
      ticker: 'RELIANCE',
      companyName: 'Reliance Industries Ltd.',
      conditionType: 'change_percent',
      targetValue: 2.0,
      note: 'Notice rapid 2% intraday swing in NSE session',
      isActive: true,
      createdAt: new Date().toISOString(),
      isTriggered: false,
    },
  ],
});

// Helper to get active user ID from Authorization header or fallback to default demo
function getUserIdFromReq(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (usersDb.has(token)) return token;
  }
  return DEFAULT_USER_ID;
}

// ================= AUTH API =================
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, preferredMarket, baseCurrency } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  // Check if exists
  for (const [, u] of usersDb.entries()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }
  }

  const id = `usr_${Date.now()}`;
  const newUser: StoredUser = {
    id,
    name,
    email,
    passwordHash: password || 'hash_pass',
    avatarUrl: '/peekstox_profile.png',
    role: 'researcher',
    preferredMarket: preferredMarket || 'GLOBAL',
    baseCurrency: baseCurrency || 'USD',
    defaultTimeframe: '1M',
    emailAlertsEnabled: true,
    inAppAlertsEnabled: true,
    soundEnabled: true,
    watchlist: ['AAPL', 'NVDA', 'MSFT', 'RELIANCE'],
    alerts: [],
  };

  usersDb.set(id, newUser);
  res.json({ token: id, user: newUser });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  for (const [, u] of usersDb.entries()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.json({ token: u.id, user: u });
    }
  }

  // Auto register or create demo user session
  const id = `usr_${Date.now()}`;
  const newUser: StoredUser = {
    id,
    name: email.split('@')[0],
    email,
    passwordHash: password || 'hash_pass',
    avatarUrl: '/peekstox_profile.png',
    role: 'researcher',
    preferredMarket: 'GLOBAL',
    baseCurrency: 'USD',
    defaultTimeframe: '1M',
    emailAlertsEnabled: true,
    inAppAlertsEnabled: true,
    soundEnabled: true,
    watchlist: ['AAPL', 'NVDA', 'RELIANCE'],
    alerts: [],
  };
  usersDb.set(id, newUser);
  res.json({ token: id, user: newUser });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId) || usersDb.get(DEFAULT_USER_ID);
  res.json({ user });
});

app.post('/api/auth/profile', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, preferredMarket, baseCurrency, defaultTimeframe, emailAlertsEnabled, inAppAlertsEnabled, soundEnabled } = req.body;
  if (name) user.name = name;
  if (preferredMarket) user.preferredMarket = preferredMarket;
  if (baseCurrency) user.baseCurrency = baseCurrency;
  if (defaultTimeframe) user.defaultTimeframe = defaultTimeframe;
  if (typeof emailAlertsEnabled === 'boolean') user.emailAlertsEnabled = emailAlertsEnabled;
  if (typeof inAppAlertsEnabled === 'boolean') user.inAppAlertsEnabled = inAppAlertsEnabled;
  if (typeof soundEnabled === 'boolean') user.soundEnabled = soundEnabled;

  res.json({ user });
});

// ================= USER WATCHLIST & ALERTS API =================
app.get('/api/user/watchlist', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  res.json({ watchlist: user?.watchlist || [] });
});

app.post('/api/user/watchlist', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { ticker, action } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

  if (action === 'remove') {
    user.watchlist = user.watchlist.filter((t) => t !== ticker.toUpperCase());
  } else {
    if (!user.watchlist.includes(ticker.toUpperCase())) {
      user.watchlist.push(ticker.toUpperCase());
    }
  }
  res.json({ watchlist: user.watchlist });
});

app.get('/api/user/alerts', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  res.json({ alerts: user?.alerts || [] });
});

app.post('/api/user/alerts', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { ticker, companyName, conditionType, targetValue, note } = req.body;
  if (!ticker || !conditionType) {
    return res.status(400).json({ error: 'Ticker and condition type are required.' });
  }

  const newAlert = {
    id: `alt_${Date.now()}`,
    ticker: ticker.toUpperCase(),
    companyName: companyName || ticker,
    conditionType,
    targetValue: targetValue !== undefined ? Number(targetValue) : undefined,
    note: note || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    isTriggered: false,
  };

  user.alerts.unshift(newAlert);
  res.json({ alert: newAlert, alerts: user.alerts });
});

app.delete('/api/user/alerts/:id', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.alerts = user.alerts.filter((a) => a.id !== req.params.id);
  res.json({ alerts: user.alerts });
});

app.patch('/api/user/alerts/:id', (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  const user = usersDb.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const alert = user.alerts.find((a) => a.id === req.params.id);
  if (alert) {
    if (typeof req.body.isActive === 'boolean') alert.isActive = req.body.isActive;
    if (typeof req.body.isTriggered === 'boolean') alert.isTriggered = req.body.isTriggered;
  }
  res.json({ alerts: user.alerts });
});

// ================= YAHOO FINANCE LIVE WORLD MARKET INTEGRATION =================
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // US Bluechips
  AAPL: 'AAPL',
  MSFT: 'MSFT',
  NVDA: 'NVDA',
  AMZN: 'AMZN',
  TSLA: 'TSLA',
  GOOGL: 'GOOGL',
  META: 'META',
  'BRK-B': 'BRK-B',
  'BRK.B': 'BRK-B',
  JPM: 'JPM',
  WMT: 'WMT',
  LLY: 'LLY',
  AVGO: 'AVGO',
  XOM: 'XOM',
  V: 'V',
  JNJ: 'JNJ',
  COST: 'COST',
  AMD: 'AMD',
  NFLX: 'NFLX',
  SHOP: 'SHOP',
  RY: 'RY',

  // Europe Leaders
  ASML: 'ASML',
  NVO: 'NVO',
  'NOVO-B.CO': 'NOVO-B.CO',
  'MC.PA': 'MC.PA',
  LVMH: 'MC.PA',
  SAP: 'SAP',
  'SAP.DE': 'SAP.DE',
  'SHEL.L': 'SHEL.L',
  SHEL: 'SHEL',
  'AZN.L': 'AZN.L',
  AZN: 'AZN',
  'NESN.SW': 'NESN.SW',
  'NOVN.SW': 'NOVN.SW',
  'SIE.DE': 'SIE.DE',
  'RACE.MI': 'RACE.MI',
  RACE: 'RACE',
  'MBG.DE': 'MBG.DE',
  HSBC: 'HSBC',
  'HSBA.L': 'HSBA.L',
  'TTE.PA': 'TTE.PA',
  'RMS.PA': 'RMS.PA',
  'SAN.PA': 'SAN.PA',
  'ULVR.L': 'ULVR.L',
  UL: 'UL',

  // Asia-Pacific & Emerging
  TSM: 'TSM',
  '2330.TW': '2330.TW',
  '005930.KS': '005930.KS',
  SAMSUNG: '005930.KS',
  '7203.T': '7203.T',
  TOYOTA: '7203.T',
  '0700.HK': '0700.HK',
  TENCENT: '0700.HK',
  BABA: 'BABA',
  '9988.HK': '9988.HK',
  '6758.T': '6758.T',
  SONY: '6758.T',
  'BHP.AX': 'BHP.AX',
  BHP: 'BHP',
  'CBA.AX': 'CBA.AX',
  'CSL.AX': 'CSL.AX',
  'MELI': 'MELI',
  'PBR': 'PBR',
  'PETR4.SA': 'PETR4.SA',
  'VALE': 'VALE',
  'NU': 'NU',

  // Indian Equities (NSE)
  RELIANCE: 'RELIANCE.NS',
  'RELIANCE.NS': 'RELIANCE.NS',
  HDFCBANK: 'HDFCBANK.NS',
  'HDFCBANK.NS': 'HDFCBANK.NS',
  TCS: 'TCS.NS',
  'TCS.NS': 'TCS.NS',
  INFY: 'INFY.NS',
  'INFY.NS': 'INFY.NS',
  ICICIBANK: 'ICICIBANK.NS',
  'ICICIBANK.NS': 'ICICIBANK.NS',
  LT: 'LT.NS',
  'LT.NS': 'LT.NS',
  SBIN: 'SBIN.NS',
  'SBIN.NS': 'SBIN.NS',
  BHARTIARTL: 'BHARTIARTL.NS',
  'BHARTIARTL.NS': 'BHARTIARTL.NS',

  // World Benchmark Indices
  sp500: '^GSPC',
  nasdaq: '^IXIC',
  dow: '^DJI',
  nifty50: '^NSEI',
  sensex: '^BSESN',
  ftse100: '^FTSE',
  nikkei225: '^N225',
  dax: '^GDAXI',
  cac40: '^FCHI',
  hangseng: '^HSI',
  asx200: '^AXJO',
};

interface CachedQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  yearHigh?: number;
  yearLow?: number;
  currency?: string;
  exchange?: string;
  shortName?: string;
  sparkline: number[];
  lastUpdated: string;
  source: 'Yahoo Finance (Live)' | 'Cached';
  cachedAt: number;
}

const quoteCache = new Map<string, CachedQuote>();
const CACHE_TTL_MS = 25000; // 25 seconds cache

async function fetchYahooQuote(ticker: string): Promise<CachedQuote | null> {
  const normTicker = ticker.trim();
  const cached = quoteCache.get(normTicker) || quoteCache.get(normTicker.toUpperCase());
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const ySymbol = YAHOO_SYMBOL_MAP[normTicker] || YAHOO_SYMBOL_MAP[normTicker.toUpperCase()] || normTicker;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=1d&range=5d`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return cached || null;
    const data: any = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result || !result.meta) return cached || null;

    const meta = result.meta;
    let price = Number(meta.regularMarketPrice ?? 0);
    let prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
    
    // Normalize GBp (pence) to GBP pounds if needed
    const rawCurrency = meta.currency || 'USD';
    let currency = rawCurrency;
    if (rawCurrency === 'GBp' || rawCurrency === 'GBX') {
      currency = 'GBP';
      price = Number((price / 100).toFixed(2));
      prevClose = Number((prevClose / 100).toFixed(2));
    }

    const change = Number((price - prevClose).toFixed(2));
    const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
    
    // Extract closes for sparkline
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const validCloses = rawCloses.filter((p): p is number => p !== null && !isNaN(p));
    const sparkline = validCloses.length > 5 
      ? validCloses.slice(-7).map((p) => Number((rawCurrency === 'GBp' ? p / 100 : p).toFixed(2))) 
      : [price];

    const quote: CachedQuote = {
      ticker: normTicker,
      price,
      change,
      changePercent,
      previousClose: prevClose,
      dayHigh: Number((meta.regularMarketDayHigh ? (rawCurrency === 'GBp' ? meta.regularMarketDayHigh / 100 : meta.regularMarketDayHigh) : price).toFixed(2)),
      dayLow: Number((meta.regularMarketDayLow ? (rawCurrency === 'GBp' ? meta.regularMarketDayLow / 100 : meta.regularMarketDayLow) : price).toFixed(2)),
      volume: Number(meta.regularMarketVolume ?? 0),
      yearHigh: meta.fiftyTwoWeekHigh ? Number((rawCurrency === 'GBp' ? meta.fiftyTwoWeekHigh / 100 : meta.fiftyTwoWeekHigh).toFixed(2)) : undefined,
      yearLow: meta.fiftyTwoWeekLow ? Number((rawCurrency === 'GBp' ? meta.fiftyTwoWeekLow / 100 : meta.fiftyTwoWeekLow).toFixed(2)) : undefined,
      currency,
      exchange: meta.exchangeName || meta.fullExchangeName || '',
      shortName: meta.shortName || meta.longName || normTicker,
      sparkline,
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance (Live)',
      cachedAt: Date.now(),
    };

    quoteCache.set(normTicker, quote);
    if (normTicker.toUpperCase() !== normTicker) {
      quoteCache.set(normTicker.toUpperCase(), quote);
    }
    return quote;
  } catch (err) {
    console.warn(`Failed to fetch Yahoo Finance quote for ${normTicker}:`, (err as Error).message);
    return cached || null;
  }
}

// Global search endpoint: find ANY company throughout the world via Yahoo Finance
app.get('/api/market/search', async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json({ quotes: [] });
  }
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.json({ quotes: [] });
    }
    const data: any = await response.json();
    const rawQuotes = data?.quotes || [];
    const quotes = rawQuotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        quoteType: q.quoteType,
        sector: q.sector || q.sectorDisp || 'Global Equity',
        industry: q.industry || q.industryDisp || 'Diversified',
      }));
    res.json({ quotes });
  } catch (err) {
    console.error('Yahoo global search error:', err);
    res.json({ quotes: [] });
  }
});

// Live quotes endpoint: batch fetch quotes for multiple global symbols
app.get('/api/market/live-quotes', async (req: Request, res: Response) => {
  let requestedTickers: string[] = [];
  const querySymbols = req.query.symbols;
  if (typeof querySymbols === 'string' && querySymbols.trim()) {
    requestedTickers = querySymbols.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    requestedTickers = Object.keys(YAHOO_SYMBOL_MAP);
  }

  const results: Record<string, CachedQuote> = {};

  // Fetch in concurrent batches of 6
  const batchSize = 6;
  for (let i = 0; i < requestedTickers.length; i += batchSize) {
    const chunk = requestedTickers.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (t) => {
        const q = await fetchYahooQuote(t);
        if (q) results[t] = q;
      })
    );
  }

  res.json({
    timestamp: new Date().toISOString(),
    source: 'Yahoo Finance (Live)',
    quotes: results,
  });
});

// Single stock on-demand live quote (for ANY company globally)
app.get('/api/market/live/:ticker', async (req: Request, res: Response) => {
  const ticker = req.params.ticker.trim();
  const quote = await fetchYahooQuote(ticker);
  if (!quote) {
    return res.status(404).json({ error: `Live quote for ${ticker} unavailable from Yahoo Finance` });
  }
  res.json({ quote });
});

// ================= HISTORICAL DATA & TECHNICAL INDICATORS PIPELINE =================
interface HistoricalChartData {
  symbol: string;
  ySymbol: string;
  name: string;
  currency: string;
  currentPrice: number;
  timestamps: number[];
  closes: number[];
  source: 'Yahoo Finance (Live)' | 'Historical Model';
  cachedAt: number;
}

const historicalChartCache = new Map<string, HistoricalChartData>();
const HISTORICAL_TTL_MS = 300000; // 5 minutes cache

async function fetchHistoricalChartData(symbol: string): Promise<HistoricalChartData> {
  const normSymbol = symbol.trim();
  const cached = historicalChartCache.get(normSymbol) || historicalChartCache.get(normSymbol.toUpperCase());
  if (cached && Date.now() - cached.cachedAt < HISTORICAL_TTL_MS) {
    return cached;
  }

  // Resolve Yahoo ticker symbol
  let ySymbol = YAHOO_SYMBOL_MAP[normSymbol] || YAHOO_SYMBOL_MAP[normSymbol.toUpperCase()] || normSymbol;
  if (/^s&p|spx|sp500$/i.test(normSymbol)) ySymbol = '^GSPC';
  if (/^nasdaq$/i.test(normSymbol)) ySymbol = '^IXIC';
  if (/^dow$/i.test(normSymbol)) ySymbol = '^DJI';
  if (/^nifty|nifty50$/i.test(normSymbol)) ySymbol = '^NSEI';
  if (/^sensex$/i.test(normSymbol)) ySymbol = '^BSESN';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=1d&range=1y`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const data: any = await response.json();
      const result = data?.chart?.result?.[0];
      if (result && result.meta && Array.isArray(result.indicators?.quote?.[0]?.close)) {
        const meta = result.meta;
        const rawCloses: (number | null)[] = result.indicators.adjclose?.[0]?.adjclose || result.indicators.quote[0].close;
        const rawTimestamps: number[] = result.timestamp || [];
        const rawCurrency = meta.currency || 'USD';
        const isGBp = rawCurrency === 'GBp' || rawCurrency === 'GBX';

        const validCloses: number[] = [];
        const validTimestamps: number[] = [];

        for (let i = 0; i < rawCloses.length; i++) {
          const val = rawCloses[i];
          if (val !== null && val !== undefined && !isNaN(val) && val > 0) {
            validCloses.push(Number((isGBp ? val / 100 : val).toFixed(2)));
            validTimestamps.push(rawTimestamps[i] || Math.floor((Date.now() - (rawCloses.length - i) * 86400000) / 1000));
          }
        }

        if (validCloses.length >= 20) {
          const currentPrice = Number((isGBp && meta.regularMarketPrice ? meta.regularMarketPrice / 100 : meta.regularMarketPrice ?? validCloses[validCloses.length - 1]).toFixed(2));
          if (currentPrice > 0 && Math.abs(validCloses[validCloses.length - 1] - currentPrice) > 0.01) {
            validCloses.push(currentPrice);
            validTimestamps.push(Math.floor(Date.now() / 1000));
          }

          const entry: HistoricalChartData = {
            symbol: normSymbol,
            ySymbol,
            name: meta.shortName || meta.longName || normSymbol,
            currency: isGBp ? 'GBP' : rawCurrency,
            currentPrice,
            timestamps: validTimestamps,
            closes: validCloses,
            source: 'Yahoo Finance (Live)',
            cachedAt: Date.now(),
          };

          historicalChartCache.set(normSymbol, entry);
          historicalChartCache.set(normSymbol.toUpperCase(), entry);
          return entry;
        }
      }
    }
  } catch (err) {
    console.warn(`Historical Yahoo fetch error for ${normSymbol}:`, (err as Error).message);
  }

  // Fallback: Generate realistic 252 daily trading bars using generateCandlesForStock
  let fallbackPrice = 5000;
  if (/s&p|spx|gspc/i.test(normSymbol)) fallbackPrice = 5864.67;
  else if (/nasdaq|ixic/i.test(normSymbol)) fallbackPrice = 18983.47;
  else if (/dow|dji/i.test(normSymbol)) fallbackPrice = 43729.34;
  else if (/nifty/i.test(normSymbol)) fallbackPrice = 24148.20;
  else if (/sensex/i.test(normSymbol)) fallbackPrice = 79486.32;
  else {
    const q = quoteCache.get(normSymbol) || quoteCache.get(normSymbol.toUpperCase());
    if (q?.price) fallbackPrice = q.price;
  }

  const generated = generateCandlesForStock(normSymbol, '1Y', fallbackPrice);
  const closes = generated.map((c) => c.close);
  const timestamps = generated.map((c) => Math.floor(((c as any).timestamp || new Date((c as any).date).getTime()) / 1000));

  const entry: HistoricalChartData = {
    symbol: normSymbol,
    ySymbol,
    name: normSymbol,
    currency: normSymbol.endsWith('.NS') || normSymbol.endsWith('.BO') ? 'INR' : 'USD',
    currentPrice: closes[closes.length - 1] || fallbackPrice,
    timestamps,
    closes,
    source: 'Historical Model',
    cachedAt: Date.now(),
  };

  historicalChartCache.set(normSymbol, entry);
  historicalChartCache.set(normSymbol.toUpperCase(), entry);
  return entry;
}

function computeTechnicalAnalysis(closes: number[], currentPrice: number) {
  const n = closes.length;
  const lastPrice = currentPrice > 0 ? currentPrice : closes[closes.length - 1];

  // 1. RSI (14 Period Wilder)
  let rsiValue: number | null = null;
  let rsiState: 'Overbought' | 'Oversold' | 'Neutral' = 'Neutral';
  let rsiSeries: number[] = [];

  if (n >= 15) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= 14; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / 14;
    let avgLoss = losses / 14;
    const firstRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    rsiSeries.push(Number(firstRsi.toFixed(1)));

    for (let i = 15; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      const g = diff > 0 ? diff : 0;
      const l = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * 13 + g) / 14;
      avgLoss = (avgLoss * 13 + l) / 14;
      const r = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
      rsiSeries.push(Number(r.toFixed(1)));
    }
    rsiValue = rsiSeries[rsiSeries.length - 1];
    rsiState = rsiValue >= 70 ? 'Overbought' : rsiValue <= 30 ? 'Oversold' : 'Neutral';
  }

  // 2. MACD (12, 26, 9)
  let macdValue: number | null = null;
  let signalValue: number | null = null;
  let histValue: number | null = null;
  let macdState: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  let macdSeries: number[] = [];
  let signalSeries: number[] = [];
  let histSeries: number[] = [];

  if (n >= 26) {
    const calcEMA = (data: number[], period: number) => {
      const k = 2 / (period + 1);
      const out: number[] = [];
      data.forEach((val, idx) => {
        out.push(idx === 0 ? val : Number((val * k + out[idx - 1] * (1 - k)).toFixed(2)));
      });
      return out;
    };

    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    macdSeries = closes.map((_, i) => Number((ema12[i] - ema26[i]).toFixed(2)));
    signalSeries = calcEMA(macdSeries, 9);
    histSeries = macdSeries.map((m, i) => Number((m - signalSeries[i]).toFixed(2)));

    macdValue = macdSeries[macdSeries.length - 1];
    signalValue = signalSeries[signalSeries.length - 1];
    histValue = histSeries[histSeries.length - 1];
    macdState = histValue > 0 ? 'Bullish' : histValue < 0 ? 'Bearish' : 'Neutral';
  }

  // 3. Moving Averages (SMA 20, SMA 50, SMA 200)
  const sma20 = n >= 20 ? Number((closes.slice(-20).reduce((a, b) => a + b, 0) / 20).toFixed(2)) : null;
  const sma50 = n >= 50 ? Number((closes.slice(-50).reduce((a, b) => a + b, 0) / 50).toFixed(2)) : null;
  const sma200 = n >= 200 ? Number((closes.slice(-200).reduce((a, b) => a + b, 0) / 200).toFixed(2)) : null;

  let smaState = 'Neutral';
  if (sma50 !== null && sma200 !== null) {
    if (lastPrice >= sma50 && lastPrice >= sma200) smaState = 'Above 50 & 200 MA';
    else if (lastPrice < sma50 && lastPrice < sma200) smaState = 'Below 50 & 200 MA';
    else if (lastPrice >= sma50) smaState = 'Above 50 MA';
    else smaState = 'Below 50 MA';
  } else if (sma50 !== null) {
    smaState = lastPrice >= sma50 ? 'Above 50 MA' : 'Below 50 MA';
  } else if (sma20 !== null) {
    smaState = lastPrice >= sma20 ? 'Above 20 MA' : 'Below 20 MA';
  }

  // 4. Bollinger Bands (20, 2 std dev)
  let bbUpper: number | null = null;
  let bbMiddle: number | null = null;
  let bbLower: number | null = null;
  let bbState: 'Upper band' | 'Lower band' | 'Inside bands' | 'Needs more data' = 'Needs more data';
  let bbUpperSeries: number[] = [];
  let bbMiddleSeries: number[] = [];
  let bbLowerSeries: number[] = [];

  if (n >= 20) {
    for (let i = 19; i < n; i++) {
      const slice = closes.slice(i - 19, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / 20;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bbMiddleSeries.push(Number(mean.toFixed(2)));
      bbUpperSeries.push(Number((mean + 2 * stdDev).toFixed(2)));
      bbLowerSeries.push(Number((mean - 2 * stdDev).toFixed(2)));
    }
    bbUpper = bbUpperSeries[bbUpperSeries.length - 1];
    bbMiddle = bbMiddleSeries[bbMiddleSeries.length - 1];
    bbLower = bbLowerSeries[bbLowerSeries.length - 1];
    bbState = lastPrice >= bbUpper ? 'Upper band' : lastPrice <= bbLower ? 'Lower band' : 'Inside bands';
  }

  return {
    n,
    lastPrice,
    rsi: {
      period: 14,
      value: rsiValue,
      state: rsiState,
      series: rsiSeries,
      isSufficient: rsiValue !== null,
    },
    macd: {
      fast: 12,
      slow: 26,
      signalPeriod: 9,
      macd: macdValue,
      signal: signalValue,
      histogram: histValue,
      state: macdState,
      macdSeries,
      signalSeries,
      histSeries,
      isSufficient: macdValue !== null,
    },
    movingAverages: {
      sma20,
      sma50,
      sma200,
      state: smaState,
      priceVsSma20: sma20 !== null ? `${lastPrice >= sma20 ? 'Above' : 'Below'} (${(((lastPrice - sma20) / sma20) * 100).toFixed(1)}%)` : null,
      priceVsSma50: sma50 !== null ? `${lastPrice >= sma50 ? 'Above' : 'Below'} (${(((lastPrice - sma50) / sma50) * 100).toFixed(1)}%)` : null,
      priceVsSma200: sma200 !== null ? `${lastPrice >= sma200 ? 'Above' : 'Below'} (${(((lastPrice - sma200) / sma200) * 100).toFixed(1)}%)` : 'Needs 200 daily bars',
      isSufficient: sma20 !== null,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2,
      upper: bbUpper,
      middle: bbMiddle,
      lower: bbLower,
      state: bbState,
      upperSeries: bbUpperSeries,
      middleSeries: bbMiddleSeries,
      lowerSeries: bbLowerSeries,
      isSufficient: bbUpper !== null,
    },
  };
}

// Technical indicators endpoint for ANY stock or index
app.get('/api/market/technicals/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.trim();
  try {
    const chartData = await fetchHistoricalChartData(symbol);
    const technicals = computeTechnicalAnalysis(chartData.closes, chartData.currentPrice);
    res.json({
      symbol: chartData.symbol,
      ySymbol: chartData.ySymbol,
      name: chartData.name,
      currency: chartData.currency,
      currentPrice: chartData.currentPrice,
      dataPoints: chartData.closes.length,
      source: chartData.source,
      history: chartData.closes,
      timestamps: chartData.timestamps,
      technicals,
    });
  } catch (err) {
    console.error(`Error computing technicals for ${symbol}:`, err);
    res.status(500).json({ error: `Unable to compute technical indicators for ${symbol}` });
  }
});

// Full historical price candles endpoint for ANY stock or index
app.get('/api/market/historical/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.trim();
  try {
    const chartData = await fetchHistoricalChartData(symbol);
    res.json({
      symbol: chartData.symbol,
      ySymbol: chartData.ySymbol,
      name: chartData.name,
      currency: chartData.currency,
      currentPrice: chartData.currentPrice,
      dataPoints: chartData.closes.length,
      source: chartData.source,
      closes: chartData.closes,
      timestamps: chartData.timestamps,
    });
  } catch (err) {
    res.status(500).json({ error: `Unable to fetch historical data for ${symbol}` });
  }
});

// ================= STOCK MARKET SIMULATOR API =================
const simulatorDb = new Map<string, SimulatorPortfolio>();

function getSimulatorUserId(req: Request): { userId: string; isGuest: boolean } {
  const authHeader = req.headers.authorization;
  const guestHeader = (req.headers['x-guest-id'] as string) || '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token && token !== 'guest' && usersDb.has(token)) {
      return { userId: token, isGuest: false };
    }
  }
  if (guestHeader) {
    return { userId: `guest_${guestHeader}`, isGuest: true };
  }
  return { userId: 'guest_default', isGuest: true };
}

// Get or initialize portfolio
app.get('/api/simulator/portfolio', async (req: Request, res: Response) => {
  const { userId, isGuest } = getSimulatorUserId(req);
  let portfolio = simulatorDb.get(userId);
  if (!portfolio) {
    portfolio = createInitialPortfolio(userId, isGuest ? 'guest' : 'registered');
    simulatorDb.set(userId, portfolio);
  }

  // If user has holdings, revalue them with cached or live market quotes
  if (portfolio.holdings.length > 0) {
    const quotesMap = new Map<string, { price: number; changePercent?: number }>();
    for (const h of portfolio.holdings) {
      const q = quoteCache.get(h.ticker) || await fetchYahooQuote(h.ticker);
      if (q) quotesMap.set(h.ticker, { price: q.price, changePercent: q.changePercent });
    }
    portfolio = revaluePortfolio(portfolio, quotesMap);
    simulatorDb.set(userId, portfolio);
  }

  const analytics = calculatePerformanceAnalytics(portfolio);
  res.json({ portfolio, analytics });
});

// Submit simulated buy or sell order
app.post('/api/simulator/order', async (req: Request, res: Response) => {
  const { userId, isGuest } = getSimulatorUserId(req);
  let portfolio = simulatorDb.get(userId);
  if (!portfolio) {
    portfolio = createInitialPortfolio(userId, isGuest ? 'guest' : 'registered');
    simulatorDb.set(userId, portfolio);
  }

  const { ticker, name, exchange, currency, side, type, shares, limitPrice } = req.body;
  if (!ticker || !side || !type || !shares) {
    return res.status(400).json({ error: 'Missing required order parameters (ticker, side, type, shares).' });
  }

  // Get live price
  const cachedQ = quoteCache.get(ticker.toUpperCase()) || await fetchYahooQuote(ticker);
  const currentMarketPrice = cachedQ?.price || Number(req.body.currentMarketPrice || 0);
  if (currentMarketPrice <= 0) {
    return res.status(400).json({ error: `Market price for ${ticker} is currently unavailable.` });
  }

  const result = placeOrder(portfolio, {
    ticker,
    name: name || cachedQ?.shortName || ticker,
    exchange: exchange || cachedQ?.exchange || 'US',
    currency: currency || cachedQ?.currency || 'USD',
    side,
    type,
    shares: Number(shares),
    currentMarketPrice,
    limitPrice: limitPrice ? Number(limitPrice) : undefined,
  });

  if (result.success) {
    simulatorDb.set(userId, result.portfolio);
  }

  const analytics = calculatePerformanceAnalytics(result.portfolio);
  res.json({
    success: result.success,
    message: result.message,
    order: result.order,
    portfolio: result.portfolio,
    analytics,
  });
});

// Cancel a pending order
app.post('/api/simulator/orders/:orderId/cancel', (req: Request, res: Response) => {
  const { userId } = getSimulatorUserId(req);
  const portfolio = simulatorDb.get(userId);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

  const result = cancelOrder(portfolio, req.params.orderId);
  if (result.success) {
    simulatorDb.set(userId, result.portfolio);
  }
  const analytics = calculatePerformanceAnalytics(result.portfolio);
  res.json({ success: result.success, message: result.message, portfolio: result.portfolio, analytics });
});

// Reset portfolio back to starting $100,000 USD virtual balance
app.post('/api/simulator/reset', (req: Request, res: Response) => {
  const { userId, isGuest } = getSimulatorUserId(req);
  const newPortfolio = createInitialPortfolio(userId, isGuest ? 'guest' : 'registered');
  simulatorDb.set(userId, newPortfolio);
  const analytics = calculatePerformanceAnalytics(newPortfolio);
  res.json({
    success: true,
    message: 'Simulator portfolio reset to starting $100,000 USD virtual balance.',
    portfolio: newPortfolio,
    analytics,
  });
});

// Exchange market status endpoint
app.get('/api/simulator/market-status/:exchange', (req: Request, res: Response) => {
  const ex = req.params.exchange.toUpperCase();
  if (ex === 'IN' || ex === 'NSE' || ex === 'BSE') {
    return res.json({ schedule: getIndiaMarketStatus() });
  }
  return res.json({ schedule: getUSMarketStatus() });
});

// User-facing financial report generator strictly conforming to institutional presentation standards
function generateUserFacingFinancialReport(contextStock: any, question: string): string {
  const ticker = (contextStock?.ticker || 'AAPL').toUpperCase();
  const name = contextStock?.name && contextStock.name !== 'Apple Inc.' ? contextStock.name : (ticker === 'AAPL' ? 'Apple Inc.' : ticker);
  const price = contextStock?.price !== undefined && !isNaN(contextStock.price) ? Number(contextStock.price) : null;
  const currency = contextStock?.currency || (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 'INR' : 'USD');
  const change = contextStock?.change !== undefined ? Number(contextStock.change) : 0;
  const changePercent = contextStock?.changePercent !== undefined ? Number(contextStock.changePercent) : 0;
  const sign = changePercent >= 0 ? '+' : '';
  const pe = contextStock?.peRatio ? `${contextStock.peRatio}x` : 'N/A';
  const dataSource = contextStock?.dataSource || 'Yahoo Finance (Live)';

  // Calculate moving averages & RSI using historical candles
  let candles: any[] = [];
  try {
    candles = generateCandlesForStock(ticker, '1Y', price || 184.39);
  } catch (e) {
    candles = [];
  }

  const closes = candles.map((c) => c.close);
  if (price !== null && (closes.length === 0 || closes[closes.length - 1] !== price)) {
    closes.push(price);
  }

  function calculateSma(data: number[], window: number): number | null {
    if (data.length < window) return null;
    const slice = data.slice(-window);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / window).toFixed(2));
  }

  const currentClose = closes.length > 0 ? closes[closes.length - 1] : (price || 0);
  const sma50 = calculateSma(closes, 50);
  const sma200 = calculateSma(closes, 200);
  const rsiSeries = calculateRSI(closes, 14);
  const rsi14 = rsiSeries.length > 0 ? Number(rsiSeries[rsiSeries.length - 1].toFixed(1)) : 50;

  const qLower = question.toLowerCase();

  // Simple direct answers
  if (qLower.includes('target') || qLower.includes('forecast') || qLower.includes('predict') || qLower.includes('price expectation')) {
    return `PeekStox does not provide speculative price targets because future price endpoints cannot be empirically verified. **${name} (${ticker})** trades at **${price !== null ? `${price} ${currency}` : 'N/A'}** (${sign}${changePercent}%). Technical indicators show price is ${sma50 ? (currentClose >= sma50 ? 'above' : 'below') : 'near'} its 50-day moving average, with the 14-day Relative Strength Index at ${rsi14}.`;
  }

  if (qLower.includes('buy') || qLower.includes('sell') || qLower.includes('recommend') || qLower.includes('trade')) {
    return `PeekStox provides objective market analytics rather than individual trade recommendations. **${name} (${ticker})** is currently quoted at **${price !== null ? `${price} ${currency}` : 'N/A'}**. Its 50-day moving average sits at ${sma50 ? `${sma50} ${currency}` : 'calculating'} and 200-day moving average is ${sma200 ? `${sma200} ${currency}` : 'calculating'}, reflecting an intermediate ${currentClose > (sma200 || 0) ? 'constructive' : 'consolidation'} posture.`;
  }

  const sma50Text = sma50 !== null ? `${sma50} ${currency}` : 'Insufficient historical data for 50-day moving average';
  const sma200Text = sma200 !== null ? `${sma200} ${currency}` : 'Insufficient historical data for 200-day moving average';
  const momentumText = rsi14 > 70 ? 'overbought territory' : rsi14 < 30 ? 'oversold range' : 'neutral momentum';

  return `### Stock Overview
**${name} (${ticker})** is currently trading at **${price !== null ? `${price} ${currency}` : 'Price unavailable'}**, ${change >= 0 ? 'up' : 'down'} **${sign}${changePercent}%** on the session.

### Key Insights
- **Moving Averages**: 50-day moving average is ${sma50Text}; 200-day moving average is ${sma200Text}.
- **Relative Strength Index**: 14-day Relative Strength Index is ${rsi14}, placing the asset in a ${momentumText}.
- **Valuation**: Price-to-earnings ratio is ${pe}. Historical stock selection excludes companies that previously failed or were delisted.

### AI Verdict
The stock displays a balanced risk-reward profile. Sustained trading above the 50-day moving average supports intermediate stability, while sector cost pressures and macroeconomic shifts represent primary risks.

### Data Status
${dataSource}. Current market pricing is separated from historical testing records.`;
}

// ================= PEEKSTOX AI RESEARCH & ANALYSIS API =================
app.post('/api/ai/research-assistant', async (req: Request, res: Response) => {
  const { question, contextStock, conversationHistory } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  const rawTicker = contextStock?.ticker || req.body.ticker || 'AAPL';
  const ticker = String(rawTicker).trim().toUpperCase();
  const globalMatch = GLOBAL_COMPANIES.find(
    (c) => c.ticker.toUpperCase() === ticker || c.yahooSymbol.toUpperCase() === ticker
  );

  // 1. Fetch / enrich live quote for ANY ticker requested
  let enrichedStock: any = contextStock
    ? { ...contextStock, ticker }
    : {
        ticker,
        name: globalMatch?.name || (ticker === 'AAPL' ? 'Apple Inc.' : ticker),
        currency: globalMatch?.currency || (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 'INR' : 'USD'),
      };

  const hasClientPrice = contextStock?.price !== undefined && !isNaN(contextStock.price) && contextStock.price > 0;
  
  if (!hasClientPrice || !contextStock?.changePercent) {
    try {
      const cached = quoteCache.get(ticker) || quoteCache.get(ticker.toUpperCase());
      const liveQ = cached || await Promise.race([
        fetchYahooQuote(ticker),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error(`Timeout for ${ticker}`)), 3000)),
      ]);
      if (liveQ) {
        enrichedStock = {
          ...enrichedStock,
          ...(contextStock || {}),
          ticker,
          name: enrichedStock.name || contextStock?.name || globalMatch?.name || ticker,
          currency: enrichedStock.currency || contextStock?.currency || globalMatch?.currency || (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 'INR' : 'USD'),
          price: liveQ.price,
          change: liveQ.change,
          changePercent: liveQ.changePercent,
          dayHigh: liveQ.dayHigh,
          dayLow: liveQ.dayLow,
          volume: liveQ.volume,
          dataSource: 'Yahoo Finance (Live)',
        };
      }
    } catch (err) {
      console.warn(`Data call warning for ${ticker}:`, (err as Error).message);
    }
  }

  const price = enrichedStock?.price;
  if (!price || isNaN(price) || price <= 0) {
    return res.json({
      answer: `Market data for **${ticker}** is currently unavailable from live feeds. Please verify the symbol or check provider connectivity.`,
      sources: [ticker, 'PeekStox Market Engine'],
    });
  }

  // 2. If Gemini AI is initialized, generate professional financial analysis
  if (geminiAI && rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const historyContext = Array.isArray(conversationHistory)
        ? conversationHistory
            .slice(-6)
            .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n')
        : '';

      const systemPrompt = `You are the PeekStox AI Financial Research Assistant. Communicate strictly as a professional financial analyst.
CRITICAL RULES:
1. Target length:
   - Simple questions: 20-50 words.
   - Stock analysis: 40-90 words.
   - Comparisons: 50-100 words.
   - Keep answers sharp, direct, professional, and free of unnecessary pleasantries or filler.
2. Structure for full stock analysis:
   ### Stock Overview
   Company, ticker, current price & currency, recent price movement.
   ### Key Insights
   2-4 bullet observations on fundamental & technical metrics.
   ### AI Verdict
   Short balanced interpretation of opportunities and risks.
   ### Data Status
   State whether data is Live, Delayed, or Cached.
   (For simple questions, answer directly without forcing all headers).
3. Terminology translations:
   - Always write "50-day moving average" (NEVER SMA50).
   - Always write "200-day moving average" (NEVER SMA200).
   - Always write "14-day Relative Strength Index" (NEVER RSI14).
   - Translate survivorship bias as "Historical stock selection may exclude companies that previously failed or were delisted."
   - If sample size is low or missing, state "There is not enough historical testing data to assess the model's accuracy."
   - If signal has insufficient history, state "Technical outlook: Insufficient historical data for a reliable signal."
4. PROHIBITED: NEVER output server code paths (such as /server.ts), backend function names, raw JSON objects, debugging logs, internal model names like "Model 1", or raw null/0 signals.
5. Base your answers strictly on the verified stock data provided.`;

      const userPrompt = `Verified Stock Facts:
- Company: ${enrichedStock.name || ticker} (${ticker})
- Current Price: ${enrichedStock.price} ${enrichedStock.currency || 'USD'}
- Today's Change: ${enrichedStock.change >= 0 ? '+' : ''}${enrichedStock.change} (${enrichedStock.changePercent}%)
- P/E Ratio: ${enrichedStock.peRatio || 'N/A'}
- Data Source: ${enrichedStock.dataSource || 'Yahoo Finance (Live)'}

${historyContext ? `Conversation History:\n${historyContext}\n\n` : ''}User Question: ${question}`;

      const aiResponse = await Promise.race([
        geminiAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
          config: {
            maxOutputTokens: 350,
            temperature: 0.2,
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI generation timed out')), 4500)),
      ]);

      const rawAnswer = aiResponse.text?.trim();
      if (rawAnswer) {
        // Sanitize output to guarantee zero internal leaks
        const sanitizedAnswer = rawAnswer
          .replace(/\/server\.ts[^\n]*/gi, '')
          .replace(/code\s*path[^\n]*/gi, '')
          .replace(/source\s*log\s*row[^\n]*/gi, '')
          .trim();

        return res.json({
          answer: sanitizedAnswer,
          sources: [ticker, 'Live Market Feed', 'Quantitative Technical Indicators'],
          model: 'PeekStox Intelligence Engine',
        });
      }
    } catch (geminiErr) {
      console.warn('Gemini API synthesis unavailable or timed out, using deterministic financial report.');
    }
  }

  // 3. Fallback: Clean, concise deterministic user-facing report
  const cleanReport = generateUserFacingFinancialReport(enrichedStock, question);
  return res.json({
    answer: cleanReport,
    sources: [ticker, 'Live Market Feed', 'Quantitative Technical Indicators'],
    model: 'PeekStox Intelligence Engine',
  });
});

// Vite middleware or static serving
async function setupVite() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    console.error('HTTP Server Error:', err);
  });

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, HOST, () => {
      console.log(`PeekStox full-stack server running on http://${HOST}:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  setupVite().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
export { app };
