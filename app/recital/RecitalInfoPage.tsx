import Link from "next/link";
import type { RecitalRecord } from "@/data/recitals";
import SponsorshipForm from "./SponsorshipForm";

type Props = {
  recital: RecitalRecord;
};

export default function RecitalInfoPage({ recital }: Props) {
  return (
    <main className="bg-white text-slate-900">
      <section className="bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">{recital.season}</p>
          <h1 className="text-3xl font-bold sm:text-5xl">{recital.title}</h1>
          <p className="mt-4 max-w-3xl text-base text-white/95 sm:text-lg">{recital.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={recital.storeUrl}
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-dance-purple transition hover:bg-slate-100"
            >
              {recital.storeLabel}
            </Link>
            <a href="#sponsorship-form" className="rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Contact for Sponsorship
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-2xl font-bold text-dance-purple">Venue</h2>
          <p className="mt-3 text-lg font-semibold">{recital.venue.name}</p>
          <p className="mt-1 text-slate-700">{recital.venue.addressLine1}</p>
          <p className="text-slate-700">{recital.venue.addressLine2}</p>
          {recital.venue.notes ? <p className="mt-3 text-sm text-slate-600">{recital.venue.notes}</p> : null}
          <a
            href={recital.venue.mapLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-sm font-semibold text-dance-blue underline underline-offset-2"
          >
            Open in Google Maps
          </a>
          {recital.venue.photoUrls.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {recital.venue.photoUrls.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`${recital.venue.name} photo ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
              Venue photos will be added here as soon as they are available.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <iframe
            title={`${recital.venue.name} map`}
            src={recital.venue.mapEmbedUrl}
            loading="lazy"
            className="h-[420px] w-full"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-dance-purple">Important Dates</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {recital.keyDates.map((item) => (
            <article key={`${item.label}-${item.dateLabel}`} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-dance-pink">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{item.dateLabel}</p>
              {item.timeLabel ? <p className="mt-1 text-slate-700">{item.timeLabel}</p> : null}
              {item.note ? <p className="mt-2 text-sm text-slate-600">{item.note}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-2xl font-bold text-dance-purple">{recital.pictureWeek.heading}</h2>
          <p className="mt-3 text-slate-700">{recital.pictureWeek.summary}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recital.pictureWeek.windows.map((window) => (
              <article key={`${window.label}-${window.dateLabel}`} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-dance-pink">{window.label}</p>
                <p className="mt-1 font-semibold text-slate-900">{window.dateLabel}</p>
                {window.note ? <p className="mt-2 text-sm text-slate-600">{window.note}</p> : null}
              </article>
            ))}
          </div>
          {recital.pictureWeek.schedulePdfUrl ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <a
                href={recital.pictureWeek.schedulePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-lg bg-dance-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {recital.pictureWeek.schedulePdfLabel || "View Photo Schedule PDF"}
              </a>
              <p className="mt-3 text-sm text-slate-600">
                Use this official schedule PDF for class-by-class photo times.
              </p>
              <iframe
                title="Recital photo schedule PDF"
                src={recital.pictureWeek.schedulePdfUrl}
                className="mt-4 h-[640px] w-full rounded-lg border border-slate-200"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-dance-purple">Important Recital Policies</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {recital.policies.map((policy) => (
            <article key={policy.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-dance-pink">{policy.title}</p>
              <p className="mt-2 text-slate-700">{policy.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="sponsorship-form" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-900 p-7 text-slate-100">
          <h2 className="text-2xl font-bold">{recital.sponsorship.heading}</h2>
          <p className="mt-3 max-w-3xl text-slate-200">{recital.sponsorship.details}</p>
          <p className="mt-2 text-sm text-slate-300">{recital.sponsorship.formIntro}</p>
          <div className="mt-6 rounded-xl bg-white p-5 text-slate-900">
            <SponsorshipForm />
          </div>
        </div>
      </section>
    </main>
  );
}
