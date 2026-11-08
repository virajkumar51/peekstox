/**
 * PeekStox — Real Stock Market Schedules & Exchange Calendars
 * Accurately tracks US (NYSE/NASDAQ) and Indian (NSE/BSE) trading hours,
 * pre-market, regular sessions, after-hours, weekends, official holidays,
 * daylight saving adjustments, and calculates next scheduled opening times.
 */

import { ExchangeScheduleInfo, MarketScheduleStatus } from '../types/simulator';

interface HolidayDef {
  date: string; // YYYY-MM-DD
  name: string;
  isSpecialSession?: boolean;
  specialSessionNote?: string;
}

// Official US Exchange Holidays (NYSE / NASDAQ)
const US_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'Martin Luther King, Jr. Day',
  '2025-02-17': "Washington's Birthday / Presidents' Day",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth National Independence Day',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving Day',
  '2025-12-25': 'Christmas Day',
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King, Jr. Day',
  '2026-02-16': "Washington's Birthday / Presidents' Day",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth National Independence Day',
  '2026-07-03': 'Independence Day (Observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-12-25': 'Christmas Day',
  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Martin Luther King, Jr. Day',
  '2027-02-15': "Washington's Birthday / Presidents' Day",
  '2027-03-26': 'Good Friday',
  '2027-05-31': 'Memorial Day',
  '2027-06-18': 'Juneteenth (Observed)',
  '2027-07-05': 'Independence Day (Observed)',
  '2027-09-06': 'Labor Day',
  '2027-11-25': 'Thanksgiving Day',
  '2027-12-24': 'Christmas (Observed)',
};

