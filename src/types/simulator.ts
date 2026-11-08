/**
 * PeekStox — Stock Market Simulator Types
 * Professional simulated paper-trading system with virtual currency,
 * exchange schedules, realistic order execution, and performance tracking.
 */

export type SimulatorOrderType = 'market' | 'limit';
export type SimulatorOrderSide = 'buy' | 'sell';
export type SimulatorOrderStatus = 'pending' | 'executed' | 'cancelled' | 'rejected';

export type MarketScheduleStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'PRE_MARKET'
  | 'AFTER_HOURS'
  | 'HOLIDAY'
  | 'SPECIAL_SESSION';

export interface ExchangeScheduleInfo {
  exchangeId: 'US' | 'IN' | 'GLOBAL';
  exchangeName: string;
  mic: string; // Market Identifier Code (e.g. XNYS, XNAS, XNSE, XBOM)
  status: MarketScheduleStatus;
  statusLabel: string;
  isOpenForTrading: boolean;
  currentTimeInExchange: string;
  exchangeTimezone: string;
  nextSessionText: string;
  nextOpenDate?: string;
  holidayName?: string;
  sessionDetails: {
    preMarket: string;
    regular: string;
    afterHours: string;
  };
}

export interface SimulatorHolding {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdated: string;
}

export interface SimulatorTransaction {
  id: string;
  orderId: string;
  ticker: string;
  name: string;
  exchange: string;
  side: SimulatorOrderSide;
  type: SimulatorOrderType;
  shares: number;
  executionPrice: number;
  totalValue: number;
  fee: number;
  realizedPnL?: number;
  timestamp: string;
  notes?: string;
}

export interface SimulatorOrder {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  side: SimulatorOrderSide;
  type: SimulatorOrderType;
  shares: number;
  limitPrice?: number;
  estimatedPrice: number;
  estimatedValue: number;
  fee: number;
  status: SimulatorOrderStatus;
  placedAt: string;
  executedAt?: string;
  cancelledAt?: string;
  executionPrice?: number;
  notes?: string;
}

export interface PortfolioSnapshotPoint {
  timestamp: string;
  date: string;
  portfolioValue: number;
  cash: number;
  invested: number;
  pnl: number;
}

export interface SimulatorPerformanceStats {
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  dailyReturnPercent: number;
  weeklyReturn: number;
  weeklyReturnPercent: number;
  monthlyReturn: number;
  monthlyReturnPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  bestPerformer?: {
    ticker: string;
    name: string;
    pnl: number;
    pnlPercent: number;
  };
  worstPerformer?: {
    ticker: string;
    name: string;
    pnl: number;
    pnlPercent: number;
  };
}

export interface SimulatorPortfolio {
  userId: string;
  accountType: 'guest' | 'registered';
  startingBalance: number; // Exactly $100,000 USD
  cash: number;
  invested: number;
  portfolioValue: number;
  todayPnL: number;
  todayPnLPercent: number;
  overallPnL: number;
  overallPnLPercent: number;
  realizedPnL: number;
  holdings: SimulatorHolding[];
  orders: SimulatorOrder[];
  transactions: SimulatorTransaction[];
  history: PortfolioSnapshotPoint[];
  createdAt: string;
  lastUpdatedAt: string;
}
