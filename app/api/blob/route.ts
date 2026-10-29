import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { REPO } from "@/keystatic.config";

// Hands the Keystatic editor a short-lived token to upload one file straight
// to Vercel Blob; needs BLOB_READ_WRITE_TOKEN (.env.local, and on Vercel).
const live = process.env.NODE_ENV === "production";

/** Live site: only someone signed in to the editor who can push to the repo. */
async function canEdit() {
  const token = (await cookies()).get("keystatic-gh-access-token")?.value;
  if (!token) return false;
  const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.name}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const repo = (await res.json()) as { permissions?: { push?: boolean } };
  return !!repo.permissions?.push;
}

const ALLOWED = ["image/*", "video/mp4", "video/webm", "video/quicktime", "application/pdf"];

/** Lets the editor check its sign-in before uploading (401: renew it). */
export async function GET() {
  if (live && !(await canEdit())) return new Response("Sign in to the editor first", { status: 401 });
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  if (live && !(await canEdit())) return new Response("Sign in to the editor first", { status: 401 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({ allowedContentTypes: ALLOWED, addRandomSuffix: true }),
    });
    return Response.json(json);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
  }
}
