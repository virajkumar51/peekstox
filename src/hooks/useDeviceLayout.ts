import { useEffect, useState } from 'react';

/**
 * Window-size classes (same idea as Material's compact / medium / expanded).
 * Layout follows the space available, not the device name:
 *   compact  < 600px     phones, foldables when closed
 *   medium   600-1023px  tablets, foldables when open, small windows
 *   expanded >= 1024px   laptops, desktops, large tablets in landscape
 */
export type LayoutMode = 'compact' | 'medium' | 'expanded';

export interface DeviceLayout {
  mode: LayoutMode;
  /** True when a foldable's window spans two screens (hinge between them). */
  isSpanned: boolean;
  showSidebar: boolean;
  showBottomNav: boolean;
}

const MEDIUM_MIN = 600;
const EXPANDED_MIN = 1024;

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

function compute(): DeviceLayout {
  // Unsupported browsers report false, so they fall back to width classes.
  const isSpanned = matches('(horizontal-viewport-segments: 2)');
  const mode: LayoutMode = matches(`(min-width: ${EXPANDED_MIN}px)`)
    ? 'expanded'
    : matches(`(min-width: ${MEDIUM_MIN}px)`)
      ? 'medium'
      : 'compact';
  // Sidebar on large or spanned screens, bottom nav everywhere else.
  const showSidebar = mode === 'expanded' || isSpanned;
  return { mode, isSpanned, showSidebar, showBottomNav: !showSidebar };
}

export function useDeviceLayout(): DeviceLayout {
  const [layout, setLayout] = useState<DeviceLayout>(compute);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const lists = [
      `(min-width: ${MEDIUM_MIN}px)`,
      `(min-width: ${EXPANDED_MIN}px)`,
      '(horizontal-viewport-segments: 2)',
    ].map((q) => window.matchMedia(q));

    const update = () =>
      setLayout((prev) => {
        const next = compute();
        return prev.mode === next.mode && prev.isSpanned === next.isSpanned ? prev : next;
      });

    // Listening to media queries only fires when a boundary is crossed,
    // unlike a resize listener, so rotating or unfolding costs one render.
    lists.forEach((l) => l.addEventListener('change', update));
    update();
    return () => lists.forEach((l) => l.removeEventListener('change', update));
  }, []);

  return layout;
}
