import RecitalInfoPage from "./RecitalInfoPage";
import { DEFAULT_RECITAL_SLUG, getRecitalBySlug } from "@/data/recitals";

export default function RecitalLandingPage() {
  const recital = getRecitalBySlug(DEFAULT_RECITAL_SLUG);

  if (!recital) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Recital information is not published yet.</h1>
      </main>
    );
  }

  return <RecitalInfoPage recital={recital} />;
}

