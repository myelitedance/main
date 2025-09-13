// app/workshops/fall-break-musical-theater-workshop/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Fall Break - Musical Theater Workshop | Elite Dance & Music",
  description: `Increase your stage presence and prepare for you next audtittion`,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 text-gray-700 space-y-4">{children}</div>
    </section>
  );
}

export default function WorkshopPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200">
        <div className="p-6 sm:p-8">
          <p className="text-sm uppercase tracking-wide text-dance-blue">Workshop</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold">
            <span className="bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
              Fall Break - Musical Theater Workshop
            </span>
          </h1>
          <p className="mt-2 text-gray-700">Increase your stage presence and prepare for you next audtittion</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <span><strong>Dates:</strong> 5–Oct 9 2025</span>
            <span>• <strong>Times:</strong> Mon-Fri, 9:00 AM-2:00 PM</span>
            <span>• <strong>Location:</strong> Elite Dance &amp; Music</span>
            <span>• <strong>Price:</strong> $300.00</span>
          </div>
          <div className="mt-6">
            <a href="https://lc.myelitedance.com/checkout-page" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-dance-purple to-dance-pink px-5 py-3 text-white font-semibold shadow hover:shadow-lg transition">
              Reserve My Spot
            </a>
          </div>
        </div>
      </div>
      <Section title="Overview">
        <p>Spend your week learning and increasing your musical theater abilities with this one time workshop from a seasoned Musical Theater Professional.  Join Demaree as your instructor.  </p>
      </Section>
      <Section title="Instructor">
        <div className="flex items-start gap-4">
          <div>
            <p className="font-semibold">Demaree Hill</p>
            <p className="text-gray-700">Demaree is a professional actress, singer, and coach with over 2 decades of experience on stage and screen.  She began her career on Broadway at age 8, starring as Young Cosette in Les Miserables, and later toured the country in Wicked, The Sectet Garden, &amp; Big: The musical.  She also recently recorded a reimagined duet of "You'll Never Walk Alone" with Dolly Parton.</p>
          </div>
        </div>
      </Section>
      <Section title="Location">
        <p><strong>Elite Dance &amp; Music</strong><br/>7177 Nolensville Rd, Nolensville, TN </p>
      </Section>
      <Section title="Policies">
        <p className="text-gray-700">Insert T&amp;C's here</p>
      </Section>
      <div className="mt-10">
        <Link href="/workshops" className="text-dance-purple hover:text-dance-pink font-medium">← Back to Workshops</Link>
      </div>
    </div>
  );
}