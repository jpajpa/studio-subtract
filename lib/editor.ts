// The live editor needs the GitHub App's env vars (docs/keystatic-github.md);
// the dev server edits files on disk and needs none.
export const editorReady =
  process.env.NODE_ENV !== "production" || !!process.env.KEYSTATIC_GITHUB_CLIENT_ID;
