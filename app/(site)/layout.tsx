import type { Metadata, Viewport } from "next";
import { LiquidGlass } from "@/components/LiquidGlass";
import { areal } from "@/lib/font";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Studio Subtract",
};

// Lets the mobile nav sit under the status bar using safe-area insets.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `js` and `liquid` classes are added before hydration by inline scripts
    <html lang="en" className={areal.variable} suppressHydrationWarning>
      <head>
        {/* lets CSS hold back the phone folders until the stack script reveals them */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* every folder's shadow: in hand before the first one draws */}
        <link rel="preload" href="/folder-shadow.png" as="image" crossOrigin="anonymous" />
      </head>
      <body>
        <LiquidGlass />
        {children}
      </body>
    </html>
  );
}
