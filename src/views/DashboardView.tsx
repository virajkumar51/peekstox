import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Maximize2, Radio, RefreshCw, Sparkles, X } from 'lucide-react';
import type { GlobalIndex, NewsItem, StockQuote } from '../types';
import { Change, Gauge, MiniLines, Spark } from '../components/ui';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { useCardTilt, useCardTiltReset } from '../hooks/useSpatial';
import { FloatGroup, FloatItem } from '../components/FloatGroup';
import {
  bollinger, breadthPercent, formatLevel, formatPrice, macdSeries, rsiSeries, smaSeries, timeAgo, trendProjection,
} from '../utils/market';

interface DashboardViewProps {
  indices: GlobalIndex[];
  stocks: StockQuote[];
  news: NewsItem[];
  watchlist: string[];
  baseCurrency?: string;
  language?: string;
  onSelectStock: (ticker: string) => void;
  onNavigate: (view: string) => void;
  onOpenAlerts: () => void;
}

// GlobalIndex.name and the NewsItem fields below are read defensively because
// their exact shape was not visible. Adjust if your types differ.
const indexName = (i: GlobalIndex) => (i as { name?: string }).name ?? i.id;
type NewsLike = { id?: string; title?: string; headline?: string; source?: string; publisher?: string; timestamp?: string; publishedAt?: string; time?: string; imageUrl?: string; image?: string; url?: string; link?: string };

type IndKey = 'rsi' | 'macd' | 'ma' | 'bb';
type Detail =
  | { kind: 'hero' } | { kind: 'sentiment' } | { kind: 'ai' } | { kind: 'projection' }
  | { kind: 'indicator'; key: IndKey } | { kind: 'stock'; ticker: string } | { kind: 'news'; index: number };

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{children}</h2>
);
const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="tile p-3">
    <p className="text-xs text-[var(--text-muted)]">{label}</p>
    <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
  </div>
);

/** Invisible full-card button + small corner icon: on phones, tapping the card enlarges it. */
function Hit({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <>
      <button type="button" className="card-hit" aria-label={`Expand ${label}`} aria-haspopup="dialog" onClick={onOpen} />
      <Maximize2 aria-hidden="true" className="card-expand-icon h-3.5 w-3.5" />
    </>
  );
}

