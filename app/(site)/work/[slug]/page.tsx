import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Work } from "@/components/Work";
import { getProjects } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = (await getProjects()).find((p) => p.slug === slug);
  if (!project) return { title: "Studio Subtract" };
  return pageMetadata({
    title: project.title,
    description: project.description || `${project.title}, a project by Studio Subtract.`,
    path: `/work/${slug}`,
    project,
  });
}

/** A project opened directly: the folders sit behind it, ready for "Back". */
export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const projects = await getProjects();
  if (!projects.some((p) => p.slug === slug)) notFound();
  return <Work projects={projects} initialSlug={slug} />;
}
