import type { Metadata, Viewport } from "next";
import { LiquidGlass } from "@/components/LiquidGlass";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Subtract",
};

// Lets the mobile nav sit under the status bar using safe-area insets.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `js` and `liquid` classes are added before hydration by inline scripts
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* lets CSS hold back the phone folders until the stack script reveals them */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
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
