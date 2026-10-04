'use client'

import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@phosphor-icons/react';
import { useIsHydrated } from '@/app/_hooks/useIsHydrated';
import { useTranslations } from 'next-intl';

export const ThemeToggle = () => {
  const t = useTranslations();
  const mounted = useIsHydrated();
  const { theme, setTheme } = useTheme();

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 ascii-border bg-background0 hover:bg-background1 transition-colors"
      aria-label={isDark ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
      title={isDark ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
    >
      {isDark ? (
        <SunIcon size={20} weight="regular" className="text-foreground" />
      ) : (
        <MoonIcon size={20} weight="regular" className="text-foreground" />
      )}
    </button>
  );
};
