import type { Metadata } from "next";
import { Work } from "@/components/Work";
import { getPeople } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const people = await getPeople();
  return pageMetadata({
    title: "Studio",
    description: "The people behind Studio Subtract.",
    path: "/studio",
    project: people.find((p) => p.media.length),
  });
}

export default async function Studio() {
  return <Work projects={await getPeople()} section="studio" />;
}
