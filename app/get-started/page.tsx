import GetStartedForm from "./ui/GetStartedForm";

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold">
          A Dance Studio Where Your Child Is Seen and Supported
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Ballet-centered dance education for ages 3–adult in Nolensville.
        </p>
        <a href="#form" className="inline-block mt-6 rounded-2xl bg-black px-6 py-3 text-white font-semibold">
          Find the Right Class →
        </a>
      </section>

      {/* WHAT HAPPENS NEXT */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        {/* bullets */}
      </section>

      {/* FORM */}
      <section id="form" className="mx-auto max-w-4xl px-6 pb-20">
        <GetStartedForm />
      </section>
    </main>
  );
}