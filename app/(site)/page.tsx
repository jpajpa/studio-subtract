import type { Metadata } from "next";
import { Work } from "@/components/Work";
import { getProjects } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

// No project is passed: the home page shares the studio's own plain card
// rather than whichever project happens to sit first in the CMS.
export const metadata: Metadata = pageMetadata({ path: "/" });

export default async function Home() {
  return <Work projects={await getProjects()} />;
}
