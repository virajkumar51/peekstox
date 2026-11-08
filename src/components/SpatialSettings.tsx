import { useState } from 'react';
import { disableTilt, enableTilt } from '../hooks/useSpatial';

/** Settings row. iOS only allows tilt after a tap, so the toggle must be a user action. */
export function SpatialSettings() {
  const [on, setOn] = useState(() => {
    try {
      return document.documentElement.dataset.tilt === 'on';
    } catch {
      return false;
    }
  });
  const toggle = async () => {
    if (on) { disableTilt(); setOn(false); return; }
    setOn(await enableTilt());
  };
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 hover:bg-[var(--bg-card-hover)] transition-colors">
      <span className="text-sm font-medium text-[var(--text-primary)]">Motion depth (tilt your device)</span>
      <span aria-hidden="true" className={`h-6 w-11 rounded-full p-0.5 transition-colors ${on ? 'bg-[var(--positive)]' : 'bg-[var(--border-hover)]'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
