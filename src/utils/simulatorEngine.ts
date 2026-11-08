/**
 * PeekStox — Stock Market Simulator Engine
 * Core financial calculations, order execution, risk checks,
 * portfolio valuation, and performance analytics.
 */

import {
  SimulatorHolding,
  SimulatorOrder,
  SimulatorOrderSide,
  SimulatorOrderType,
  SimulatorPerformanceStats,
  SimulatorPortfolio,
  SimulatorTransaction,
} from '../types/simulator';
import { getMarketScheduleForStock } from './marketSchedule';

export const INITIAL_VIRTUAL_BALANCE = 100000; // $100,000 USD
export const BROKERAGE_FLAT_FEE = 1.0; // $1.00 flat fee per trade
export const BROKERAGE_RATE = 0.0005; // 0.05% of order value
export const SIMULATED_SLIPPAGE_RATE = 0.0002; // 0.02% simulated market slippage

/**
 * Calculates realistic simulated trading fee
 */
export function calculateSimulatedFee(shares: number, price: number): number {
  const tradeValue = shares * price;
  const variableFee = tradeValue * BROKERAGE_RATE;
  return Number((BROKERAGE_FLAT_FEE + variableFee).toFixed(2));
}

/**
 * Generates an empty initial portfolio with exactly $100,000
 */
export function createInitialPortfolio(userId: string, accountType: 'guest' | 'registered'): SimulatorPortfolio {
  const now = new Date().toISOString();
  return {
    userId,
    accountType,
    startingBalance: INITIAL_VIRTUAL_BALANCE,
    cash: INITIAL_VIRTUAL_BALANCE,
    invested: 0,
    portfolioValue: INITIAL_VIRTUAL_BALANCE,
    todayPnL: 0,
    todayPnLPercent: 0,
    overallPnL: 0,
    overallPnLPercent: 0,
    realizedPnL: 0,
    holdings: [],
    orders: [],
    transactions: [],
    history: [
      {
        timestamp: now,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        portfolioValue: INITIAL_VIRTUAL_BALANCE,
        cash: INITIAL_VIRTUAL_BALANCE,
        invested: 0,
        pnl: 0,
      },
    ],
    createdAt: now,
    lastUpdatedAt: now,
  };
}

/**
 * Updates all holding prices using latest live market quotes and recalculates portfolio
 */
