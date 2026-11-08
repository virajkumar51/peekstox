import { useId, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatSignedPercent } from '../utils/market';

const W = 100;
const H = 40;

function toPoints(data: number[], min: number, max: number): [number, number][] {
  const range = max - min || 1;
  return data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, H - 3 - ((v - min) / range) * (H - 6)]);
}
const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

/** Up/down change with an arrow and screen-reader text, so colour is never the only signal. */
export function Change({ value, className = '' }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${up ? 'tone-up' : 'tone-down'} ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">{up ? 'Up' : 'Down'}</span>
      {formatSignedPercent(value)}
    </span>
  );
}

/** Responsive line + soft area, with interactive zoom & pan capability. */
export function Spark({
  data,
  projected,
  positive = true,
  area = true,
  dot = false,
  label,
}: {
  data: number[];
  projected?: number[];
  positive?: boolean;
  area?: boolean;
  dot?: boolean;
  label?: string;
}) {
  const gid = useId();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0); // 0 to 1 offset
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length < 2) return <div className="h-full w-full" aria-hidden="true" />;

  const all = projected ? [...data, ...projected] : data;
  
  // Slice data based on zoom and pan
  const visibleCount = Math.max(2, Math.round(all.length / zoom));
  const maxPanStart = Math.max(0, all.length - visibleCount);
  const startIndex = Math.round(pan * maxPanStart);
  const endIndex = Math.min(all.length, startIndex + visibleCount);
  const sliceData = all.slice(startIndex, endIndex);

  const min = Math.min(...sliceData);
  const max = Math.max(...sliceData);
  const pts = toPoints(sliceData, min, max);
  const hist = pts.slice(0, Math.min(pts.length, data.length - startIndex));
  const proj = projected && endIndex > data.length ? pts.slice(Math.max(0, data.length - startIndex)) : [];
  const end = hist[hist.length - 1] || pts[pts.length - 1];

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom((prev) => Math.max(1, Math.min(6, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.floor(xRatio * sliceData.length);
    setHoverIdx(startIndex + idx);

    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - dragStart;
      const panDelta = -deltaX / (rect.width * zoom);
      setPan((p) => Math.max(0, Math.min(1, p + panDelta)));
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1);
    setPan(0);
  };

  const hoveredVal = hoverIdx !== null && all[hoverIdx] !== undefined ? all[hoverIdx] : null;

  return (
    <div
      className={`relative h-full w-full select-none cursor-grab active:cursor-grabbing ${positive ? 'tone-up' : 'tone-down'}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setIsDragging(false); setHoverIdx(null); }}
      onDoubleClick={resetZoom}
    >
      {zoom > 1 && (
        <span
          role="button"
          tabIndex={0}
          onClick={resetZoom}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') resetZoom(e as any); }}
          className="absolute top-1 right-1 z-20 rounded bg-[var(--bg-main)]/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors shadow-sm cursor-pointer"
          title="Double click or click to reset zoom"
        >
          {zoom.toFixed(1)}x (Reset)
        </span>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && hist.length > 0 && end && <path d={`${toPath(hist)} L${end[0]} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />}
        {hist.length > 0 && <path d={toPath(hist)} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {proj.length > 1 && (
          <path d={toPath(proj)} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.8" />
        )}
      </svg>
      {dot && end && (
        <span
          aria-hidden="true"
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-card,#111316)] bg-current"
          style={{ left: `${end[0]}%`, top: `${(end[1] / H) * 100}%` }}
        />
      )}
    </div>
  );
}

/** Up to three overlaid thin lines sharing one scale (price + average, price + bands, etc.). */
export function MiniLines({ lines }: { lines: { data: number[]; muted?: boolean }[] }) {
  const valid = lines.filter((l) => l.data.length > 1);
  if (!valid.length) return <div className="h-full w-full" aria-hidden="true" />;
  const flat = valid.flatMap((l) => l.data);
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full tone-up" aria-hidden="true">
      {valid.map((l, i) => {
        const offset = Math.max(0, (valid[0].data.length - l.data.length) / Math.max(1, valid[0].data.length - 1)) * W;
        const pts = toPoints(l.data, min, max).map(([x, y]) => [Math.min(W, x * (1 - offset / W) + offset), y] as [number, number]);
        return <path key={i} d={toPath(pts)} fill="none" stroke="currentColor" strokeWidth={l.muted ? 1.25 : 2} opacity={l.muted ? 0.5 : 1} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

/** Semicircle gauge, value 0-100, red to green. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const gid = useId();
  const r = 52;
  const len = Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative mx-auto w-full max-w-[11rem]" role="img" aria-label={`${label}, ${v} out of 100`}>
      <svg viewBox="0 0 120 68" className="w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="112" y2="0">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M8 60 A52 52 0 0 1 112 60" fill="none" stroke={`url(#${gid})`} strokeWidth="10" strokeLinecap="round" opacity="0.22" />
        <path d="M8 60 A52 52 0 0 1 112 60" fill="none" stroke={`url(#${gid})`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(len * v) / 100} ${len}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-2xl font-bold leading-none tabular-nums">{v}%</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}
