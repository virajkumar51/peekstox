import { useCallback, useEffect } from 'react';

/** Global depth: writes --px and --py (-1..1) on <html>, eased toward the target every frame.
 *  Sources: mouse position (desktop) and device tilt (phones and tablets, after permission). */
export function useSpatialRoot() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      return;
    }
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      root.style.setProperty('--px', x.toFixed(4));
      root.style.setProperty('--py', y.toFixed(4));
      raf = Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 30));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      kick();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    if (root.dataset.tilt === 'on') window.addEventListener('deviceorientation', onTilt);
    const onToggle = () => {
      if (root.dataset.tilt === 'on') window.addEventListener('deviceorientation', onTilt);
      else { window.removeEventListener('deviceorientation', onTilt); tx = 0; ty = 0; kick(); }
    };
    const obs = new MutationObserver(onToggle);
    obs.observe(root, { attributes: true, attributeFilter: ['data-tilt'] });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** Call from a button tap (iOS needs a user gesture). Returns true when tilt is active. */
export async function enableTilt(): Promise<boolean> {
  const DOE = (window as any).DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function') {
    const res = await DOE.requestPermission().catch(() => 'denied');
    if (res !== 'granted') return false;
  }
  document.documentElement.dataset.tilt = 'on';
  return true;
}

export function disableTilt() {
  document.documentElement.dataset.tilt = 'off';
}

/** Tilt-and-glare for one card under the mouse. Touch and pen are ignored (they use device tilt). */
export function useCardTilt(max = 6) {
  return useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 2 * max}deg`);
    el.style.setProperty('--sx', `${px * 100}%`);
    el.style.setProperty('--sy', `${py * 100}%`);
  }, [max]);
}

export function useCardTiltReset() {
  return useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);
}
