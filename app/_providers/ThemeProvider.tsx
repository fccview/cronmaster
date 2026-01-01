'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      attribute="data-webtui-theme"
      defaultTheme="light"
      themes={['light', 'dark']}
      value={{
        light: 'catppuccin-latte',
        dark: 'catppuccin-mocha',
      }}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}




