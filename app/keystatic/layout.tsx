import KeystaticApp from "./keystatic";
import { editorReady } from "@/lib/editor";

export const metadata = { title: "Studio Subtract — Content" };

export default function KeystaticLayout() {
  return (
    <html lang="en">
      <body>
        {editorReady ? (
          <KeystaticApp />
        ) : (
          <p style={{ font: "14px system-ui", padding: 40 }}>
            Live editing isn&apos;t set up yet: see <code>docs/keystatic-github.md</code>.
          </p>
        )}
      </body>
    </html>
  );
}
