// app/workshops/page.tsx
import Image from "next/image";
import Link from "next/link";

type WorkshopStatus = "open" | "coming_soon" | "sold_out";

type Workshop = {
  slug: string;
  title: string;
  dateStart: string; // ISO date
  dateEnd?: string;  // ISO date (optional; if single day, omit or match start)
  location: string;
  priceCents?: number; // if TBD, omit
  imageUrl: string;
  status: WorkshopStatus;
};

function formatDateRange(startISO: string, endISO?: string) {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : undefined;

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fmtYear = new Intl.DateTimeFormat("en-US", { year: "numeric" });

  if (!end || start.toDateString() === end.toDateString()) {
    return `${fmt.format(start)}, ${fmtYear.format(start)}`;
  }

  // Same month/year?
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${fmt.format(start).replace(/[A-Za-z]+ /, "")}–${fmt.format(end)} ${fmtYear.format(end)}`; // "6–10 Oct 2025"
  }
  if (sameYear) {
    return `${fmt.format(start)} – ${fmt.format(end)} ${fmtYear.format(end)}`; // "Sep 29 – Oct 3 2025"
  }
  return `${fmt.format(start)} ${fmtYear.format(start)} – ${fmt.format(end)} ${fmtYear.format(end)}`;
}

function formatPrice(cents?: number) {
  if (typeof cents !== "number") return "TBD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// TODO: Replace this with actual data source (CMS, file, or API).
// For now, these are placeholders to demonstrate the layout.
// Note: Clicking a tile expects /workshops/[slug] to exist (we'll build in Step 2).
const WORKSHOPS: Workshop[] = [
  // Example items (safe placeholders; no real details)
  {
    slug: "sample-workshop-1",
    title: "Sample Workshop 1",
    dateStart: "2025-10-06",
    dateEnd: "2025-10-10",
    location: "Elite Dance & Music — Main Studio",
    priceCents: 30000,
    imageUrl: "/images/workshops/sample-1.jpg", // add an image to your public folder
    status: "open",
  },
  {
    slug: "sample-workshop-2",
    title: "Sample Workshop 2",
    dateStart: "2025-11-17",
    dateEnd: "2025-11-21",
    location: "Elite Dance & Music — Studio B",
    priceCents: undefined, // TBD
    imageUrl: "/images/workshops/sample-2.jpg",
    status: "coming_soon",
  },
  {
    slug: "sample-workshop-3",
    title: "Sample Workshop 3",
    dateStart: "2025-12-27",
    dateEnd: "2025-12-27",
    location: "Elite Dance & Music — Main Studio",
    priceCents: 12500,
    imageUrl: "/images/workshops/sample-3.jpg",
    status: "sold_out",
  },
];

function StatusBadge({ status }: { status: WorkshopStatus }) {
  const map: Record<WorkshopStatus, { text: string; className: string }> = {
    open: { text: "Open", className: "bg-dance-blue/10 text-dance-blue ring-1 ring-dance-blue/20" },
    coming_soon: { text: "Coming Soon", className: "bg-dance-purple/10 text-dance-purple ring-1 ring-dance-purple/20" },
    sold_out: { text: "Sold Out", className: "bg-rose-100 text-rose-600 ring-1 ring-rose-200" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${m.className}`}>
      {m.text}
    </span>
  );
}

export default function WorkshopsIndexPage() {
  const hasWorkshops = WORKSHOPS.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
            Workshops
          </span>
        </h1>
        <p className="mt-2 text-gray-600">
          Explore our upcoming and current workshop offerings. Click a tile to see details and reserve your spot.
        </p>
      </header>

      {!hasWorkshops ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-600">No workshops are available yet—check back soon!</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WORKSHOPS.map((w) => (
            <li key={w.slug} className="group">
              <Link
                href={`/workshops/${w.slug}`}
                className="block rounded-2xl overflow-hidden border border-gray-200 hover:border-dance-purple/40 hover:shadow-lg transition"
              >
                <div className="relative w-full aspect-[16/9] bg-gray-100">
                  <Image
                    src={w.imageUrl}
                    alt={w.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    priority={false}
                  />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={w.status} />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{w.title}</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Dates: </span>
                      {formatDateRange(w.dateStart, w.dateEnd)}
                    </p>
                    <p className="line-clamp-1">
                      <span className="font-medium">Location: </span>
                      {w.location}
                    </p>
                    <p>
                      <span className="font-medium">Price: </span>
                      {formatPrice(w.priceCents)}
                    </p>
                  </div>

                  <div className="mt-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-dance-purple group-hover:text-dance-pink transition-colors">
                      View Details
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}