/** Enlarged view: centred glass panel with a close X (Esc and backdrop tap also close). */
function DetailSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  // Portal to <body> so the floating dock (a sibling of the app shell) can never sit on top of it.
  return createPortal(
    <>
      <button type="button" className="detail-backdrop" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="detail-title" className="detail glass">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="detail-title" className="min-w-0 text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="touch-target -mr-2 -mt-2 shrink-0 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

export function DashboardView({ indices, stocks, news, watchlist, baseCurrency, language, onSelectStock, onNavigate, onOpenAlerts }: DashboardViewProps) {
  const { mode } = useDeviceLayout();
  const compact = mode === 'compact';
  const [detail, setDetail] = useState<Detail | null>(null);
  const onMove = useCardTilt(6);
  const onLeave = useCardTiltReset();
  useEffect(() => { if (!compact) setDetail(null); }, [compact]);

  const defaultId = useMemo(
    () => (indices.find((i) => /s&p|spx|gspc/i.test(`${i.id} ${indexName(i)}`)) ?? indices[0])?.id,
    [indices],
  );
  const [pickedId, setPickedId] = useState<string | undefined>();
  const featured = indices.find((i) => i.id === (pickedId ?? defaultId)) ?? indices[0];
  const series = featured?.sparkline ?? [];

  interface BackendTechnicals {
    symbol: string;
    name: string;
    price: number;
    dataPoints: number;
    rsi: { period: number; value: number; status: string };
    macd: { fast: number; slow: number; signal: number; macd: number; signalLine: number; histogram: number; status: string };
    sma: { sma20: number; sma50: number; sma200?: number; status: string };
    bollinger: { period: number; upper: number; mid: number; lower: number; status: string };
    history?: number[];
  }

  const [techData, setTechData] = useState<BackendTechnicals | null>(null);
  const [techLoading, setTechLoading] = useState(false);

  useEffect(() => {
    if (!featured) return;
    let cancelled = false;
    setTechLoading(true);
    fetch(`/api/market/technicals/${encodeURIComponent(featured.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (!cancelled && data) {
          const t = data.technicals || data;
          if (t && (t.rsi || t.movingAverages || t.sma)) {
            setTechData({
              symbol: data.symbol || featured.id,
              name: data.name || indexName(featured),
              price: data.currentPrice || featured.value,
              dataPoints: data.dataPoints || 250,
              rsi: {
                period: t.rsi?.period || 14,
                value: t.rsi?.value ?? 50,
                status: t.rsi?.state || t.rsi?.status || 'Neutral',
              },
              macd: {
                fast: t.macd?.fast || 12,
                slow: t.macd?.slow || 26,
                signal: t.macd?.signalPeriod || t.macd?.signal || 9,
                macd: t.macd?.macd ?? 0,
                signalLine: t.macd?.signal ?? 0,
                histogram: t.macd?.histogram ?? 0,
                status: t.macd?.state || t.macd?.status || 'Bullish',
              },
              sma: {
                sma20: t.movingAverages?.sma20 || t.sma?.sma20 || 0,
                sma50: t.movingAverages?.sma50 || t.sma?.sma50 || 0,
                sma200: t.movingAverages?.sma200 || t.sma?.sma200,
                status: t.movingAverages?.state || t.sma?.status || 'Above SMA 20',
              },
              bollinger: {
                period: t.bollinger?.period || 20,
                upper: t.bollinger?.upper || 0,
                mid: t.bollinger?.middle || t.bollinger?.mid || 0,
                lower: t.bollinger?.lower || 0,
                status: t.bollinger?.state || t.bollinger?.status || 'Inside bands',
              },
              history: data.history,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTechLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [featured?.id]);

  const analysis = useMemo(() => {
    const n = series.length;
    const rsi = n >= 15 ? rsiSeries(series) : [];
    const macd = n >= 26 ? macdSeries(series) : [];
    const sma = n >= 10 ? smaSeries(series, 20) : [];
    const bb = n >= 10 ? bollinger(series, 20) : { mid: [], upper: [], lower: [] };
    const last = series[series.length - 1] ?? featured.value;

    const fallbackRsiNow = rsi.length ? rsi[rsi.length - 1] : undefined;
    const fallbackMacdNow = macd.length ? macd[macd.length - 1] : undefined;
    const fallbackSmaNow = sma.length ? sma[sma.length - 1] : undefined;
    const fallbackUpper = bb.upper.length ? bb.upper[bb.upper.length - 1] : undefined;
    const fallbackLower = bb.lower.length ? bb.lower[bb.lower.length - 1] : undefined;
    const fallbackMid = bb.mid.length ? bb.mid[bb.mid.length - 1] : undefined;

    const rsiNow = techData?.rsi?.value ?? fallbackRsiNow;
    const rsiState = techData?.rsi?.status ?? (rsiNow !== undefined ? (rsiNow >= 70 ? 'Overbought' : rsiNow <= 30 ? 'Oversold' : 'Neutral') : 'Neutral');

    const macdNow = techData?.macd?.macd ?? fallbackMacdNow;
    const macdState = techData?.macd?.status ?? (macdNow !== undefined ? (macdNow >= 0 ? 'Bullish' : 'Bearish') : 'Bullish');

    const smaNow = techData?.sma?.sma20 ?? fallbackSmaNow;
    const smaState = techData?.sma?.status ?? (smaNow !== undefined ? (last >= smaNow ? 'Above SMA 20' : 'Below SMA 20') : 'Neutral');

    const bbMid = techData?.bollinger?.mid ?? fallbackMid;
    const bbUpper = techData?.bollinger?.upper ?? fallbackUpper;
    const bbLower = techData?.bollinger?.lower ?? fallbackLower;
    const bbState = techData?.bollinger?.status ?? (bbUpper !== undefined && bbLower !== undefined ? (last >= bbUpper ? 'Upper band' : last <= bbLower ? 'Lower band' : 'Inside bands') : 'Inside bands');

    return {
      n, rsi, macd, sma, bb, last, rsiNow, macdNow, smaNow, bbMid, bbUpper, bbLower,
      rsiState, macdState, smaState, bbState,
      projection: trendProjection(series),
    };
  }, [series, featured?.value, techData]);

  const breadth = useMemo(() => breadthPercent(stocks), [stocks]);
  const mood = breadth > 60 ? 'Bullish' : breadth < 40 ? 'Bearish' : 'Neutral';
  const byChange = useMemo(
    () => [...stocks].filter((s) => Number.isFinite(s.changePercent)).sort((a, b) => b.changePercent - a.changePercent),
    [stocks],
  );
  const top = useMemo(() => [...byChange].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0], [byChange]);
  const sectors = useMemo(() => {
    const m = new Map<string, number[]>();
    stocks.forEach((s) => {
      if (!s.sector || !Number.isFinite(s.changePercent)) return;
      m.set(s.sector, [...(m.get(s.sector) ?? []), s.changePercent]);
    });
    return [...m.entries()].map(([name, v]) => ({ name, avg: v.reduce((a, b) => a + b, 0) / v.length })).sort((a, b) => b.avg - a.avg);
  }, [stocks]);
  const upCount = stocks.filter((s) => s.changePercent > 0).length;
  const watched = watchlist.map((t) => stocks.find((s) => s.ticker === t)).filter((s): s is StockQuote => Boolean(s)).slice(0, compact ? 3 : 6);

  const newsItems = news.slice(0, compact ? 3 : 5).map((n) => {
    const item = n as unknown as NewsLike;
    return {
      title: item.title ?? item.headline ?? 'Untitled',
      source: item.source ?? item.publisher ?? '',
      when: timeAgo(item.timestamp ?? item.publishedAt ?? item.time),
      img: item.imageUrl ?? item.image,
      href: item.url ?? item.link,
    };
  });

  if (!featured) return <p className="text-[var(--text-secondary)]">Market data is loading…</p>;

  const indicators: {
    key: IndKey;
    name: string;
    short: string;
    value: string;
    state: string;
    sub: string;
    lines: { data: number[]; muted?: boolean }[];
    need: number;
    about: string;
  }[] = [
    {
      key: 'rsi',
      name: 'RSI',
      short: 'RSI',
      value: analysis.rsiNow !== undefined ? analysis.rsiNow.toFixed(1) : '—',
      state: analysis.rsiState,
      sub: '14-Period RSI',
      lines: [{ data: analysis.rsi.length ? analysis.rsi : [50, 52, 54, 53, 55] }],
      need: 14,
      about: 'Relative Strength Index (14 periods) compares recent gains with losses. Values above 70 indicate overbought conditions; below 30 indicate oversold conditions.',
    },
    {
      key: 'macd',
      name: 'MACD',
      short: 'MACD',
      value: analysis.macdNow !== undefined ? (analysis.macdNow >= 0 ? `+${analysis.macdNow.toFixed(2)}` : analysis.macdNow.toFixed(2)) : '—',
      state: analysis.macdState,
      sub: techData?.macd ? `Hist: ${techData.macd.histogram >= 0 ? '+' : ''}${techData.macd.histogram.toFixed(2)}` : 'Fast 12 / Slow 26 / Sig 9',
      lines: [{ data: analysis.macd.length ? analysis.macd : [0.5, 0.8, 1.2, 1.0] }],
      need: 26,
      about: 'Moving Average Convergence Divergence tracks momentum using 12 and 26-period EMAs with a 9-period signal line. Above zero suggests upward momentum.',
    },
    {
      key: 'ma',
      name: 'Moving Avg',
      short: 'MA',
      value: analysis.smaNow ? formatLevel(analysis.smaNow) : '—',
      state: analysis.smaState,
      sub: techData?.sma?.sma50 ? `SMA 50: ${formatLevel(techData.sma.sma50)}` : '20-Period SMA',
      lines: [{ data: series, muted: true }, { data: analysis.sma }],
      need: 20,
      about: '20-period Simple Moving Average smooths price fluctuations. Price above it indicates an active uptrend; below it a downtrend.',
    },
    {
      key: 'bb',
      name: 'Bollinger',
      short: 'BB',
      value: analysis.bbMid ? formatLevel(analysis.bbMid) : '—',
      state: analysis.bbState,
      sub: techData?.bollinger ? `±2σ (${formatLevel(techData.bollinger.lower)} – ${formatLevel(techData.bollinger.upper)})` : '20-Period ±2σ',
      lines: [
        { data: series },
        { data: analysis.bb.upper.length ? analysis.bb.upper : series, muted: true },
        { data: analysis.bb.lower.length ? analysis.bb.lower : series, muted: true },
      ],
      need: 20,
      about: 'Bollinger Bands plot a 20-period average with bands two standard deviations either side. Price near the upper band is stretched upward, near lower downward.',
    },
  ];
  const proj = analysis.projection;
  const fmtVol = (v: number) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(v);

  const chips = (
    <div role="group" aria-label="Choose benchmark" className="hscroll">
      {indices.map((i) => (
        <button key={i.id} type="button" aria-pressed={i.id === featured.id} onClick={() => setPickedId(i.id)} className={`chip ${i.id === featured.id ? 'bg-[var(--active-pill)] tone-up' : 'text-[var(--text-secondary)]'}`}>
          {indexName(i)}
        </button>
      ))}
    </div>
  );

  /* ---------- Enlarged views (phones) ---------- */
  const renderDetail = (d: Detail): { title: string; body: ReactNode } => {
    switch (d.kind) {
      case 'hero':
        return {
          title: indexName(featured),
          body: (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-4xl font-bold tabular-nums">{formatLevel(featured.value)}</p>
                <span className={`rounded-full px-3 py-1.5 text-sm ${featured.changePercent >= 0 ? 'pill-up' : 'pill-down'}`}><Change value={featured.changePercent} /></span>
              </div>
              <div className="mt-4 h-52"><Spark data={series} positive={featured.changePercent >= 0} dot glow label={`${indexName(featured)} recent price trend`} /></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {featured.high !== undefined && Number.isFinite(featured.high) && <Stat label="Day high" value={formatLevel(featured.high)} />}
                {featured.low !== undefined && Number.isFinite(featured.low) && <Stat label="Day low" value={formatLevel(featured.low)} />}
                {featured.status && <Stat label="Status" value={featured.status} />}
                {featured.lastUpdated && <Stat label="Updated" value={featured.lastUpdated} />}
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Switch benchmark</p>
              {chips}
            </>
          ),
        };
      case 'sentiment': {
        const row = (s: StockQuote) => (
          <li key={s.ticker} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0"><span className="font-semibold">{s.ticker}</span> <span className="text-xs text-[var(--text-muted)]">{s.name}</span></span>
            <Change value={s.changePercent} />
          </li>
        );
        return {
          title: 'Market sentiment',
          body: (
            <>
              <Gauge value={breadth} label={mood} />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{upCount} of {stocks.length} tracked stocks are up today ({breadth}%). Above 60% reads Bullish, below 40% Bearish, in between Neutral.</p>
              <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Top gainers</p>
              <ul className="divide-y divide-[var(--border-color)]">{byChange.slice(0, 3).map(row)}</ul>
              <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Top decliners</p>
              <ul className="divide-y divide-[var(--border-color)]">{byChange.slice(-3).reverse().map(row)}</ul>
            </>
          ),
        };
      }
      case 'ai': {
        const lead = sectors[0];
        const lag = sectors.length > 1 ? sectors[sectors.length - 1] : undefined;
        return {
          title: 'AI analyst',
          body: (
            <>
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="ps-orb h-16 w-16 shrink-0" />
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Breadth reads <strong className="text-[var(--text-primary)]">{mood.toLowerCase()}</strong> at {breadth}%, with {upCount} of {stocks.length} tracked stocks up.
                  {top && <> The biggest mover is <strong className="text-[var(--text-primary)]">{top.ticker}</strong> at <Change value={top.changePercent} />.</>}
                  {lead && <> {lead.name} is leading the sectors (<Change value={lead.avg} />){lag && <>, while {lag.name} is lagging (<Change value={lag.avg} />)</>}.</>}
                </p>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">Written from live quotes only. Not financial advice.</p>
              <button type="button" onClick={() => { setDetail(null); onNavigate('assistant'); }} className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl text-sm font-semibold tone-up">
                Ask PeekStox AI <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </>
          ),
        };
      }
      case 'indicator': {
        const ind = indicators.find((i) => i.key === d.key)!;
        const ready = ind.value !== '—';
        return {
          title: `${ind.name} · ${indexName(featured)}`,
          body: (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold tabular-nums">{ind.value}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    ind.state.includes('Bullish') || ind.state.includes('Above') || ind.state === 'Oversold'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : ind.state.includes('Bearish') || ind.state.includes('Below') || ind.state === 'Overbought'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-zinc-500/15 text-[var(--text-secondary)]'
                  }`}>{ind.state}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-mono">{ind.sub}</span>
              </div>
              <div className="tile mt-4 h-40 p-3"><MiniLines lines={ind.lines} /></div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{ind.about}</p>
              {!ready && <p className="mt-3 text-sm text-[var(--text-secondary)]">This series has {analysis.n} price points; {ind.need}+ are needed for a meaningful reading.</p>}
              <p className="mt-3 text-xs text-[var(--text-muted)]">Authoritative technical indicators calculated from standard market price history.</p>
            </>
          ),
        };
      }
      case 'projection':
        return {
          title: 'Trend projection',
          body: (
            <>
              {proj ? (
                <>
                  <div className="flex items-center gap-3"><Change value={proj.driftPct} className="text-2xl" /><span className="text-sm text-[var(--text-secondary)]">if the recent trend simply continued</span></div>
                  <div className="tile mt-4 h-48 p-3"><Spark data={proj.history} projected={proj.projected} positive={proj.driftPct >= 0} area={false} label="Recent trend with dotted projection" /></div>
                </>
              ) : <p className="text-sm text-[var(--text-secondary)]">Needs more data.</p>}
              <p className="mt-3 text-sm text-[var(--text-secondary)]">A straight-line extension of the recent trend (dotted). It is not a forecast and not financial advice.</p>
            </>
          ),
        };
      case 'stock': {
        const s = stocks.find((x) => x.ticker === d.ticker);
        if (!s) return { title: d.ticker, body: null };
        return {
          title: `${s.ticker} · ${s.name}`,
          body: (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-4xl font-bold tabular-nums">{formatPrice(s.price, s.currency)}</p>
                <span className={`rounded-full px-3 py-1.5 text-sm ${s.changePercent >= 0 ? 'pill-up' : 'pill-down'}`}><Change value={s.changePercent} /></span>
              </div>
              <div className="mt-4 h-40"><Spark data={s.sparkline} positive={s.changePercent >= 0} dot label={`${s.ticker} recent price trend`} /></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Day high" value={formatPrice(s.dayHigh, s.currency)} />
                <Stat label="Day low" value={formatPrice(s.dayLow, s.currency)} />
                <Stat label="52-week high" value={formatPrice(s.yearHigh, s.currency)} />
                <Stat label="52-week low" value={formatPrice(s.yearLow, s.currency)} />
                <Stat label="Volume" value={fmtVol(s.volume)} />
                <Stat label="Exchange" value={s.exchange} />
              </div>
              <button type="button" onClick={() => { setDetail(null); onSelectStock(s.ticker); }} className="chip mt-4 bg-[var(--active-pill)] tone-up">Open in Explorer</button>
            </>
          ),
        };
      }
      case 'news': {
        const n = newsItems[d.index];
        if (!n) return { title: 'News', body: null };
        return {
          title: n.title,
          body: (
            <>
              {n.img && <img src={n.img} alt="" className="mb-3 max-h-48 w-full rounded-xl object-cover" />}
              <p className="text-sm text-[var(--text-muted)]">{[n.source, n.when].filter(Boolean).join(' · ')}</p>
              {n.href && <a href={n.href} target="_blank" rel="noopener noreferrer" className="chip mt-4 bg-[var(--active-pill)] tone-up">Read article</a>}
            </>
          ),
        };
      }
    }
  };
  const view = detail ? renderDetail(detail) : null;

  return (
    <>
      <div className="dash-root">
        <div className="dash-left">
          {/* Hero benchmark */}
          <section aria-labelledby="hero-title" onPointerMove={onMove} onPointerLeave={onLeave} className="o-hero ps-card ps-hero p-3 min-[600px]:p-6 spatial-tilt spatial-layer sd-2 spatial-shadow relative">
            <span aria-hidden="true" className="spatial-glare" />
            {compact && <Hit label={`${indexName(featured)} chart`} onOpen={() => setDetail({ kind: 'hero' })} />}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Featured benchmark</p>
                <h2 id="hero-title" className="mt-0.5 truncate text-lg font-bold min-[600px]:mt-1 min-[600px]:text-2xl">{indexName(featured)}</h2>
              </div>
              <span className={`mr-5 shrink-0 rounded-full px-2.5 py-1 text-sm min-[600px]:mr-0 min-[600px]:px-3 min-[600px]:py-1.5 ${featured.changePercent >= 0 ? 'pill-up' : 'pill-down'}`}><Change value={featured.changePercent} /></span>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums min-[600px]:mt-3 min-[600px]:text-4xl lg:text-5xl">{formatLevel(featured.value)}</p>
            <div className="mt-2 h-20 min-[600px]:mt-4 min-[600px]:h-36 lg:h-52 spatial-layer sd-3">
              <Spark data={series} positive={featured.changePercent >= 0} dot glow label={`${indexName(featured)} recent price trend`} />
            </div>
            <div className="mt-4 max-[599px]:hidden spatial-layer sd-4">{chips}</div>
          </section>

          <FloatGroup>
            {/* Technical indicators + trend projection */}
            <FloatItem>
              <section aria-label="Technical indicators" className="o-tech ps-card p-3 min-[600px]:p-5">
                <div className="mb-2 flex items-baseline justify-between gap-2 min-[600px]:mb-3">
                  <div className="flex items-center gap-2">
                    <H>Technical Indicators</H>
                    {techLoading && <RefreshCw aria-hidden="true" className="h-3 w-3 animate-spin text-[var(--text-muted)]" />}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{indexName(featured)}</span>
                </div>
                <div className="tech-inner">
                  <ul className="grid grid-cols-2 gap-2">
                    {indicators.map((ind) => {
                      const isBullish = ind.state.includes('Bullish') || ind.state.includes('Above') || ind.state === 'Oversold';
                      const isBearish = ind.state.includes('Bearish') || ind.state.includes('Below') || ind.state === 'Overbought';
                      const badgeClass = isBullish
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isBearish
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-zinc-500/15 text-[var(--text-secondary)]';
                      return (
                        <li key={ind.key} className="tile relative p-2 min-[600px]:p-2.5">
                          {compact && <Hit label={ind.name} onOpen={() => setDetail({ kind: 'indicator', key: ind.key })} />}
                          <div className="flex items-center justify-between gap-1 pr-4">
                            <p className="truncate text-xs font-semibold text-[var(--text-secondary)]">
                              <span className="min-[420px]:hidden">{ind.short}</span>
                              <span className="hidden min-[420px]:inline">{ind.name}</span>
                            </p>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${badgeClass}`}>
                              {ind.state}
                            </span>
                          </div>
                          <div className="my-1 h-6 min-[600px]:h-8"><MiniLines lines={ind.lines} /></div>
                          <div className="flex items-baseline justify-between gap-1">
                            <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{ind.value}</p>
                            <span className="truncate text-[10px] text-[var(--text-muted)] font-mono">{ind.sub}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="tile relative flex flex-col p-2 min-[600px]:p-3">
                    {compact && <Hit label="Trend projection" onOpen={() => setDetail({ kind: 'projection' })} />}
                    <p className="truncate pr-4 text-xs font-semibold text-[var(--text-secondary)]">
                      <span className="min-[420px]:hidden">Trend</span><span className="hidden min-[420px]:inline">Trend projection</span>
                    </p>
                    <div className="my-1 min-h-14 flex-1 min-[600px]:my-2 min-[600px]:min-h-24">
                      {proj ? <Spark data={proj.history} projected={proj.projected} positive={proj.driftPct >= 0} area={false} label="Recent trend with dotted projection" /> : null}
                    </div>
                    {proj ? <Change value={proj.driftPct} className="text-sm" /> : <p className="text-sm">—</p>}
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      <span className="min-[600px]:hidden">Not advice</span>
                      <span className="max-[599px]:hidden">Straight-line extension of the recent trend. Not a forecast or advice.</span>
                    </p>
                  </div>
                </div>
              </section>
            </FloatItem>

            {/* Watchlist */}
            <FloatItem>
              <section aria-label="Watchlist" className="o-watch ps-card p-3 min-[600px]:p-5">
                <div className="mb-2 flex items-center justify-between gap-2 min-[600px]:mb-3">
                  <H>Watchlist</H>
                  <button type="button" onClick={() => onNavigate('watchlist')} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold tone-up">View all <ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
                </div>
                {watched.length ? (
                  <ul className="watch-row">
                    {watched.map((s) => (
                      <li key={s.ticker}>
                        <button type="button" onClick={() => (compact ? setDetail({ kind: 'stock', ticker: s.ticker }) : onSelectStock(s.ticker))} className="tile block w-full p-2 text-left hover:brightness-125 min-[600px]:p-3">
                          <span className="flex items-center justify-between gap-2 max-[599px]:flex-col max-[599px]:items-start max-[599px]:gap-0">
                            <span className="text-xs font-bold min-[600px]:text-base">{s.ticker}</span>
                            <Change value={s.changePercent} className="text-xs" />
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-semibold tabular-nums min-[600px]:text-base">{formatPrice(s.price, s.currency)}</span>
                          <span className="mt-1 block h-5 min-[600px]:mt-2 min-[600px]:h-8"><Spark data={s.sparkline} positive={s.changePercent >= 0} area={false} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Nothing here yet. Open any stock and add it to your watchlist.</p>
                )}
              </section>
            </FloatItem>

            {/* Live activity */}
            <FloatItem>
              <section aria-label="Live activity" className="o-live ps-card flex items-center gap-2 p-2.5 min-[600px]:gap-3 min-[600px]:px-5 min-[600px]:py-3">
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"><Radio aria-hidden="true" className="h-4 w-4 tone-up" /><span className="max-[399px]:sr-only">Live</span></span>
                <p className="min-w-0 flex-1 truncate text-sm">
                  {top ? (<><strong>{top.ticker}</strong> {formatPrice(top.price, top.currency)} <Change value={top.changePercent} /></>) : 'Waiting for live quotes…'}
                </p>
                <button type="button" onClick={onOpenAlerts} className="chip shrink-0 text-[var(--text-secondary)] max-[599px]:hidden">Alerts</button>
              </section>
            </FloatItem>
          </FloatGroup>
        </div>

        <div className="dash-right">
          <FloatGroup className="dash-pair">
            {/* Market sentiment */}
            <FloatItem>
              <section aria-label="Market sentiment" className="ps-card flex flex-col p-3 min-[600px]:p-5">
                {compact && <Hit label="Market sentiment" onOpen={() => setDetail({ kind: 'sentiment' })} />}
                <H>Market Sentiment</H>
                <div className="flex flex-1 flex-col justify-center py-2 min-[600px]:py-3"><Gauge value={breadth} label={mood} /></div>
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="min-[600px]:hidden">{upCount} of {stocks.length} up</span>
                  <span className="max-[599px]:hidden">{upCount} of {stocks.length} tracked stocks are up today.</span>
                </p>
              </section>
            </FloatItem>

            {/* AI analyst, written from the live numbers */}
            <FloatItem>
              <section aria-label="PeekStox AI analyst" className="ps-card flex flex-col p-3 min-[600px]:p-5">
                {compact && <Hit label="AI analyst" onOpen={() => setDetail({ kind: 'ai' })} />}
                <div className="flex items-center justify-between gap-2"><H>AI Analyst</H><Sparkles aria-hidden="true" className="h-4 w-4 tone-up max-[599px]:hidden" /></div>
                <div className="flex flex-1 items-center gap-2 py-2 min-[600px]:gap-3 min-[600px]:py-3">
                  <span aria-hidden="true" className="ps-orb h-9 w-9 shrink-0 min-[600px]:h-14 min-[600px]:w-14" />
                  <p className="line-clamp-4 text-xs leading-relaxed text-[var(--text-secondary)] min-[600px]:text-sm">
                    Breadth reads <strong className="text-[var(--text-primary)]">{mood.toLowerCase()}</strong> at {breadth}%.
                    {top && <> Biggest mover: <strong className="text-[var(--text-primary)]">{top.ticker}</strong> <Change value={top.changePercent} />.</>}
                  </p>
                </div>
                <button type="button" onClick={() => onNavigate('assistant')} className="inline-flex min-h-11 items-center gap-1 self-start rounded-lg text-sm font-semibold tone-up max-[599px]:hidden">
                  Ask AI <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </section>
            </FloatItem>
          </FloatGroup>

          {/* News */}
          <section aria-label="Latest news" className="o-news ps-card p-3 min-[600px]:p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <H>News</H>
              <button type="button" onClick={() => onNavigate('news')} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold tone-up">All news <ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <ul className="divide-y divide-[var(--border-color)]">
              {newsItems.map((n, idx) => {
                const body = (
                  <span className="flex items-center gap-3 py-2.5 min-[600px]:py-3">
                    {n.img && <img src={n.img} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover min-[600px]:h-12 min-[600px]:w-12" />}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-sm font-semibold">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{[n.source, n.when].filter(Boolean).join(' · ')}</span>
                    </span>
                  </span>
                );
                return (
                  <li key={idx}>
                    {compact ? (
                      <button type="button" onClick={() => setDetail({ kind: 'news', index: idx })} aria-haspopup="dialog" className="block w-full text-left">{body}</button>
                    ) : n.href ? (
                      <a href={n.href} target="_blank" rel="noopener noreferrer" className="block">{body}</a>
                    ) : body}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {view && <DetailSheet title={view.title} onClose={() => setDetail(null)}>{view.body}</DetailSheet>}
    </>
  );
}
