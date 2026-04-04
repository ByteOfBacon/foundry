import { Link, useLocation } from 'wouter';
import { Map, Database, Moon, Sun, Monitor, Minus, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { WindowMinimise, WindowMaximise, WindowClose } from '@/wailsjs/runtime/runtime';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: Database },
  { href: '/demand', label: 'Demand Editor', icon: Map },
];

export function Navbar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header
      className="flex h-11 items-center border-b bg-background/95 backdrop-blur select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App identity */}
      <div className="flex items-center gap-2 px-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-primary font-bold text-sm tracking-tight">Map Data Generator</span>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Nav links */}
      <nav
        className="flex items-center gap-0.5 px-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 text-xs px-2.5 ${
                location === href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle + window controls */}
      <div
        className="flex items-center gap-0.5 px-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setTheme(nextTheme)}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="size-3.5" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={WindowMinimise}
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={WindowMaximise}
        >
          <Square className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={WindowClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}
