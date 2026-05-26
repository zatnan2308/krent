import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";

import "@/styles/globals.css";

// next/font устраняет блокирующий @import Google Fonts в CSS — шрифты
// загружаются параллельно и инжектируются как CSS-переменные, доступные
// глобально (.editorial scope их использует через var(--font-…)).
// Inter используем как замену Geist — он есть в google fonts из коробки,
// визуально близок и широкого Latin-покрытия достаточно.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: {
    default: "Krent - Real Estate and Rental Management Platform",
    template: "%s - Krent",
  },
  description:
    "White-label platform for real estate sales, long-term and short-term rentals, direct booking, CRM and marketing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
