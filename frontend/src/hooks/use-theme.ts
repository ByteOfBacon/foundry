import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const KEY = 'datagen:theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(KEY) as Theme) ?? 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    applyTheme(theme);
    if (!document.documentElement.classList.contains('theme-ready')) {
      requestAnimationFrame(() => document.documentElement.classList.add('theme-ready'));
    }
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  };

  const toggleTheme = () => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  };

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && getSystemTheme() === 'dark');

  return { theme, setTheme, toggleTheme, isDark };
}
