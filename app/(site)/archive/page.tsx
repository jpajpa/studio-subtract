import type { Metadata } from "next";
import { Work } from "@/components/Work";
import { getArchive } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

// Unlisted: no link in the nav, kept out of the sitemap and told not to be
// indexed, so it is reached only by being sent the address. That is quiet,
// not private: anyone holding the link can open it.
export const metadata: Metadata = {
  ...pageMetadata({ description: "Selected commercial work.", path: "/archive" }),
  robots: { index: false, follow: false },
};

export default async function Archive() {
  return <Work projects={await getArchive()} section="archive" />;
}
