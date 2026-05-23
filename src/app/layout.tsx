import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
