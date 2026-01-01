import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/app/_providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/app/_components/FeatureComponents/PWA/ServiceWorkerRegister";
import { loadTranslationMessages } from "@/app/_server/actions/translations";
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/azeret-mono';

import { NextIntlClientProvider } from "next-intl";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cr*nMaster - Cron Management made easy",
  description:
    "The ultimate cron job management platform with intelligent scheduling, real-time monitoring, and powerful automation tools",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cr*nMaster",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = process.env.LOCALE || "en";
  let messages;

  messages = await loadTranslationMessages(locale);

  return (
    <html lang="en" suppressHydrationWarning data-webtui-theme="catppuccin-latte">
      <head>
        <meta name="application-name" content="Cr*nMaster" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cr*nMaster" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="stylesheet" href="/webtui/base.css" />
        <link rel="stylesheet" href="/webtui/theme-catppuccin.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'light';
                const webtui = theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte';
                document.documentElement.setAttribute('data-webtui-theme', webtui);
              })();
            `,
          }}
        />
      </head>
      <body className={`${jetbrainsMono.variable} terminal-font`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
