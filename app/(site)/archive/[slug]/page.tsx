import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Work } from "@/components/Work";
import { getArchive } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getArchive()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = (await getArchive()).find((p) => p.slug === slug);
  if (!project) return { title: "Studio Subtract" };
  return {
    ...pageMetadata({
      description: project.description || `${project.title}, a project by Studio Subtract.`,
      path: `/archive/${slug}`,
      project,
    }),
    // unlisted, like the page its folders sit on
    robots: { index: false, follow: false },
  };
}

/** An archive project opened directly: its folders sit behind it, ready for "Back". */
export default async function ArchiveProjectPage({ params }: Params) {
  const { slug } = await params;
  const projects = await getArchive();
  if (!projects.some((p) => p.slug === slug)) notFound();
  return <Work projects={projects} initialSlug={slug} section="archive" />;
}
