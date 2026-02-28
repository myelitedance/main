import { notFound } from "next/navigation";
import RecitalInfoPage from "../RecitalInfoPage";
import { getRecitalBySlug } from "@/data/recitals";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RecitalSeasonPage({ params }: PageProps) {
  const { slug } = await params;
  const recital = getRecitalBySlug(slug);

  if (!recital) notFound();

  return <RecitalInfoPage recital={recital} />;
}

