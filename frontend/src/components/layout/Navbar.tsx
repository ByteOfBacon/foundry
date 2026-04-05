import { Anvil, Database, Map } from 'lucide-react';
import { type ComponentType, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';

import {
  APP_SHELL_PADDING_CLASS,
  APP_SHELL_WIDTH_CLASS,
} from '@/components/layout/layout-shell';
import { cn } from '@/lib/utils';

type NavLinkConfig = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isCurrent: (location: string) => boolean;
};

const navLinks: NavLinkConfig[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Database,
    isCurrent: (location: string) => location === '/',
  },
  {
    href: '/demand',
    label: 'Demand Editor',
    icon: Map,
    isCurrent: (location: string) => location.startsWith('/demand'),
  },
] as const;

const NAV_ITEM_BASE_CLASS =
  'group relative flex items-center gap-2 rounded-lg px-[clamp(0.45rem,0.95vw,0.7rem)] py-[clamp(0.4rem,0.82vw,0.56rem)] text-[clamp(0.8rem,0.95vw,0.9rem)] font-semibold text-muted-foreground transition-all duration-150';
const NAV_ITEM_ACCENT_HOVER_CLASS = 'hover:text-primary hover:bg-accent/45';
const NAV_CURRENT_INDICATOR_CLASS =
  'absolute -bottom-[0.38rem] left-1/2 h-1 w-[calc(100%-1rem)] -translate-x-1/2 rounded-full bg-primary';

// Foundry uses a frameless Wails window — no OS title bar, so only top-3 (12px) gap is needed.
const NAVBAR_TOP_PX = 12;
const NAVBAR_BOTTOM_GAP_PX = 12;

export function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const [location] = useLocation();

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    const updateOffset = () => {
      const offset = Math.ceil(
        element.getBoundingClientRect().height + NAVBAR_TOP_PX + NAVBAR_BOTTOM_GAP_PX,
      );
      document.documentElement.style.setProperty('--app-navbar-offset', `${offset}px`);
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(element);
    window.addEventListener('resize', updateOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.removeProperty('--app-navbar-offset');
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-3 z-50 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className={cn(APP_SHELL_WIDTH_CLASS, APP_SHELL_PADDING_CLASS)}>
        <div className="flex min-h-[4rem] flex-wrap items-center gap-y-2 rounded-2xl border border-border/70 bg-background/90 px-[clamp(0.8rem,2vw,1.4rem)] py-1.5 shadow-sm backdrop-blur-md">
          {/* Left: logo + nav links */}
          <div
            className="flex min-w-0 flex-wrap items-center gap-[clamp(0.6rem,1.8vw,1.25rem)]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[clamp(1rem,1.55vw,1.15rem)] font-extrabold tracking-[0.01em] text-foreground"
            >
              <Anvil className="h-[1.2em] w-[1.2em]" />
              <span>Foundry</span>
            </Link>
            <nav className="flex max-w-full flex-wrap items-center gap-1.5">
              {navLinks.map(({ href, label, icon: Icon, isCurrent }) => {
                const current = isCurrent(location);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      NAV_ITEM_BASE_CLASS,
                      NAV_ITEM_ACCENT_HOVER_CLASS,
                      current ? 'text-primary bg-accent/45' : undefined,
                    )}
                  >
                    <Icon className="h-[1.05em] w-[1.05em] shrink-0 transition-colors" />
                    <span>{label}</span>
                    {current && <span aria-hidden className={NAV_CURRENT_INDICATOR_CLASS} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
