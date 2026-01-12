import GetStartedForm from "./ui/GetStartedForm";

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-r from-[#8032ff] to-[#ff00ff] p-[1px]">
          <div className="rounded-3xl bg-white p-8">
            <h1 className="text-3xl font-semibold tracking-tight">Get Started</h1>
            <p className="mt-3 text-gray-600">
              Tell us about your dancer and we’ll help you find the best class fit.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <GetStartedForm />
        </div>
      </section>
    </main>
  );
}