export function revaluePortfolio(
  portfolio: SimulatorPortfolio,
  latestQuotes: Map<string, { price: number; changePercent?: number }>
): SimulatorPortfolio {
  let newInvested = 0;
  let newCurrentValue = 0;
  let totalDayChangeDollars = 0;

  const updatedHoldings: SimulatorHolding[] = portfolio.holdings.map((h) => {
    const quote = latestQuotes.get(h.ticker.toUpperCase()) || latestQuotes.get(h.ticker);
    const livePrice = quote?.price && quote.price > 0 ? quote.price : h.currentPrice;
    const currentVal = Number((h.shares * livePrice).toFixed(2));
    const invested = Number((h.shares * h.averageCost).toFixed(2));
    const unPnL = Number((currentVal - invested).toFixed(2));
    const unPnLPercent = invested > 0 ? Number(((unPnL / invested) * 100).toFixed(2)) : 0;

    if (quote?.changePercent) {
      const dayDollar = currentVal * (quote.changePercent / 100);
      totalDayChangeDollars += dayDollar;
    }

    newInvested += invested;
    newCurrentValue += currentVal;

    return {
      ...h,
      currentPrice: livePrice,
      totalInvested: invested,
      currentValue: currentVal,
      unrealizedPnL: unPnL,
      unrealizedPnLPercent: unPnLPercent,
      lastUpdated: new Date().toISOString(),
    };
  });

  const totalPortfolioValue = Number((portfolio.cash + newCurrentValue).toFixed(2));
  const overallPnL = Number((totalPortfolioValue - portfolio.startingBalance).toFixed(2));
  const overallPnLPercent = Number(((overallPnL / portfolio.startingBalance) * 100).toFixed(2));
  const todayPnL = Number(totalDayChangeDollars.toFixed(2));
  const todayPnLPercent = totalPortfolioValue > 0 ? Number(((todayPnL / totalPortfolioValue) * 100).toFixed(2)) : 0;

  return {
    ...portfolio,
    invested: Number(newInvested.toFixed(2)),
    portfolioValue: totalPortfolioValue,
    holdings: updatedHoldings,
    todayPnL,
    todayPnLPercent,
    overallPnL,
    overallPnLPercent,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export interface PlaceOrderParams {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  side: SimulatorOrderSide;
  type: SimulatorOrderType;
  shares: number;
  currentMarketPrice: number;
  limitPrice?: number;
}

export interface PlaceOrderResult {
  success: boolean;
  order?: SimulatorOrder;
  portfolio: SimulatorPortfolio;
  message: string;
}

/**
 * Places a simulated order (market or limit) and executes if eligible
 */
export function placeOrder(
  portfolio: SimulatorPortfolio,
  params: PlaceOrderParams
): PlaceOrderResult {
  const { ticker, name, exchange, currency, side, type, shares, currentMarketPrice, limitPrice } = params;

  if (shares <= 0 || !Number.isInteger(shares)) {
    return {
      success: false,
      portfolio,
      message: 'Please enter a valid positive whole number of shares.',
    };
  }

  if (currentMarketPrice <= 0) {
    return {
      success: false,
      portfolio,
      message: 'Unable to trade: live market price is currently unavailable for this asset.',
    };
  }

  const schedule = getMarketScheduleForStock(ticker, exchange);
  const now = new Date().toISOString();
  const estimatedExecutionPrice =
    type === 'limit' && limitPrice ? limitPrice : currentMarketPrice;
  const estimatedTradeValue = shares * estimatedExecutionPrice;
  const fee = calculateSimulatedFee(shares, estimatedExecutionPrice);

  // 1. Validation for BUY
  if (side === 'buy') {
    const totalRequired = estimatedTradeValue + fee;
    if (totalRequired > portfolio.cash) {
      return {
        success: false,
        portfolio,
        message: `Insufficient buying power. This order requires $${totalRequired.toFixed(2)} ($${estimatedTradeValue.toFixed(2)} + $${fee.toFixed(2)} fees), but your available cash is $${portfolio.cash.toFixed(2)}.`,
      };
    }
  }

  // 2. Validation for SELL
  if (side === 'sell') {
    const existingHolding = portfolio.holdings.find(
      (h) => h.ticker.toUpperCase() === ticker.toUpperCase()
    );
    const sharesOwned = existingHolding?.shares || 0;
    if (sharesOwned < shares) {
      return {
        success: false,
        portfolio,
        message: `Insufficient shares. You currently own ${sharesOwned} shares of ${ticker}, but requested to sell ${shares} shares.`,
      };
    }
  }

  // 3. Determine if order can execute immediately
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let canExecuteNow = false;
  let actualExecPrice = currentMarketPrice;

  if (schedule.isOpenForTrading) {
    if (type === 'market') {
      canExecuteNow = true;
      // Add slight realistic slippage for market orders
      actualExecPrice =
        side === 'buy'
          ? Number((currentMarketPrice * (1 + SIMULATED_SLIPPAGE_RATE)).toFixed(2))
          : Number((currentMarketPrice * (1 - SIMULATED_SLIPPAGE_RATE)).toFixed(2));
    } else if (type === 'limit' && limitPrice) {
      if (side === 'buy' && currentMarketPrice <= limitPrice) {
        canExecuteNow = true;
        actualExecPrice = Math.min(currentMarketPrice, limitPrice);
      } else if (side === 'sell' && currentMarketPrice >= limitPrice) {
        canExecuteNow = true;
        actualExecPrice = Math.max(currentMarketPrice, limitPrice);
      }
    }
  }

  // 4. Create Order Object
  const newOrder: SimulatorOrder = {
    id: orderId,
    ticker: ticker.toUpperCase(),
    name,
    exchange,
    side,
    type,
    shares,
    limitPrice: type === 'limit' ? limitPrice : undefined,
    estimatedPrice: estimatedExecutionPrice,
    estimatedValue: Number(estimatedTradeValue.toFixed(2)),
    fee,
    status: canExecuteNow ? 'executed' : 'pending',
    placedAt: now,
    executedAt: canExecuteNow ? now : undefined,
    executionPrice: canExecuteNow ? actualExecPrice : undefined,
    notes: !schedule.isOpenForTrading
      ? `Market closed (${schedule.statusLabel}). Pending execution at next market open.`
      : type === 'limit' && !canExecuteNow
      ? `Limit price ($${limitPrice}) not reached yet (current: $${currentMarketPrice.toFixed(2)}).`
      : 'Executed at simulated market price.',
  };

  // If order cannot execute immediately, add to pending orders
  if (!canExecuteNow) {
    const updatedPortfolio: SimulatorPortfolio = {
      ...portfolio,
      orders: [newOrder, ...portfolio.orders],
      lastUpdatedAt: now,
    };
    return {
      success: true,
      order: newOrder,
      portfolio: updatedPortfolio,
      message: !schedule.isOpenForTrading
        ? `Order placed as Pending. ${schedule.exchangeName} is currently ${schedule.statusLabel}. It will execute when the market opens (${schedule.nextSessionText}).`
        : `Limit order placed as Pending. It will trigger when ${ticker} reaches your target limit price of $${limitPrice?.toFixed(2)}.`,
    };
  }

  // 5. Execute Order immediately
  return executeOrderInternal(portfolio, newOrder, actualExecPrice);
}

/**
 * Executes an order (either immediate or previously pending)
 */
function executeOrderInternal(
  portfolio: SimulatorPortfolio,
  order: SimulatorOrder,
  executionPrice: number
): PlaceOrderResult {
  const now = new Date().toISOString();
  const tradeValue = Number((order.shares * executionPrice).toFixed(2));
  const fee = order.fee;

  let newCash = portfolio.cash;
  let realizedPnLDelta = 0;
  let updatedHoldings = [...portfolio.holdings];

  if (order.side === 'buy') {
    const totalCost = Number((tradeValue + fee).toFixed(2));
    newCash = Number((newCash - totalCost).toFixed(2));

    const existingIndex = updatedHoldings.findIndex(
      (h) => h.ticker.toUpperCase() === order.ticker.toUpperCase()
    );

    if (existingIndex >= 0) {
      const prev = updatedHoldings[existingIndex];
      const combinedShares = prev.shares + order.shares;
      const combinedCost = prev.shares * prev.averageCost + order.shares * executionPrice;
      const newAverageCost = Number((combinedCost / combinedShares).toFixed(2));
      const currentVal = Number((combinedShares * executionPrice).toFixed(2));
      const invested = Number((combinedShares * newAverageCost).toFixed(2));

      updatedHoldings[existingIndex] = {
        ...prev,
        shares: combinedShares,
        averageCost: newAverageCost,
        currentPrice: executionPrice,
        totalInvested: invested,
        currentValue: currentVal,
        unrealizedPnL: Number((currentVal - invested).toFixed(2)),
        unrealizedPnLPercent: invested > 0 ? Number((((currentVal - invested) / invested) * 100).toFixed(2)) : 0,
        lastUpdated: now,
      };
    } else {
      const invested = Number((order.shares * executionPrice).toFixed(2));
      const newHolding: SimulatorHolding = {
        ticker: order.ticker.toUpperCase(),
        name: order.name,
        exchange: order.exchange,
        currency: 'USD',
        shares: order.shares,
        averageCost: executionPrice,
        currentPrice: executionPrice,
        totalInvested: invested,
        currentValue: invested,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        lastUpdated: now,
      };
      updatedHoldings.push(newHolding);
    }
  } else {
    // SELL
    const grossProceeds = tradeValue;
    const netProceeds = Number((grossProceeds - fee).toFixed(2));
    newCash = Number((newCash + netProceeds).toFixed(2));

    const existingIndex = updatedHoldings.findIndex(
      (h) => h.ticker.toUpperCase() === order.ticker.toUpperCase()
    );

    if (existingIndex >= 0) {
      const prev = updatedHoldings[existingIndex];
      const costBasis = Number((order.shares * prev.averageCost).toFixed(2));
      realizedPnLDelta = Number((grossProceeds - costBasis - fee).toFixed(2));

      const remainingShares = prev.shares - order.shares;
      if (remainingShares <= 0) {
        updatedHoldings.splice(existingIndex, 1);
      } else {
        const invested = Number((remainingShares * prev.averageCost).toFixed(2));
        const currentVal = Number((remainingShares * executionPrice).toFixed(2));
        updatedHoldings[existingIndex] = {
          ...prev,
          shares: remainingShares,
          currentPrice: executionPrice,
          totalInvested: invested,
          currentValue: currentVal,
          unrealizedPnL: Number((currentVal - invested).toFixed(2)),
          unrealizedPnLPercent: invested > 0 ? Number((((currentVal - invested) / invested) * 100).toFixed(2)) : 0,
          lastUpdated: now,
        };
      }
    }
  }

  // Create Transaction Record
  const transaction: SimulatorTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId: order.id,
    ticker: order.ticker,
    name: order.name,
    exchange: order.exchange,
    side: order.side,
    type: order.type,
    shares: order.shares,
    executionPrice,
    totalValue: tradeValue,
    fee,
    realizedPnL: order.side === 'sell' ? realizedPnLDelta : undefined,
    timestamp: now,
  };

  // Update order status
  const executedOrder: SimulatorOrder = {
    ...order,
    status: 'executed',
    executedAt: now,
    executionPrice,
  };

  // Recalculate portfolio totals
  const totalInvested = updatedHoldings.reduce((sum, h) => sum + h.totalInvested, 0);
  const totalHoldingVal = updatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPortVal = Number((newCash + totalHoldingVal).toFixed(2));
  const overallPnL = Number((totalPortVal - portfolio.startingBalance).toFixed(2));
  const overallPnLPercent = Number(((overallPnL / portfolio.startingBalance) * 100).toFixed(2));
  const newRealizedPnL = Number((portfolio.realizedPnL + realizedPnLDelta).toFixed(2));

  // Add snapshot to history
  const historySnapshot = {
    timestamp: now,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    portfolioValue: totalPortVal,
    cash: newCash,
    invested: totalInvested,
    pnl: overallPnL,
  };

  const updatedOrders = portfolio.orders.map((o) => (o.id === order.id ? executedOrder : o));
  if (!updatedOrders.some((o) => o.id === order.id)) {
    updatedOrders.unshift(executedOrder);
  }

  const updatedPortfolio: SimulatorPortfolio = {
    ...portfolio,
    cash: newCash,
    invested: Number(totalInvested.toFixed(2)),
    portfolioValue: totalPortVal,
    overallPnL,
    overallPnLPercent,
    realizedPnL: newRealizedPnL,
    holdings: updatedHoldings,
    orders: updatedOrders,
    transactions: [transaction, ...portfolio.transactions],
    history: [...portfolio.history.slice(-49), historySnapshot],
    lastUpdatedAt: now,
  };

  const pnlMsg = order.side === 'sell' ? ` (Realized P/L: ${realizedPnLDelta >= 0 ? '+' : ''}$${realizedPnLDelta.toFixed(2)})` : '';
  return {
    success: true,
    order: executedOrder,
    portfolio: updatedPortfolio,
    message: `Successfully ${order.side === 'buy' ? 'bought' : 'sold'} ${order.shares} shares of ${order.ticker} at $${executionPrice.toFixed(2)}${pnlMsg}.`,
  };
}

/**
 * Evaluates pending orders against current market schedules and live quotes
 */
export function checkPendingOrders(
  portfolio: SimulatorPortfolio,
  quotes: Map<string, { price: number }>
): { portfolio: SimulatorPortfolio; executedCount: number } {
  let modifiedPortfolio = { ...portfolio };
  let executedCount = 0;

  for (const order of portfolio.orders) {
    if (order.status !== 'pending') continue;

    const schedule = getMarketScheduleForStock(order.ticker, order.exchange);
    if (!schedule.isOpenForTrading) continue;

    const liveQuote = quotes.get(order.ticker.toUpperCase()) || quotes.get(order.ticker);
    if (!liveQuote || liveQuote.price <= 0) continue;

    const currentPrice = liveQuote.price;
    let shouldExecute = false;
    let execPrice = currentPrice;

    if (order.type === 'market') {
      shouldExecute = true;
      execPrice =
        order.side === 'buy'
          ? Number((currentPrice * (1 + SIMULATED_SLIPPAGE_RATE)).toFixed(2))
          : Number((currentPrice * (1 - SIMULATED_SLIPPAGE_RATE)).toFixed(2));
    } else if (order.type === 'limit' && order.limitPrice) {
      if (order.side === 'buy' && currentPrice <= order.limitPrice) {
        shouldExecute = true;
        execPrice = Math.min(currentPrice, order.limitPrice);
      } else if (order.side === 'sell' && currentPrice >= order.limitPrice) {
        shouldExecute = true;
        execPrice = Math.max(currentPrice, order.limitPrice);
      }
    }

    if (shouldExecute) {
      const res = executeOrderInternal(modifiedPortfolio, order, execPrice);
      if (res.success) {
        modifiedPortfolio = res.portfolio;
        executedCount++;
      }
    }
  }

  return { portfolio: modifiedPortfolio, executedCount };
}

/**
 * Cancels a pending order
 */
export function cancelOrder(
  portfolio: SimulatorPortfolio,
  orderId: string
): { success: boolean; portfolio: SimulatorPortfolio; message: string } {
  const orderIndex = portfolio.orders.findIndex((o) => o.id === orderId);
  if (orderIndex < 0) {
    return { success: false, portfolio, message: 'Order not found.' };
  }

  const order = portfolio.orders[orderIndex];
  if (order.status !== 'pending') {
    return {
      success: false,
      portfolio,
      message: `Cannot cancel order with status "${order.status}".`,
    };
  }

  const cancelledOrder: SimulatorOrder = {
    ...order,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    notes: 'Cancelled by user before execution.',
  };

  const updatedOrders = [...portfolio.orders];
  updatedOrders[orderIndex] = cancelledOrder;

  return {
    success: true,
    portfolio: {
      ...portfolio,
      orders: updatedOrders,
      lastUpdatedAt: new Date().toISOString(),
    },
    message: `Order for ${order.shares} shares of ${order.ticker} cancelled successfully.`,
  };
}

/**
 * Computes deep trading performance analytics
 */
export function calculatePerformanceAnalytics(portfolio: SimulatorPortfolio): SimulatorPerformanceStats {
  const sellTransactions = portfolio.transactions.filter(
    (t) => t.side === 'sell' && t.realizedPnL !== undefined
  );

  const winningTrades = sellTransactions.filter((t) => (t.realizedPnL || 0) > 0);
  const losingTrades = sellTransactions.filter((t) => (t.realizedPnL || 0) < 0);

  const totalWinAmount = winningTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
  const totalLossAmount = losingTrades.reduce((sum, t) => sum + Math.abs(t.realizedPnL || 0), 0);

  const avgWin = winningTrades.length > 0 ? Number((totalWinAmount / winningTrades.length).toFixed(2)) : 0;
  const avgLoss = losingTrades.length > 0 ? Number((totalLossAmount / losingTrades.length).toFixed(2)) : 0;
  const totalSellCount = sellTransactions.length;
  const winRate = totalSellCount > 0 ? Number(((winningTrades.length / totalSellCount) * 100).toFixed(1)) : 0;

  // Best & worst performers among current holdings
  let bestPerformer: SimulatorPerformanceStats['bestPerformer'];
  let worstPerformer: SimulatorPerformanceStats['worstPerformer'];

  if (portfolio.holdings.length > 0) {
    const sorted = [...portfolio.holdings].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    bestPerformer = {
      ticker: best.ticker,
      name: best.name,
      pnl: best.unrealizedPnL,
      pnlPercent: best.unrealizedPnLPercent,
    };
    worstPerformer = {
      ticker: worst.ticker,
      name: worst.name,
      pnl: worst.unrealizedPnL,
      pnlPercent: worst.unrealizedPnLPercent,
    };
  }

  // Calculate timeframe returns from history if available
  const currentVal = portfolio.portfolioValue;
  const hist = portfolio.history;
  const dayAgoVal = hist.length > 1 ? hist[0].portfolioValue : portfolio.startingBalance;
  const dailyReturn = Number((currentVal - dayAgoVal).toFixed(2));
  const dailyReturnPercent = dayAgoVal > 0 ? Number(((dailyReturn / dayAgoVal) * 100).toFixed(2)) : 0;

  return {
    totalReturn: portfolio.overallPnL,
    totalReturnPercent: portfolio.overallPnLPercent,
    dailyReturn,
    dailyReturnPercent,
    weeklyReturn: portfolio.overallPnL,
    weeklyReturnPercent: portfolio.overallPnLPercent,
    monthlyReturn: portfolio.overallPnL,
    monthlyReturnPercent: portfolio.overallPnLPercent,
    winRate,
    totalTrades: portfolio.transactions.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin,
    avgLoss,
    bestPerformer,
    worstPerformer,
  };
}
