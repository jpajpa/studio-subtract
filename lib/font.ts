import localFont from "next/font/local";

// Hashed and cached for good by Next, unlike a file served from public/. Plain
// Areal, not the superfamily file: the site never uses its Mono cuts.
export const areal = localFont({
  src: "../public/fonts/ABCAreal/ABC Areal/WOFF2/ABCArealVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-areal",
});
