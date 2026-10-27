import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Work } from "@/components/Work";
import { getProjects } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = (await getProjects()).find((p) => p.slug === slug);
  return { title: project ? `${project.title} — Studio Subtract` : "Studio Subtract" };
}

/** A project opened directly: the folders sit behind it, ready for "Back". */
export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const projects = await getProjects();
  if (!projects.some((p) => p.slug === slug)) notFound();
  return <Work projects={projects} initialSlug={slug} />;
}
