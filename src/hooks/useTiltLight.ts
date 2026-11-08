import { useEffect } from 'react';

export function useTiltLight() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      root.style.setProperty('--tx', x.toFixed(3));
      root.style.setProperty('--ty', y.toFixed(3));
      raf = Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 30));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    if (root.dataset.tilt === 'on') window.addEventListener('deviceorientation', onTilt);
    const obs = new MutationObserver(() => {
      if (root.dataset.tilt === 'on') window.addEventListener('deviceorientation', onTilt);
      else { window.removeEventListener('deviceorientation', onTilt); tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); }
    });
    obs.observe(root, { attributes: true, attributeFilter: ['data-tilt'] });
    return () => { window.removeEventListener('deviceorientation', onTilt); obs.disconnect(); cancelAnimationFrame(raf); };
  }, []);
}

export async function enableTiltLight(): Promise<boolean> {
  const DOE = (window as any).DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function') {
    const res = await DOE.requestPermission().catch(() => 'denied');
    if (res !== 'granted') return false;
  }
  document.documentElement.dataset.tilt = 'on';
  return true;
}
