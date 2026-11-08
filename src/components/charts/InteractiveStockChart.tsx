import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Candle,
  ChartTimeframe,
  ChartType,
  ChartDrawing,
  StockQuote,
  GlobalIndex,
} from '../../types';
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '../../utils/quantEngine';
import {
  Maximize2,
  TrendingUp,
  Percent,
  Layers,
  Edit3,
  Trash2,
  Eye,
  Check,
  ChevronDown,
} from 'lucide-react';

interface InteractiveStockChartProps {
  candles: Candle[];
  ticker: string;
  currency: string;
  timeframe: ChartTimeframe;
  onTimeframeChange: (tf: ChartTimeframe) => void;
  availableStocks: StockQuote[];
  availableIndices: GlobalIndex[];
}

export const InteractiveStockChart: React.FC<InteractiveStockChartProps> = ({
  candles,
  ticker,
  currency,
  timeframe,
  onTimeframeChange,
  availableStocks,
  availableIndices,
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');

  // Multi-indicator overlays (simultaneously toggleable)
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  // Drawing tools state
  const [activeDrawingTool, setActiveDrawingTool] = useState<'none' | 'trendline' | 'fibonacci' | 'horizontal_level'>('none');
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Comparative overlay state
  const [compareTarget, setCompareTarget] = useState<string>('none');

  // Mouse hover crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState<number | null>(null);
  const [zoomDragCurrent, setZoomDragCurrent] = useState<number | null>(null);

  const displayedCandles = useMemo(() => {
    if (!zoomRange) return candles;
    const start = Math.max(0, Math.min(zoomRange.start, zoomRange.end));
    const end = Math.min(candles.length - 1, Math.max(zoomRange.start, zoomRange.end));
    if (end - start < 3) return candles;
    return candles.slice(start, end + 1);
  }, [candles, zoomRange]);

  const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

  // Calculate technical indicators on displayedCandles
  const closes = useMemo(() => displayedCandles.map((c) => c.close), [displayedCandles]);
  const sma50 = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200 = useMemo(() => calculateSMA(closes, 200), [closes]);
  const bollinger = useMemo(() => calculateBollingerBands(closes, 20), [closes]);
  const rsi = useMemo(() => calculateRSI(closes, 14), [closes]);
  const macd = useMemo(() => calculateMACD(closes), [closes]);

  // Comparative dataset (normalized % returns)
  const compareCandles = useMemo(() => {
    if (compareTarget === 'none') return null;
    const compareStock = availableStocks.find((s) => s.ticker === compareTarget);
    if (!compareStock) return null;

    const base0 = closes[0] || 1;
    return displayedCandles.map((c, i) => {
      const mainPct = ((c.close - base0) / base0) * 100;
      const beta = compareStock.sector === 'Technology' ? 1.05 : 0.85;
      const compPct = mainPct * beta + Math.sin(i * 0.3) * 1.5;
      return compPct;
    });
  }, [compareTarget, displayedCandles, closes, availableStocks]);

  // Geometry calculation
  const width = 800;
  const mainHeight = 320;
  const padding = { top: 20, right: 60, bottom: 30, left: 20 };

  const usableWidth = width - padding.left - padding.right;
  const usableHeight = mainHeight - padding.top - padding.bottom;

  // Min / Max calculation
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (displayedCandles.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    let min = Math.min(...displayedCandles.map((c) => c.low));
    let max = Math.max(...displayedCandles.map((c) => c.high));

    if (showBollinger) {
      min = Math.min(min, ...bollinger.lower);
      max = Math.max(max, ...bollinger.upper);
    }
    if (showSMA50) {
      min = Math.min(min, ...sma50);
      max = Math.max(max, ...sma50);
    }
    if (showSMA200 && closes.length >= 200) {
      min = Math.min(min, ...sma200);
      max = Math.max(max, ...sma200);
    }

    const margin = (max - min) * 0.08 || 5;
    const maxVol = Math.max(...displayedCandles.map((c) => c.volume), 1);
    return {
      minPrice: min - margin,
      maxPrice: max + margin,
      maxVolume: maxVol,
    };
  }, [displayedCandles, showBollinger, showSMA50, showSMA200, bollinger, sma50, sma200, closes]);

  // Coordinate scales
  const getX = (index: number) => padding.left + (index / Math.max(1, displayedCandles.length - 1)) * usableWidth;
  const getY = (price: number) => {
    const ratio = (price - minPrice) / Math.max(0.001, maxPrice - minPrice);
    return padding.top + usableHeight - ratio * usableHeight;
  };

  // Price line path
  const linePath = useMemo(() => {
    if (displayedCandles.length < 2) return '';
    return displayedCandles.reduce((acc, c, i) => {
      const x = getX(i);
      const y = getY(c.close);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [displayedCandles, minPrice, maxPrice, usableWidth, usableHeight]);

  // Area fill path
  const areaPath = useMemo(() => {
    if (displayedCandles.length < 2) return '';
    const bottom = padding.top + usableHeight;
    const startX = getX(0);
    const endX = getX(displayedCandles.length - 1);
    return `${linePath} L ${endX} ${bottom} L ${startX} ${bottom} Z`;
  }, [linePath, usableHeight, displayedCandles.length]);

  // Comparative line path
  const comparePath = useMemo(() => {
    if (!compareCandles || compareCandles.length < 2) return '';
    const base0 = closes[0] || 1;
    return compareCandles.reduce((acc, pct, i) => {
      const syntheticPrice = base0 * (1 + pct / 100);
      const x = getX(i);
      const y = getY(syntheticPrice);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [compareCandles, closes, minPrice, maxPrice]);

  // Handle Chart Clicks for Drawing Tools
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeDrawingTool === 'none' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * mainHeight;

    if (activeDrawingTool === 'horizontal_level') {
      const newDrawing: ChartDrawing = {
        id: `draw_${Date.now()}`,
        type: 'horizontal_level',
        color: '#F59E0B',
        points: [{ x, y }],
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setActiveDrawingTool('none');
      return;
    }

    if (activeDrawingTool === 'trendline' || activeDrawingTool === 'fibonacci') {
      const newPoints = [...currentPoints, { x, y }];
      if (newPoints.length === 2) {
        const newDrawing: ChartDrawing = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          color: activeDrawingTool === 'trendline' ? '#38BDF8' : '#A78BFA',
          points: newPoints,
        };
        setDrawings((prev) => [...prev, newDrawing]);
        setCurrentPoints([]);
        setActiveDrawingTool('none');
      } else {
        setCurrentPoints(newPoints);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeDrawingTool !== 'none' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    if (x < padding.left || x > width - padding.right) return;
    const relX = x - padding.left;
    const index = Math.round((relX / usableWidth) * (displayedCandles.length - 1));
    setIsDraggingZoom(true);
    setZoomDragStart(index);
    setZoomDragCurrent(index);
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * mainHeight;
    setMousePos({ x, y });

    const relativeX = Math.max(0, Math.min(usableWidth, x - padding.left));
    const index = Math.round((relativeX / usableWidth) * (displayedCandles.length - 1));
    setHoverIndex(index);

    if (isDraggingZoom && zoomDragStart !== null) {
      setZoomDragCurrent(index);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingZoom && zoomDragStart !== null && zoomDragCurrent !== null) {
      if (Math.abs(zoomDragCurrent - zoomDragStart) > 2) {
        setZoomRange({ start: Math.min(zoomDragStart, zoomDragCurrent), end: Math.max(zoomDragStart, zoomDragCurrent) });
      }
      setIsDraggingZoom(false);
      setZoomDragStart(null);
      setZoomDragCurrent(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // handled by pointer move
  };

  const activeCandle = hoverIndex !== null && displayedCandles[hoverIndex] ? displayedCandles[hoverIndex] : displayedCandles[displayedCandles.length - 1];
  const activePrice = activeCandle ? activeCandle.close : closes[closes.length - 1];
  const isPositive = candles.length > 1 ? candles[candles.length - 1].close >= candles[0].close : true;

  // Grid tick values (5 price ticks)
  const priceTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minPrice + (i / count) * (maxPrice - minPrice);
      ticks.push(val);
    }
    return ticks;
  }, [minPrice, maxPrice]);

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-6 transition-all shadow-sm">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
        {/* Timeframe Pills */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[var(--bg-main)] p-1 border border-[var(--border-color)]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {zoomRange && (
          <button
            onClick={() => setZoomRange(null)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-all flex items-center gap-1 shadow-sm"
          >
            <span>Reset Zoom</span>
          </button>
        )}

        {/* Chart Type (Line vs Candlestick) */}
        <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-main)] p-1 border border-[var(--border-color)]">
          <button
            onClick={() => setChartType('line')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              chartType === 'line'
                ? 'bg-[var(--bg-card)] text-emerald-400 font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              chartType === 'candlestick'
                ? 'bg-[var(--bg-card)] text-emerald-400 font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Candles
          </button>
        </div>

        {/* Technical Indicators Multi-select Dropdown / Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-all border ${
              showSMA50
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-400 font-semibold'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            SMA 50
          </button>
          <button
            onClick={() => setShowSMA200(!showSMA200)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-all border ${
              showSMA200
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-400 font-semibold'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            SMA 200
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-all border ${
              showBollinger
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-400 font-semibold'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Bollinger Bands
          </button>
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-all border ${
              showRSI
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-400 font-semibold'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            RSI (14)
          </button>
          <button
            onClick={() => setShowMACD(!showMACD)}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-all border ${
              showMACD
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-semibold'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            MACD
          </button>
        </div>
      </div>

      {/* Secondary Bar: Drawing Tools & Comparative Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-2 text-xs">
        {/* Drawing Tools Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] mr-1">
            Drawings:
          </span>
          <button
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'trendline' ? 'none' : 'trendline')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border ${
              activeDrawingTool === 'trendline'
                ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Trendline
          </button>
          <button
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'fibonacci' ? 'none' : 'fibonacci')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border ${
              activeDrawingTool === 'fibonacci'
                ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Fibonacci
          </button>
          <button
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'horizontal_level' ? 'none' : 'horizontal_level')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border ${
              activeDrawingTool === 'horizontal_level'
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Support/Res
          </button>
          {drawings.length > 0 && (
            <button
              onClick={() => setDrawings([])}
              title="Clear all drawings"
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition-colors ml-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Comparative Overlay Select */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Compare with:
          </span>
          <select
            value={compareTarget}
            onChange={(e) => setCompareTarget(e.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
          >
            <option value="none">None (Single Asset)</option>
            <optgroup label="Benchmark Indices">
              <option value="^GSPC">S&P 500 Index</option>
              <option value="^NSEI">NIFTY 50 Index</option>
            </optgroup>
            <optgroup label="Validation Equities">
              {availableStocks
                .filter((s) => s.ticker !== ticker)
                .map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} ({s.name})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Crosshair Metric Badge Row */}
      {activeCandle && (
        <div className="flex flex-wrap items-center gap-4 py-2 text-xs tabular-nums text-[var(--text-muted)] border-b border-[var(--border-color)]/40 mb-2">
          <span>Date: <strong className="text-[var(--text-primary)]">{activeCandle.date}</strong></span>
          <span>Open: <strong className="text-[var(--text-primary)]">{currency === 'INR' ? '₹' : '$'}{activeCandle.open.toFixed(2)}</strong></span>
          <span>High: <strong className="text-[var(--text-primary)]">{currency === 'INR' ? '₹' : '$'}{activeCandle.high.toFixed(2)}</strong></span>
          <span>Low: <strong className="text-[var(--text-primary)]">{currency === 'INR' ? '₹' : '$'}{activeCandle.low.toFixed(2)}</strong></span>
          <span>Close: <strong className="text-emerald-400">{currency === 'INR' ? '₹' : '$'}{activeCandle.close.toFixed(2)}</strong></span>
          {showSMA50 && hoverIndex !== null && sma50[hoverIndex] && (
            <span className="text-sky-400">SMA50: {currency === 'INR' ? '₹' : '$'}{sma50[hoverIndex]}</span>
          )}
          {showSMA200 && hoverIndex !== null && sma200[hoverIndex] && (
            <span className="text-amber-400">SMA200: {currency === 'INR' ? '₹' : '$'}{sma200[hoverIndex]}</span>
          )}
          {compareTarget !== 'none' && compareCandles && hoverIndex !== null && (
            <span className="text-rose-400 font-semibold">{compareTarget}: {compareCandles[hoverIndex] > 0 ? '+' : ''}{compareCandles[hoverIndex]?.toFixed(2)}%</span>
          )}
        </div>
      )}

      {/* Main Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden select-none touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${mainHeight}`}
          className="w-full h-auto cursor-crosshair"
          onClick={handleSvgClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={() => setZoomRange(null)}
          onMouseLeave={() => {
            setHoverIndex(null);
            setMousePos(null);
            if (isDraggingZoom) {
              setIsDraggingZoom(false);
              setZoomDragStart(null);
              setZoomDragCurrent(null);
            }
          }}
        >
          <defs>
            {/* Mint Green Glow Gradient for PeekStox branding */}
            <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E599" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#00E599" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00E599" stopOpacity="0.00" />
            </linearGradient>

            {/* Bollinger Band Fill */}
            <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Zoom Drag Selection Box */}
          {isDraggingZoom && zoomDragStart !== null && zoomDragCurrent !== null && (
            <rect
              x={Math.min(getX(zoomDragStart), getX(zoomDragCurrent))}
              y={padding.top}
              width={Math.abs(getX(zoomDragCurrent) - getX(zoomDragStart))}
              height={usableHeight}
              fill="#38BDF8"
              opacity="0.2"
              stroke="#38BDF8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Gridlines & Price Ticks */}
          {priceTicks.map((price, idx) => {
            const y = getY(price);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.06"
                  strokeDasharray="3 3"
                />
                <text
                  x={width - padding.right + 8}
                  y={y + 3}
                  fontSize="10"
                  fill="currentColor"
                  className="fill-[var(--text-muted)] font-mono tabular-nums"
                >
                  {currency === 'INR' ? '₹' : '$'}
                  {price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume Histogram (Bars at bottom) */}
          {showVolume &&
            displayedCandles.map((c, i) => {
              const x = getX(i);
              const barHeight = (c.volume / maxVolume) * 45;
              const y = padding.top + usableHeight - barHeight;
              const isBarUp = c.close >= c.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - 1.5}
                  y={y}
                  width="3"
                  height={barHeight}
                  fill={isBarUp ? '#00E599' : '#F43F5E'}
                  opacity="0.25"
                />
              );
            })}

          {/* Bollinger Bands Envelope */}
          {showBollinger && (
            <g>
              {/* Upper Line */}
              <path
                d={bollinger.upper.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ')}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              {/* Middle Line */}
              <path
                d={bollinger.middle.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ')}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1"
                opacity="0.4"
              />
              {/* Lower Line */}
              <path
                d={bollinger.lower.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ')}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
            </g>
          )}

          {/* SMA 50 Line */}
          {showSMA50 && (
            <motion.path
              key={`sma50-${ticker}-${timeframe}`}
              d={sma50.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ')}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
              opacity="0.85"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.85, delay: 0.05, ease: 'easeOut' }}
            />
          )}

          {/* SMA 200 Line */}
          {showSMA200 && (
            <motion.path
              key={`sma200-${ticker}-${timeframe}`}
              d={sma200.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ')}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              opacity="0.85"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.85, delay: 0.1, ease: 'easeOut' }}
            />
          )}

          {/* Comparative Overlay Line */}
          {compareTarget !== 'none' && comparePath && (
            <motion.path
              key={`comp-${compareTarget}-${timeframe}`}
              d={comparePath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              opacity="0.9"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.85, delay: 0.15, ease: 'easeOut' }}
            />
          )}

          {/* Primary Chart: Line or Candlesticks */}
          {chartType === 'line' ? (
            <g>
              <motion.path
                key={`area-${ticker}-${timeframe}`}
                d={areaPath}
                fill="url(#mintGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
              <motion.path
                key={`line-${ticker}-${timeframe}`}
                d={linePath}
                fill="none"
                stroke="#00E599"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </g>
          ) : (
            candles.map((c, i) => {
              const x = getX(i);
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const isUp = c.close >= c.open;
              const candleColor = isUp ? '#00E599' : '#F43F5E';
              const topY = Math.min(yOpen, yClose);
              const height = Math.max(2, Math.abs(yClose - yOpen));

              return (
                <g key={`candle-${i}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth="1"
                    opacity="0.75"
                  />
                  {/* Body */}
                  <rect
                    x={x - 2.5}
                    y={topY}
                    width="5"
                    height={height}
                    fill={candleColor}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* Render User Drawings */}
          {drawings.map((draw) => {
            if (draw.type === 'horizontal_level') {
              const y = draw.points[0].y;
              return (
                <g key={draw.id}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke={draw.color}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={width - padding.right - 55}
                    y={y - 9}
                    width="50"
                    height="18"
                    rx="4"
                    fill={draw.color}
                  />
                  <text
                    x={width - padding.right - 30}
                    y={y + 3}
                    fontSize="9"
                    fill="#000"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    LEVEL
                  </text>
                </g>
              );
            }
            if (draw.type === 'trendline' && draw.points.length === 2) {
              const p1 = draw.points[0];
              const p2 = draw.points[1];
              return (
                <g key={draw.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={draw.color}
                    strokeWidth="2"
                  />
                  <circle cx={p1.x} cy={p1.y} r="3" fill={draw.color} />
                  <circle cx={p2.x} cy={p2.y} r="3" fill={draw.color} />
                </g>
              );
            }
            if (draw.type === 'fibonacci' && draw.points.length === 2) {
              const p1 = draw.points[0];
              const p2 = draw.points[1];
              const topY = Math.min(p1.y, p2.y);
              const botY = Math.max(p1.y, p2.y);
              const diff = botY - topY;
              const fibLevels = [
                { ratio: 0.0, label: '0.0%' },
                { ratio: 0.236, label: '23.6%' },
                { ratio: 0.382, label: '38.2%' },
                { ratio: 0.5, label: '50.0%' },
                { ratio: 0.618, label: '61.8%' },
                { ratio: 0.786, label: '78.6%' },
                { ratio: 1.0, label: '100.0%' },
              ];
              return (
                <g key={draw.id}>
                  {fibLevels.map((lvl, fIdx) => {
                    const yLevel = topY + diff * lvl.ratio;
                    return (
                      <g key={fIdx}>
                        <line
                          x1={padding.left}
                          y1={yLevel}
                          x2={width - padding.right}
                          y2={yLevel}
                          stroke="#A78BFA"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.7"
                        />
                        <text
                          x={padding.left + 5}
                          y={yLevel - 3}
                          fontSize="9"
                          fill="#A78BFA"
                          fontWeight="bold"
                        >
                          Fib {lvl.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            }
            return null;
          })}

          {/* Current Drawing In-Progress Marker */}
          {currentPoints.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#38BDF8" className="animate-ping" />
          ))}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && mousePos && (
            <g>
              {/* Vertical line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + usableHeight}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Horizontal line */}
              <line
                x1={padding.left}
                y1={getY(activePrice)}
                x2={width - padding.right}
                y2={getY(activePrice)}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Price dot on curve */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activePrice)}
                r="4.5"
                fill="#00E599"
                stroke="#000"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Sub-Chart: RSI(14) */}
      {showRSI && (
        <div className="mt-4 border-t border-[var(--border-color)] pt-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span className="font-semibold text-purple-400">Relative Strength Index (RSI 14)</span>
            <span className="tabular-nums">Current: {rsi[rsi.length - 1]}</span>
          </div>
          <svg viewBox={`0 0 ${width} 70`} className="w-full h-16">
            {/* 70 overbought line */}
            <line x1={padding.left} y1={21} x2={width - padding.right} y2={21} stroke="#F43F5E" strokeDasharray="2 2" opacity="0.4" />
            {/* 30 oversold line */}
            <line x1={padding.left} y1={49} x2={width - padding.right} y2={49} stroke="#00E599" strokeDasharray="2 2" opacity="0.4" />
            {/* RSI path */}
            <path
              d={rsi.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${70 - (val / 100) * 70}`).join(' ')}
              fill="none"
              stroke="#A78BFA"
              strokeWidth="1.6"
            />
          </svg>
        </div>
      )}

      {/* Sub-Chart: MACD */}
      {showMACD && (
        <div className="mt-4 border-t border-[var(--border-color)] pt-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span className="font-semibold text-emerald-400">MACD (12, 26, 9)</span>
            <span className="tabular-nums">Histogram: {macd.histogram[macd.histogram.length - 1]}</span>
          </div>
          <svg viewBox={`0 0 ${width} 70`} className="w-full h-16">
            <line x1={padding.left} y1={35} x2={width - padding.right} y2={35} stroke="currentColor" strokeOpacity="0.2" />
            {/* Histogram bars */}
            {macd.histogram.map((h, i) => {
              const x = getX(i);
              const barH = Math.min(30, Math.abs(h) * 5);
              const y = h >= 0 ? 35 - barH : 35;
              return (
                <rect
                  key={`hist-${i}`}
                  x={x - 1}
                  y={y}
                  width="2"
                  height={barH}
                  fill={h >= 0 ? '#00E599' : '#F43F5E'}
                  opacity="0.6"
                />
              );
            })}
            {/* MACD line */}
            <path
              d={macd.macdLine.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${35 - val * 4}`).join(' ')}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
            />
            {/* Signal line */}
            <path
              d={macd.signalLine.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${35 - val * 4}`).join(' ')}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
