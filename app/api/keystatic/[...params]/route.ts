import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "@/keystatic.config";

const handler = makeRouteHandler({ config });
const notFound = () => new Response("Not found", { status: 404 });

// local editing only (see app/keystatic/layout.tsx)
const live = process.env.NODE_ENV === "production";
export const GET = live ? notFound : handler.GET;
export const POST = live ? notFound : handler.POST;
