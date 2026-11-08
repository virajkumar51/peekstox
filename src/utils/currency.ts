/**
 * Multi-Currency and Global Market Exchange Utilities
 * Handles currencies across North America, Europe, Asia-Pacific, Latin America, and Middle East
 */

import { convertAndFormatPrice, USD_RATES, getPriceConversionDetails } from './i18n';

export interface WorldExchange {
  id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  openUtcHour: number; // e.g. 13.5 = 13:30 UTC for NYSE
  closeUtcHour: number; // e.g. 20.0 = 20:00 UTC for NYSE
  openLocal: string;
  closeLocal: string;
}

export const WORLD_EXCHANGES: WorldExchange[] = [
  {
    id: 'NYSE',
    name: 'New York Stock Exchange / NASDAQ',
    city: 'New York',
    country: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
    currencySymbol: '$',
    openUtcHour: 13.5, // 9:30 AM EDT is 13:30 UTC
    closeUtcHour: 20.0, // 4:00 PM EDT is 20:00 UTC
    openLocal: '09:30',
    closeLocal: '16:00',
  },
  {
    id: 'LSE',
    name: 'London Stock Exchange',
    city: 'London',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    currency: 'GBP',
    currencySymbol: '£',
    openUtcHour: 7.0, // 8:00 AM BST is 7:00 UTC
    closeUtcHour: 15.5, // 4:30 PM BST is 15:30 UTC
    openLocal: '08:00',
    closeLocal: '16:30',
  },
  {
    id: 'XETRA',
    name: 'Deutsche Börse (Frankfurt)',
    city: 'Frankfurt',
    country: 'Germany',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    currencySymbol: '€',
    openUtcHour: 7.0, // 9:00 AM CEST is 7:00 UTC
    closeUtcHour: 15.5, // 5:30 PM CEST is 15:30 UTC
    openLocal: '09:00',
    closeLocal: '17:30',
  },
  {
    id: 'EURONEXT',
    name: 'Euronext Paris / Amsterdam',
    city: 'Paris',
    country: 'France / Netherlands',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    currencySymbol: '€',
    openUtcHour: 7.0,
    closeUtcHour: 15.5,
    openLocal: '09:00',
    closeLocal: '17:30',
  },
  {
    id: 'SIX',
    name: 'SIX Swiss Exchange',
    city: 'Zurich',
    country: 'Switzerland',
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    currencySymbol: 'CHF ',
    openUtcHour: 7.0,
    closeUtcHour: 15.5,
    openLocal: '09:00',
    closeLocal: '17:30',
  },
  {
    id: 'TSE',
    name: 'Tokyo Stock Exchange',
    city: 'Tokyo',
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    currencySymbol: '¥',
    openUtcHour: 0.0, // 9:00 AM JST is 0:00 UTC
    closeUtcHour: 6.5, // 3:30 PM JST is 6:30 UTC
    openLocal: '09:00',
    closeLocal: '15:30',
  },
  {
    id: 'HKEX',
    name: 'Hong Kong Exchanges (HKEX)',
    city: 'Hong Kong',
    country: 'Hong Kong / China',
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    currencySymbol: 'HK$',
    openUtcHour: 1.5, // 9:30 AM HKT is 1:30 UTC
    closeUtcHour: 8.0, // 4:00 PM HKT is 8:00 UTC
    openLocal: '09:30',
    closeLocal: '16:00',
  },
  {
    id: 'NSE',
    name: 'National Stock Exchange of India (NSE / BSE)',
    city: 'Mumbai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    currencySymbol: '₹',
    openUtcHour: 3.75, // 9:15 AM IST is 3:45 UTC
    closeUtcHour: 10.0, // 3:30 PM IST is 10:00 UTC
    openLocal: '09:15',
    closeLocal: '15:30',
  },
  {
    id: 'KRX',
    name: 'Korea Exchange',
    city: 'Seoul',
    country: 'South Korea',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    currencySymbol: '₩',
    openUtcHour: 0.0, // 9:00 AM KST is 0:00 UTC
    closeUtcHour: 6.5, // 3:30 PM KST is 6:30 UTC
    openLocal: '09:00',
    closeLocal: '15:30',
  },
  {
    id: 'ASX',
    name: 'Australian Securities Exchange',
    city: 'Sydney',
    country: 'Australia',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    currencySymbol: 'A$',
    openUtcHour: 23.0, // 10:00 AM AEST
    closeUtcHour: 5.0, // 4:00 PM AEST
    openLocal: '10:00',
    closeLocal: '16:00',
  },
  {
    id: 'B3',
    name: 'B3 - Brasil Bolsa Balcão',
    city: 'São Paulo',
    country: 'Brazil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    currencySymbol: 'R$',
    openUtcHour: 13.0,
    closeUtcHour: 20.0,
    openLocal: '10:00',
    closeLocal: '17:00',
  },
  {
    id: 'TSX',
    name: 'Toronto Stock Exchange',
    city: 'Toronto',
    country: 'Canada',
    timezone: 'America/Toronto',
    currency: 'CAD',
    currencySymbol: 'C$',
    openUtcHour: 13.5,
    closeUtcHour: 20.0,
    openLocal: '09:30',
    closeLocal: '16:00',
  },
];

