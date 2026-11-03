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
        {/* `js` lets CSS hold back the phone folders until the stack script
            reveals them, and the folder shadows until their mask is in hand:
            a mask that has not loaded is no mask at all, and the shadow would
            paint as its own slab until it landed (Folder.module.css). Same
            request as the preload below and as FolderStack's, CORS included,
            or each gets its own copy. `shadowed` goes on whatever happens, so
            a shadow is never held back for good. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js');" +
              "var m=new Image();m.crossOrigin='anonymous';m.src='/folder-shadow.png';" +
              "var d=m.decode?m.decode():Promise.resolve();" +
              "d.catch(function(){}).then(function(){document.documentElement.classList.add('shadowed')});",
          }}
        />
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
