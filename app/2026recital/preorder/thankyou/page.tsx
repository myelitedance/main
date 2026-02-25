import { Suspense } from "react";
import ThankYouClient from "./ThankYouClient";

export const dynamic = "force-dynamic";

function LoadingState() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Thank You</h1>
      <p className="mt-4 text-sm text-gray-700">Loading...</p>
    </main>
  );
}

export default function PreorderThankYouPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ThankYouClient />
    </Suspense>
  );
}
