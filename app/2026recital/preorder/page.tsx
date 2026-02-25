import PreorderForm from "./PreorderForm";

export default function RecitalPreorderPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-purple-700">2026 Recital Preorder</h1>
        <p className="mt-2 text-sm text-slate-700">
          Reserve a recital yearbook and/or dancer congratulations ad.
        </p>
      </header>

      <PreorderForm />
    </main>
  );
}
