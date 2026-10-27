import { Work } from "@/components/Work";
import { getProjects } from "@/lib/cms";

export default async function Home() {
  return <Work projects={await getProjects()} />;
}
