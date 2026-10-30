# Editing on the live site (Keystatic GitHub mode)

On the dev server, `/keystatic` saves straight to `content/` on disk. On the
live site it signs you in with GitHub and saves each change as a commit to the
repo, which Vercel then deploys. Media still uploads to Vercel Blob.

This needs a GitHub App (one-off) and four env vars on Vercel.

## 1. Create the GitHub App

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**:

- **Name**: `Studio Subtract CMS`
- **Homepage URL**: `https://studio-subtract.vercel.app`
- **Callback URL**: `https://studio-subtract.vercel.app/api/keystatic/github/oauth/callback`
  (add one per domain you edit from, e.g. the custom domain once it's live)
- **Expire user authorization tokens**: on
- **Webhook**: untick **Active**
- **Repository permissions**: Contents *Read and write*, Metadata *Read-only*,
  Pull requests *Read and write*
- **Where can this GitHub App be installed?**: Any account (a private app 404s
  at sign-in for everyone but its owner; it still only reaches repos it's
  installed on)

Then on the app's page:

1. **Generate a new client secret** and copy it with the **Client ID**.
2. **Install App** → only `jpajpa/studio-subtract`.

## 2. Add env vars on Vercel

Project `studio-subtract` → Settings → Environment Variables, for Production:

| Key | Value |
| --- | --- |
| `KEYSTATIC_GITHUB_CLIENT_ID` | the app's Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | the client secret |
| `KEYSTATIC_SECRET` | any long random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | the app's slug, from its URL (`github.com/apps/<slug>`) |

`BLOB_READ_WRITE_TOKEN` is already set. Redeploy after adding them.

## 3. Use it

Open `https://studio-subtract.vercel.app/keystatic` and sign in with GitHub.
Anyone with write access to the repo can edit; uploads are refused for
everyone else.

Saves go to `main`, so each one deploys straight away. Everyone who can push
to the repo is authorised on Vercel, so their commits build.

To work up a set of changes before they go live, use the branch picker (top
left) → **New branch**, name it `cms/<name>`, and save there instead: Vercel
skips `cms/**` branches (`vercel.json`), so nothing deploys until you click
**Create pull request** and merge it.

To make that the only route, add a GitHub ruleset requiring pull requests on
`main`.
