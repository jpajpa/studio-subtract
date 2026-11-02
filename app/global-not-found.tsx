import type { Metadata } from "next";
import { NotFound } from "@/components/NotFound";
import { areal } from "@/lib/font";
import "./(site)/globals.css";

export const metadata: Metadata = { title: "Not found — Studio Subtract" };

export default function GlobalNotFound() {
  return (
    <html lang="en" className={areal.variable}>
      <body>
        <NotFound />
      </body>
    </html>
  );
}
