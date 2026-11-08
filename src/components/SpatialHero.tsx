import { useCardTilt, useCardTiltReset } from '../hooks/useSpatial';

/** Example: a hero card with depth layers. Use the same classes on any card or badge. */
export function SpatialHero({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const onMove = useCardTilt(6);
  const onLeave = useCardTiltReset();
  return (
    <section onPointerMove={onMove} onPointerLeave={onLeave} className={`ps-card ps-hero spatial-tilt spatial-layer sd-2 spatial-shadow relative p-5 ${className}`}>
      <span aria-hidden="true" className="spatial-glare" />
      <div className="spatial-layer sd-3 relative z-[1]">{children}</div>
      <span className="spatial-layer sd-4 absolute right-4 top-4 z-[1] rounded-full px-2 py-1 text-xs tone-chip">Live</span>
    </section>
  );
}
