import type { Metadata } from "next";
import { Work } from "@/components/Work";
import { getPeople } from "@/lib/cms";

export const metadata: Metadata = { title: "Studio — Studio Subtract" };

export default async function Studio() {
  return <Work projects={await getPeople()} section="studio" />;
}
