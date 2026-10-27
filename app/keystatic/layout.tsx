import KeystaticApp from "./keystatic";

export const metadata = { title: "Studio Subtract — Content" };

// Local editing only: saving writes files into this repo, so the editor is
// switched off in production builds.
export default function KeystaticLayout() {
  return (
    <html lang="en">
      <body>
        {process.env.NODE_ENV === "production" ? (
          <p style={{ font: "14px system-ui", padding: 40 }}>
            Edit content locally: run <code>npm run dev</code> and open /keystatic.
          </p>
        ) : (
          <KeystaticApp />
        )}
      </body>
    </html>
  );
}
