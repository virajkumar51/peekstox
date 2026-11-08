import type { ReactNode } from 'react';

/** Wrap each card in a .float-item div inside a .float-group. Hover lifts the card forward;
 *  the others step back. Works on laptops; phones and tablets keep a flat layout. */
export function FloatGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`float-group grid gap-4 ${className}`}>{children}</div>;
}

export function FloatItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`float-item ${className}`}>{children}</div>;
}
