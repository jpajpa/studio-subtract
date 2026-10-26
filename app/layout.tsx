import type { Metadata, Viewport } from "next";
import { LiquidGlass } from "@/components/LiquidGlass";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Subtract",
  description: "Studio Subtract — selected work.",
};

// Lets the mobile nav sit under the status bar using safe-area insets.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `liquid` class is added before hydration by LiquidGlass's inline script
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/ABCAreal/ABCArealSuperfamilyVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <LiquidGlass />
        {children}
      </body>
    </html>
  );
}
