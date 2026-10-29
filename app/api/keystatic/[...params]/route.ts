import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "@/keystatic.config";
import { editorReady } from "@/lib/editor";

// GitHub mode throws without its env vars, so the live site 404s until
// they're set (see docs/keystatic-github.md)
const handler = editorReady ? makeRouteHandler({ config }) : null;
const notFound = () => new Response("Not found", { status: 404 });

export const GET = handler?.GET ?? notFound;
export const POST = handler?.POST ?? notFound;
