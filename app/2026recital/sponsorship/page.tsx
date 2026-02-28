import SponsorshipForm from "@/app/recital/SponsorshipForm";

type SponsorshipTier = {
  icon: string;
  title: string;
  tagline?: string;
  qty: string;
  investment: string;
  blurb: string;
  includes: string[];
};

const tiers: SponsorshipTier[] = [
  {
    icon: "🌟",
    title: "Recital Title Sponsor",
    tagline: "The 2026 Elite Dance Recital Presented by ______",
    qty: "1",
    investment: "$2,500",
    blurb: "This partner helps power the entire celebration.",
    includes: [
      "Inside Front Cover Full-Page Ad (Premium Placement)",
      "On-Stage Verbal Recognition",
      "Presented By logo placement on digital screen throughout the show",
      "Logo featured on recital signage",
      "Recognition in pre- and post-recital email",
      "2 recital tickets + early ticket purchasing access",
    ],
  },
  {
    icon: "🎭",
    title: "Intermission Sponsor",
    tagline: "Intermission Brought to You By ______",
    qty: "1",
    investment: "$1,500",
    blurb: "This sponsor anchors one of the most memorable moments of the evening.",
    includes: [
      "Full-Page Ad placed directly behind Intermission page",
      "Logo displayed on digital screen during intermission",
      "On-Stage Intermission Recognition",
      "Logo included on sponsor signage at venue",
      "2 recital tickets (parent access window)",
    ],
  },
  {
    icon: "💜",
    title: "Performance Sponsors",
    qty: "4",
    investment: "$500",
    blurb: "Performance Sponsors directly support the stage experience for our dancers.",
    includes: [
      "1/2 Page Ad in Program",
      "On-Stage Recognition",
      "Logo included on sponsor signage",
    ],
  },
  {
    icon: "🎀",
    title: "Program Sponsors",
    qty: "4",
    investment: "$250",
    blurb: "A simple and meaningful way to support our recital community.",
    includes: [
      "1/4 Page Ad",
      "Placement in back of program",
      "Listed on sponsor recognition page",
    ],
  },
];

export default function RecitalSponsorshipPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-r from-dance-purple/10 via-dance-pink/10 to-dance-blue/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-dance-purple">
            🎀 Elite Dance 2026 Spring Recital
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Community Sponsorship Invitation
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-700">
            Each year, our Spring Recital celebrates the courage, discipline, and growth of every
            dancer who steps on stage.
          </p>
          <p className="mt-3 max-w-3xl text-base text-slate-700">
            We are inviting a limited number of aligned local businesses to partner with us in
            creating a meaningful and memorable experience for our students and families.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-dance-pink/30 bg-white px-4 py-1.5 text-sm font-semibold text-dance-pink">
            All sponsorship levels are limited to preserve exclusivity.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {tiers.map((tier) => (
            <article
              key={tier.title}
              className="relative rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.10)] ring-1 ring-dance-purple/15 transition hover:-translate-y-0.5 hover:border-dance-purple/50 hover:shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue" />
              <p className="text-2xl">{tier.icon}</p>
              <h2 className="mt-2 text-2xl font-bold text-dance-purple">{tier.title}</h2>
              {tier.tagline ? <p className="mt-2 text-sm italic text-slate-700">“{tier.tagline}”</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-dance-pink/15 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-dance-pink">
                  QTY: {tier.qty}
                </span>
                <span className="rounded-full bg-dance-purple/10 px-3 py-1 text-sm font-bold text-dance-purple">
                  Investment: {tier.investment}
                </span>
              </div>
              <p className="mt-4 text-slate-700">{tier.blurb}</p>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Includes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {tier.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[2px] text-dance-pink">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
          <h2 className="text-2xl font-bold text-dance-purple">Why Partner With Elite Dance?</h2>
          <p className="mt-3 max-w-4xl text-slate-700">
            Our recital brings together hundreds of local families in celebration of hard work,
            confidence, and artistry. Sponsorship is not just visibility. It is alignment with a
            studio centered on student growth and community impact.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-900 p-7 text-slate-100">
          <h2 className="text-2xl font-bold">Sponsorship Availability Inquiry</h2>
          <p className="mt-3 text-slate-200">
            To inquire about availability, please complete the form below.
          </p>
          <div className="mt-6 rounded-xl bg-white p-5 text-slate-900">
            <SponsorshipForm />
          </div>
        </div>
      </section>
    </main>
  );
}
