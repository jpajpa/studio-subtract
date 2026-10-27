import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Hands the Keystatic editor a short-lived token to upload one file straight
// to Vercel Blob. Local editing only, like the editor itself (see
// app/keystatic/layout.tsx); needs BLOB_READ_WRITE_TOKEN in .env.local.
const live = process.env.NODE_ENV === "production";

const ALLOWED = ["image/*", "video/mp4", "video/webm", "video/quicktime", "application/pdf"];

export async function POST(request: Request) {
  if (live) return new Response("Not found", { status: 404 });
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