export function getCurrencySymbol(currency: string = 'USD'): string {
  const norm = currency?.toUpperCase() || 'USD';
  switch (norm) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
    case 'GBP_PENCE':
    case 'GBPENCE':
    case 'GBX':
    case 'GBP_P':
      return '£';
    case 'JPY':
      return '¥';
    case 'INR':
      return '₹';
    case 'CHF':
      return 'CHF ';
    case 'KRW':
      return '₩';
    case 'HKD':
      return 'HK$';
    case 'TWD':
      return 'NT$';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    case 'BRL':
      return 'R$';
    case 'SAR':
      return 'SR ';
    case 'DKK':
    case 'SEK':
    case 'NOK':
      return 'kr ';
    default:
      return `${currency} `;
  }
}

export { getPriceConversionDetails, USD_RATES } from './i18n';

export function formatStockPrice(
  price: number,
  currency: string = 'USD',
  baseCurrency?: string,
  options?: { showOriginalBadge?: boolean }
): string {
  if (price === undefined || price === null || isNaN(price)) return '—';
  let resolvedBase = baseCurrency;
  if (!resolvedBase && typeof window !== 'undefined') {
    try {
      resolvedBase = localStorage.getItem('pkstox_currency') || undefined;
    } catch {
      /* ignore */
    }
  }
  return convertAndFormatPrice(price, currency, resolvedBase || 'USD', options);
}

export function formatMarketCap(cap: number, currency: string = 'USD', baseCurrency?: string): string {
  if (!cap || isNaN(cap)) return '—';
  let resolvedBase = baseCurrency;
  if (!resolvedBase && typeof window !== 'undefined') {
    try {
      resolvedBase = localStorage.getItem('pkstox_currency') || undefined;
    } catch {
      /* ignore */
    }
  }
  const currNorm = (currency || 'USD').toUpperCase();
  const baseNorm = (resolvedBase || currNorm).toUpperCase();

  // If base currency differs, convert the market cap as well
  let convertedCap = cap;
  if (baseNorm !== currNorm) {
    const capInUsd = currNorm === 'USD' ? cap : cap / (USD_RATES[currNorm] || 1);
    convertedCap = baseNorm === 'USD' ? capInUsd : capInUsd * (USD_RATES[baseNorm] || 1);
  }

  const sym = getCurrencySymbol(baseNorm);

  if (baseNorm === 'INR') {
    // Crore notation for Indian Rupee
    const cr = convertedCap / 10000000;
    if (cr >= 100000) {
      return `₹${(cr / 100000).toFixed(2)} Lakh Cr`;
    }
    return `₹${cr.toFixed(0)} Cr`;
  }

  if (convertedCap >= 1e12) {
    return `${sym}${(convertedCap / 1e12).toFixed(2)}T`;
  }
  if (convertedCap >= 1e9) {
    return `${sym}${(convertedCap / 1e9).toFixed(2)}B`;
  }
  if (convertedCap >= 1e6) {
    return `${sym}${(convertedCap / 1e6).toFixed(2)}M`;
  }
  return `${sym}${convertedCap.toLocaleString('en-US')}`;
}

export interface ExchangeStatusInfo {
  id: string;
  name: string;
  city: string;
  country: string;
  status: 'Open' | 'Closed' | 'Pre-Market';
  statusColor: string;
  localTime: string;
}

export function getExchangeStatus(exchange: WorldExchange, now = new Date()): ExchangeStatusInfo {
  // Get current UTC hour decimal
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday, 6 is Saturday

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  let status: 'Open' | 'Closed' | 'Pre-Market' = 'Closed';

  if (!isWeekend) {
    if (exchange.openUtcHour <= exchange.closeUtcHour) {
      if (utcHours >= exchange.openUtcHour && utcHours < exchange.closeUtcHour) {
        status = 'Open';
      } else if (utcHours >= exchange.openUtcHour - 1.5 && utcHours < exchange.openUtcHour) {
        status = 'Pre-Market';
      }
    } else {
      // Wraps around midnight (e.g. Tokyo / Sydney)
      if (utcHours >= exchange.openUtcHour || utcHours < exchange.closeUtcHour) {
        status = 'Open';
      }
    }
  }

  // Format local time in exchange timezone
  let localTime = '';
  try {
    localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: exchange.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(now);
  } catch (e) {
    localTime = `${now.getHours()}:${now.getMinutes()}`;
  }

  let statusColor = 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50';
  if (status === 'Open') {
    statusColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  } else if (status === 'Pre-Market') {
    statusColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  }

  return {
    id: exchange.id,
    name: exchange.name,
    city: exchange.city,
    country: exchange.country,
    status,
    statusColor,
    localTime,
  };
}
