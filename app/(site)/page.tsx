import type { Metadata } from "next";
import { Work } from "@/components/Work";
import { getProjects } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [first] = await getProjects();
  return pageMetadata({ path: "/", project: first });
}

export default async function Home() {
  return <Work projects={await getProjects()} />;
}
