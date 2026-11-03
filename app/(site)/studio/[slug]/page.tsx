import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Work } from "@/components/Work";
import { getPeople } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPeople()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const person = (await getPeople()).find((p) => p.slug === slug);
  if (!person) return { title: "Studio Subtract" };
  return pageMetadata({
    title: person.title,
    description: person.description || `${person.title}, ${person.category} at Studio Subtract.`,
    path: `/studio/${slug}`,
    project: person,
  });
}

/** A person opened directly: the Studio folders sit behind it, ready for "Back". */
export default async function PersonPage({ params }: Params) {
  const { slug } = await params;
  const people = await getPeople();
  if (!people.some((p) => p.slug === slug)) notFound();
  return <Work projects={people} initialSlug={slug} section="studio" />;
}
