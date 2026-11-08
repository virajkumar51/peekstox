import type { ReactNode } from 'react';

/** A real link (#/view) so middle-click, copy-link and screen-reader "link" semantics work,
 *  while a plain click navigates in-app without a page load. */
export function NavLink({
  id, active, onNavigate, onAfter, className, children,
}: {
  id: string;
  active: boolean;
  onNavigate: (id: string) => void;
  onAfter?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#/${id}`}
      aria-current={active ? 'page' : undefined}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(id);
        onAfter?.();
      }}
    >
      {children}
    </a>
  );
}