// Official Indian Exchange Holidays (NSE / BSE)
const INDIA_HOLIDAYS: Record<string, HolidayDef> = {
  // 2025
  '2025-01-26': { date: '2025-01-26', name: 'Republic Day' },
  '2025-02-26': { date: '2025-02-26', name: 'Maha Shivratri' },
  '2025-03-14': { date: '2025-03-14', name: 'Holi' },
  '2025-03-31': { date: '2025-03-31', name: 'Id-Ul-Fitr' },
  '2025-04-10': { date: '2025-04-10', name: 'Mahavir Jayanti' },
  '2025-04-14': { date: '2025-04-14', name: 'Dr. Baba Saheb Ambedkar Jayanti' },
  '2025-04-18': { date: '2025-04-18', name: 'Good Friday' },
  '2025-05-01': { date: '2025-05-01', name: 'Maharashtra Day' },
  '2025-08-15': { date: '2025-08-15', name: 'Independence Day' },
  '2025-08-27': { date: '2025-08-27', name: 'Ganesh Chaturthi' },
  '2025-10-02': { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti' },
  '2025-10-21': { date: '2025-10-21', name: 'Diwali Laxmi Pujan', isSpecialSession: true, specialSessionNote: 'Muhurat Trading (6:00 PM - 7:15 PM IST)' },
  '2025-10-22': { date: '2025-10-22', name: 'Diwali Balipratipada' },
  '2025-11-05': { date: '2025-11-05', name: 'Prakash Gurpurb Sri Guru Nanak Dev' },
  '2025-12-25': { date: '2025-12-25', name: 'Christmas' },
  // 2026
  '2026-01-26': { date: '2026-01-26', name: 'Republic Day' },
  '2026-03-03': { date: '2026-03-03', name: 'Holi' },
  '2026-03-20': { date: '2026-03-20', name: 'Id-Ul-Fitr' },
  '2026-04-03': { date: '2026-04-03', name: 'Good Friday' },
  '2026-04-14': { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  '2026-05-01': { date: '2026-05-01', name: 'Maharashtra Day' },
  '2026-08-15': { date: '2026-08-15', name: 'Independence Day' },
  '2026-10-02': { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  '2026-10-20': { date: '2026-10-20', name: 'Dussehra' },
  '2026-11-08': { date: '2026-11-08', name: 'Diwali Laxmi Pujan', isSpecialSession: true, specialSessionNote: 'Diwali Muhurat Trading' },
  '2026-11-09': { date: '2026-11-09', name: 'Diwali Balipratipada' },
  '2026-11-24': { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  '2026-12-25': { date: '2026-12-25', name: 'Christmas' },
};

/**
 * Accurately extracts year, month, day, hour, minute, second in target timezone
 */
export function getZonedTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);
  const weekday = getPart('weekday'); // 'Mon', 'Tue', etc.

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const totalMinutes = hour * 60 + minute;

  return { year, month, day, hour, minute, second, weekday, dateStr, totalMinutes };
}

/**
 * Determine exchange region from ticker and exchange strings
 */
export function getExchangeRegion(ticker: string, exchange?: string): 'US' | 'IN' | 'GLOBAL' {
  const upper = ticker.toUpperCase();
  const exUpper = (exchange || '').toUpperCase();

  if (upper.endsWith('.NS') || upper.endsWith('.BO') || exUpper.includes('NSE') || exUpper.includes('BSE')) {
    return 'IN';
  }
  if (
    exUpper.includes('NASDAQ') ||
    exUpper.includes('NYSE') ||
    exUpper.includes('AMEX') ||
    exUpper.includes('BATS') ||
    ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'TSLA', 'META', 'BRK.B', 'JPM'].includes(upper)
  ) {
    return 'US';
  }
  return 'US'; // default to US for standard globally traded tickers
}

/**
 * Calculates current market schedule status for US Markets (NYSE / NASDAQ)
 * Timezone: America/New_York
 * Pre-Market: 04:00 - 09:30 ET
 * Regular Trading: 09:30 - 16:00 ET (Mon-Fri)
 * After-Hours: 16:00 - 20:00 ET
 */
export function getUSMarketStatus(now: Date = new Date()): ExchangeScheduleInfo {
  const timeZone = 'America/New_York';
  const { dateStr, hour, minute, weekday, totalMinutes } = getZonedTimeParts(now, timeZone);

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const holidayName = US_HOLIDAYS[dateStr];

  const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ET`;

  // Check holiday
  if (holidayName) {
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'HOLIDAY',
      statusLabel: 'HOLIDAY',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: getNextUSOpeningText(now),
      holidayName,
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  }

  // Check weekend
  if (isWeekend) {
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'CLOSED',
      statusLabel: 'MARKET CLOSED',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: getNextUSOpeningText(now),
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  }

  // Weekday session matching:
  // 04:00 to 09:30 -> Pre-Market (240 to 570 min)
  // 09:30 to 16:00 -> Regular Open (570 to 960 min)
  // 16:00 to 20:00 -> After-Hours (960 to 1200 min)
  // 20:00 to 04:00 -> Closed
  if (totalMinutes >= 570 && totalMinutes < 960) {
    const minsLeft = 960 - totalMinutes;
    const hoursLeft = Math.floor(minsLeft / 60);
    const mLeft = minsLeft % 60;
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'OPEN',
      statusLabel: 'MARKET OPEN',
      isOpenForTrading: true,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: `Closes in ${hoursLeft > 0 ? `${hoursLeft}h ` : ''}${mLeft}m at 4:00 PM ET`,
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  } else if (totalMinutes >= 240 && totalMinutes < 570) {
    const minsToOpen = 570 - totalMinutes;
    const h = Math.floor(minsToOpen / 60);
    const m = minsToOpen % 60;
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'PRE_MARKET',
      statusLabel: 'PRE-MARKET',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: `Regular session opens in ${h > 0 ? `${h}h ` : ''}${m}m (9:30 AM ET)`,
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  } else if (totalMinutes >= 960 && totalMinutes < 1200) {
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'AFTER_HOURS',
      statusLabel: 'AFTER-HOURS',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: getNextUSOpeningText(now),
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  } else {
    return {
      exchangeId: 'US',
      exchangeName: 'NYSE & NASDAQ',
      mic: 'XNYS / XNAS',
      status: 'CLOSED',
      statusLabel: 'MARKET CLOSED',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'America/New_York (ET)',
      nextSessionText: getNextUSOpeningText(now),
      sessionDetails: {
        preMarket: '04:00 - 09:30 ET',
        regular: '09:30 - 16:00 ET',
        afterHours: '16:00 - 20:00 ET',
      },
    };
  }
}

/**
 * Calculates current market schedule status for Indian Markets (NSE / BSE)
 * Timezone: Asia/Kolkata (IST)
 * Pre-Market: 09:00 - 09:15 IST
 * Regular Trading: 09:15 - 15:30 IST (Mon-Fri)
 * Post-Market / Closing: 15:40 - 16:00 IST
 */
export function getIndiaMarketStatus(now: Date = new Date()): ExchangeScheduleInfo {
  const timeZone = 'Asia/Kolkata';
  const { dateStr, hour, minute, weekday, totalMinutes } = getZonedTimeParts(now, timeZone);

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const holiday = INDIA_HOLIDAYS[dateStr];

  const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`;

  // Check special session (e.g. Diwali Muhurat trading)
  if (holiday?.isSpecialSession) {
    // 18:00 to 19:15 IST
    if (totalMinutes >= 1080 && totalMinutes <= 1155) {
      return {
        exchangeId: 'IN',
        exchangeName: 'NSE & BSE',
        mic: 'XNSE / XBOM',
        status: 'SPECIAL_SESSION',
        statusLabel: 'SPECIAL SESSION',
        isOpenForTrading: true,
        currentTimeInExchange: timeFormatted,
        exchangeTimezone: 'Asia/Kolkata (IST)',
        nextSessionText: `Special Session active: ${holiday.specialSessionNote || 'Muhurat Trading'}`,
        holidayName: holiday.name,
        sessionDetails: {
          preMarket: '09:00 - 09:15 IST',
          regular: '09:15 - 15:30 IST',
          afterHours: '15:40 - 16:00 IST',
        },
      };
    }
  }

  // Check holiday
  if (holiday && !holiday.isSpecialSession) {
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'HOLIDAY',
      statusLabel: 'HOLIDAY',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: getNextIndiaOpeningText(now),
      holidayName: holiday.name,
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  }

  // Check weekend
  if (isWeekend) {
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'CLOSED',
      statusLabel: 'MARKET CLOSED',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: getNextIndiaOpeningText(now),
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  }

  // Weekday session matching:
  // 09:00 to 09:15 -> Pre-Market (540 to 555 min)
  // 09:15 to 15:30 -> Regular Open (555 to 930 min)
  // 15:40 to 16:00 -> Post-Market (940 to 960 min)
  // Others -> Closed
  if (totalMinutes >= 555 && totalMinutes < 930) {
    const minsLeft = 930 - totalMinutes;
    const hoursLeft = Math.floor(minsLeft / 60);
    const mLeft = minsLeft % 60;
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'OPEN',
      statusLabel: 'MARKET OPEN',
      isOpenForTrading: true,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: `Closes in ${hoursLeft > 0 ? `${hoursLeft}h ` : ''}${mLeft}m at 3:30 PM IST`,
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  } else if (totalMinutes >= 540 && totalMinutes < 555) {
    const minsToOpen = 555 - totalMinutes;
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'PRE_MARKET',
      statusLabel: 'PRE-MARKET',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: `Regular session opens in ${minsToOpen}m (9:15 AM IST)`,
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  } else if (totalMinutes >= 940 && totalMinutes < 960) {
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'AFTER_HOURS',
      statusLabel: 'AFTER-HOURS',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: getNextIndiaOpeningText(now),
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  } else {
    return {
      exchangeId: 'IN',
      exchangeName: 'NSE & BSE',
      mic: 'XNSE / XBOM',
      status: 'CLOSED',
      statusLabel: 'MARKET CLOSED',
      isOpenForTrading: false,
      currentTimeInExchange: timeFormatted,
      exchangeTimezone: 'Asia/Kolkata (IST)',
      nextSessionText: getNextIndiaOpeningText(now),
      sessionDetails: {
        preMarket: '09:00 - 09:15 IST',
        regular: '09:15 - 15:30 IST',
        afterHours: '15:40 - 16:00 IST',
      },
    };
  }
}

/**
 * Computes human-friendly next opening schedule for US markets
 */
function getNextUSOpeningText(fromDate: Date): string {
  const timeZone = 'America/New_York';
  const current = new Date(fromDate.getTime());

  // Check if today is a weekday and before 9:30 AM ET
  const partsToday = getZonedTimeParts(current, timeZone);
  if (partsToday.weekday !== 'Sat' && partsToday.weekday !== 'Sun' && !US_HOLIDAYS[partsToday.dateStr]) {
    if (partsToday.totalMinutes < 570) {
      return 'Opens today at 9:30 AM ET';
    }
  }

  // Iterate forward up to 10 days to find next trading day
  for (let i = 1; i <= 10; i++) {
    const future = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    const parts = getZonedTimeParts(future, timeZone);
    if (parts.weekday !== 'Sat' && parts.weekday !== 'Sun' && !US_HOLIDAYS[parts.dateStr]) {
      if (i === 1) {
        return 'Opens tomorrow at 9:30 AM ET';
      }
      return `Opens ${parts.weekday}, ${parts.month}/${parts.day} at 9:30 AM ET`;
    }
  }
  return 'Opens next regular session at 9:30 AM ET';
}

/**
 * Computes human-friendly next opening schedule for Indian markets
 */
function getNextIndiaOpeningText(fromDate: Date): string {
  const timeZone = 'Asia/Kolkata';
  const current = new Date(fromDate.getTime());

  const partsToday = getZonedTimeParts(current, timeZone);
  if (partsToday.weekday !== 'Sat' && partsToday.weekday !== 'Sun' && !INDIA_HOLIDAYS[partsToday.dateStr]) {
    if (partsToday.totalMinutes < 555) {
      return 'Opens today at 9:15 AM IST';
    }
  }

  for (let i = 1; i <= 10; i++) {
    const future = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    const parts = getZonedTimeParts(future, timeZone);
    if (parts.weekday !== 'Sat' && parts.weekday !== 'Sun' && !INDIA_HOLIDAYS[parts.dateStr]) {
      if (i === 1) {
        return 'Opens tomorrow at 9:15 AM IST';
      }
      return `Opens ${parts.weekday}, ${parts.month}/${parts.day} at 9:15 AM IST`;
    }
  }
  return 'Opens next regular session at 9:15 AM IST';
}

/**
 * Returns market schedule information for any stock quote or ticker
 */
export function getMarketScheduleForStock(ticker: string, exchange?: string): ExchangeScheduleInfo {
  const region = getExchangeRegion(ticker, exchange);
  if (region === 'IN') {
    return getIndiaMarketStatus();
  }
  return getUSMarketStatus();
}
