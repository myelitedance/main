import Image from "next/image";
import GetStartedForm from "./ui/GetStartedForm";

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* =========================
          HERO — DARK / HOMEPAGE DNA
         ========================= */}
      <section className="relative bg-slate-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8032ff]/30 to-[#ff00ff]/20" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 grid gap-16 md:grid-cols-2 items-center">
          {/* LEFT — COPY */}
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Your Child’s Dance Journey
              <br />
              Starts Here
            </h1>

            <p className="mt-6 text-lg text-slate-200 max-w-xl">
              Ballet-centered training that builds confidence, coordination,
              and joy — for dancers ages 3 through adult.
            </p>

            <a
              href="#form"
              className="inline-flex items-center mt-8 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
            >
              Find the Right Class →
            </a>
          </div>

          {/* RIGHT — VISUAL */}
          <div className="relative">
            <div className="relative h-[420px] w-full rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/assets/hip-hop-kids.jpg"
                alt="Children dancing at Elite Dance & Music"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* OFFSET IMAGE FOR MOTION */}
            <div className="absolute -bottom-10 -left-10 hidden md:block h-48 w-48 rounded-2xl overflow-hidden shadow-xl border border-white/10">
              <Image
                src="/assets/ballet-class.jpg"
                alt="Ballet class"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          TRUST STRIP — LIGHT
         ========================= */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 md:grid-cols-4 text-center">
          <TrustItem title="Ballet-Centered" text="Strong foundation for every dancer" />
          <TrustItem title="Age-Appropriate" text="Classes placed by age & experience" />
          <TrustItem title="Supportive Instructors" text="Encouraging, confident teaching" />
          <TrustItem title="No Pressure" text="Guidance first, enrollment later" />
        </div>
      </section>

      {/* =========================
          VISUAL REASSURANCE
         ========================= */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <ImageCard src="/assets/jazz-class.jpg" />
          <ImageCard src="/assets/ballet-class.jpg" />
          <ImageCard src="/assets/hip-hop-kids.jpg" />
        </div>

        <p className="mt-10 text-center text-lg text-gray-700">
          A welcoming environment where dancers grow with confidence —
          on and off the dance floor.
        </p>
      </section>

      {/* =========================
          FORM TRANSITION
         ========================= */}
      <section className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-2xl font-semibold">
          Let’s Find the Right Fit
        </h2>
        <p className="mt-4 text-gray-600">
          Share a few details about your dancer and we’ll personally guide
          you to the best next step.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Takes about 60 seconds · No obligation
        </p>
      </section>

      {/* =========================
          FORM
         ========================= */}
      <section
        id="form"
        className="mx-auto max-w-4xl px-6 py-16"
      >
        <GetStartedForm />
      </section>

    </main>
  );
}

/* =========================
   Helper Components
   ========================= */

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
    </div>
  );
}

function ImageCard({ src }: { src: string }) {
  return (
    <div className="relative h-72 rounded-3xl overflow-hidden shadow-lg">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
      />
    </div>
  );
}
