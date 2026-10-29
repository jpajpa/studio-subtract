import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Work } from "@/components/Work";
import { getPeople } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPeople()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const person = (await getPeople()).find((p) => p.slug === slug);
  return { title: person ? `${person.title} — Studio Subtract` : "Studio — Studio Subtract" };
}

/** A person opened directly: the Studio folders sit behind it, ready for "Back". */
export default async function PersonPage({ params }: Params) {
  const { slug } = await params;
  const people = await getPeople();
  if (!people.some((p) => p.slug === slug)) notFound();
  return <Work projects={people} initialSlug={slug} section="studio" />;
}
