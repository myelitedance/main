'use client';

import { useMemo, useState } from 'react';

/* ------------------------- TYPES ------------------------- */
type FAQ = { q: string; a: string };
type WorkshopInput = {
  slug: string;
  title: string;
  subtitle: string;
  dates: { start: string; end?: string };
  times: string;
  location: { name: string; address: string; mapUrl?: string };
  priceUSD?: number;
  capacity?: number;
  ageLevel: string;
  overview: string;
  objectives: string[];
  dailyOutline: string[];
  bring: string[];
  instructor: { name: string; bio: string; photoUrl?: string };
  images: { hero?: string; gallery?: string[] };
  checkoutUrl: string;
  contactEmail: string;
  faq: FAQ[];
  policies: string;
};

/* ---------------------- INITIAL STATE --------------------- */
const empty: WorkshopInput = {
  slug: '',
  title: '',
  subtitle: '',
  dates: { start: '', end: '' },
  times: '',
  location: { name: '', address: '', mapUrl: '' },
  priceUSD: undefined,
  capacity: undefined,
  ageLevel: '',
  overview: '',
  objectives: [''],
  dailyOutline: [''],
  bring: [''],
  instructor: { name: '', bio: '', photoUrl: '' },
  images: { hero: '', gallery: [''] },
  checkoutUrl: '',
  contactEmail: 'frontdesk@myelitedance.com',
  faq: [{ q: '', a: '' }],
  policies: '',
};

/* ------------------------ HELPERS ------------------------- */
function toCurrency(n?: number) {
  if (typeof n !== 'number') return 'TBD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}
function niceDateRange(startISO: string, endISO?: string) {
  if (!startISO) return '';
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : undefined;
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const y = new Intl.DateTimeFormat('en-US', { year: 'numeric' });
  if (!end || start.toDateString() === end.toDateString()) return `${fmt.format(start)}, ${y.format(start)}`;
  const sameMonthYear = end && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonthYear) return `${fmt.format(start).replace(/[A-Za-z]+ /, '')}–${fmt.format(end)} ${y.format(end!)}`;
  if (end && start.getFullYear() === end.getFullYear()) return `${fmt.format(start)} – ${fmt.format(end)} ${y.format(end)}`;
  return `${fmt.format(start)} ${y.format(start)} – ${end ? `${fmt.format(end)} ${y.format(end)}` : ''}`;
}
function sanitizeSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Escape content for embedding inside a TS/JS template safely */
function esc(str: string) {
  return String(str).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}
/* Escape for embedding inside HTML text nodes inside the generated page */
function escHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ---------------- PAGE GENERATOR (SAFE) ------------------- */
function buildWorkshopTSX(w: WorkshopInput) {
  const priceText = typeof w.priceUSD === 'number' ? toCurrency(w.priceUSD) : 'TBD';
  const dateText = niceDateRange(w.dates.start, w.dates.end);
  const showOverview = !!w.overview.trim();
  const hasObjectives = w.objectives.filter(Boolean).length > 0;
  const hasOutline = w.dailyOutline.filter(Boolean).length > 0;
  const hasBring = w.bring.filter(Boolean).length > 0;
  const hasInstructor = !!(w.instructor.name || w.instructor.bio);
  const hasFaq = w.faq.filter(f => f.q && f.a).length > 0;

  const lines: string[] = [];

  lines.push(`// app/workshops/${w.slug}/page.tsx`);
  lines.push(`import Image from "next/image";`);
  lines.push(`import Link from "next/link";`);
  lines.push(``);
  lines.push(`export const metadata = {`);
  lines.push(`  title: "${esc(w.title)} | Elite Dance & Music",`);
  lines.push(`  description: \`${esc(w.subtitle || w.overview || '')}\`,`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`function Section({ title, children }: { title: string; children: React.ReactNode }) {`);
  lines.push(`  return (`);
  lines.push(`    <section className="mt-10">`);
  lines.push(`      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>`);
  lines.push(`      <div className="mt-3 text-gray-700 space-y-4">{children}</div>`);
  lines.push(`    </section>`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export default function WorkshopPage() {`);
  lines.push(`  return (`);
  lines.push(`    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">`);
  lines.push(`      {/* Hero */}`);
  lines.push(`      <div className="relative overflow-hidden rounded-2xl border border-gray-200">`);
  if (w.images.hero) {
    lines.push(`        <div className="relative h-64 sm:h-80 md:h-96">`);
    lines.push(`          <Image src="${esc(w.images.hero)}" alt="${esc(w.title)}" fill className="object-cover" />`);
    lines.push(`        </div>`);
  }
  lines.push(`        <div className="p-6 sm:p-8">`);
  lines.push(`          <p className="text-sm uppercase tracking-wide text-dance-blue">Workshop</p>`);
  lines.push(`          <h1 className="mt-1 text-3xl sm:text-4xl font-bold">`);
  lines.push(`            <span className="bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">`);
  lines.push(`              ${escHtml(w.title)}`);
  lines.push(`            </span>`);
  lines.push(`          </h1>`);
  if (w.subtitle) lines.push(`          <p className="mt-2 text-gray-700">${escHtml(w.subtitle)}</p>`);
  lines.push(`          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-700">`);
  lines.push(`            <span><strong>Dates:</strong> ${escHtml(dateText)}</span>`);
  if (w.times) lines.push(`            <span>• <strong>Times:</strong> ${escHtml(w.times)}</span>`);
  lines.push(`            <span>• <strong>Location:</strong> ${escHtml(w.location.name)}</span>`);
  lines.push(`            <span>• <strong>Price:</strong> ${escHtml(priceText)}</span>`);
  lines.push(`          </div>`);
  if (w.checkoutUrl) {
    lines.push(`          <div className="mt-6">`);
    lines.push(`            <a href="${esc(w.checkoutUrl)}" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-dance-purple to-dance-pink px-5 py-3 text-white font-semibold shadow hover:shadow-lg transition">`);
    lines.push(`              Reserve My Spot`);
    lines.push(`            </a>`);
    lines.push(`          </div>`);
  }
  lines.push(`        </div>`);
  lines.push(`      </div>`);
  /* Overview */
  if (showOverview) {
    lines.push(`      <Section title="Overview">`);
    lines.push(`        <p>${escHtml(w.overview)}</p>`);
    lines.push(`      </Section>`);
  }
  /* Objectives */
  if (hasObjectives) {
    lines.push(`      <Section title="You’ll Learn">`);
    lines.push(`        <ul className="list-disc pl-6 space-y-1">`);
    w.objectives.filter(Boolean).forEach(o => lines.push(`          <li>${escHtml(o)}</li>`));
    lines.push(`        </ul>`);
    lines.push(`      </Section>`);
  }
  /* Outline */
  if (hasOutline) {
    lines.push(`      <Section title="Daily Outline">`);
    lines.push(`        <ul className="list-disc pl-6 space-y-1">`);
    w.dailyOutline.filter(Boolean).forEach(d => lines.push(`          <li>${escHtml(d)}</li>`));
    lines.push(`        </ul>`);
    lines.push(`      </Section>`);
  }
  /* Bring */
  if (hasBring) {
    lines.push(`      <Section title="What to Bring">`);
    lines.push(`        <ul className="list-disc pl-6 space-y-1">`);
    w.bring.filter(Boolean).forEach(b => lines.push(`          <li>${escHtml(b)}</li>`));
    lines.push(`        </ul>`);
    lines.push(`      </Section>`);
  }
  /* Instructor */
  if (hasInstructor) {
    lines.push(`      <Section title="Instructor">`);
    lines.push(`        <div className="flex items-start gap-4">`);
    if (w.instructor.photoUrl) {
      lines.push(`          <div className="relative h-20 w-20 overflow-hidden rounded-xl border">`);
      lines.push(`            <Image src="${esc(w.instructor.photoUrl)}" alt="${esc(w.instructor.name)}" fill className="object-cover" />`);
      lines.push(`          </div>`);
    }
    lines.push(`          <div>`);
    lines.push(`            <p className="font-semibold">${escHtml(w.instructor.name)}</p>`);
    lines.push(`            <p className="text-gray-700">${escHtml(w.instructor.bio)}</p>`);
    lines.push(`          </div>`);
    lines.push(`        </div>`);
    lines.push(`      </Section>`);
  }
  /* Location */
  lines.push(`      <Section title="Location">`);
  lines.push(`        <p><strong>${escHtml(w.location.name)}</strong><br/>${escHtml(w.location.address)}</p>`);
  if (w.location.mapUrl) lines.push(`        <p className="mt-2"><a className="text-dance-purple underline" href="${esc(w.location.mapUrl)}">Open in Google Maps</a></p>`);
  lines.push(`      </Section>`);
  /* FAQ */
  if (hasFaq) {
    lines.push(`      <Section title="FAQ">`);
    lines.push(`        <div className="divide-y">`);
    w.faq.filter(f => f.q && f.a).forEach(f => {
      lines.push(`          <details className="py-3">`);
      lines.push(`            <summary className="cursor-pointer font-medium text-gray-900">${escHtml(f.q)}</summary>`);
      lines.push(`            <div className="mt-2 text-gray-700">${escHtml(f.a)}</div>`);
      lines.push(`          </details>`);
    });
    lines.push(`        </div>`);
    lines.push(`      </Section>`);
  }
  /* Policies */
  if (w.policies.trim()) {
    lines.push(`      <Section title="Policies">`);
    lines.push(`        <p className="text-gray-700">${escHtml(w.policies)}</p>`);
    lines.push(`      </Section>`);
  }
  /* Back link */
  lines.push(`      <div className="mt-10">`);
  lines.push(`        <Link href="/workshops" className="text-dance-purple hover:text-dance-pink font-medium">← Back to Workshops</Link>`);
  lines.push(`      </div>`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);

  return lines.join('\n');
}

function buildTileJSON(w: WorkshopInput) {
  const tile = {
    slug: w.slug,
    title: w.title,
    dateStart: w.dates.start,
    dateEnd: w.dates.end || undefined,
    location: `${w.location.name}`,
    priceCents: typeof w.priceUSD === 'number' ? Math.round(w.priceUSD * 100) : undefined,
    imageUrl: w.images.hero || '/images/workshops/placeholder.jpg',
    status: 'open' as const,
  };
  return JSON.stringify(tile, null, 2);
}

/* ----------------------- COMPONENT ------------------------ */
export default function NewWorkshopPage() {
  const [data, setData] = useState<WorkshopInput>(empty);
  const [generated, setGenerated] = useState<{ tsx?: string; tileJson?: string }>({});
  const suggestedSlug = useMemo(() => (data.title ? sanitizeSlug(data.title) : ''), [data.title]);

  function onArrayChange<K extends keyof WorkshopInput>(key: K, idx: number, value: string) {
    const arr = [...(data[key] as unknown as string[])];
    arr[idx] = value;
    setData({ ...data, [key]: arr } as WorkshopInput);
  }
  function addRow(key: keyof WorkshopInput) {
    const arr = [...(data[key] as unknown as string[])];
    arr.push('');
    setData({ ...data, [key]: arr } as WorkshopInput);
  }
  function removeRow(key: keyof WorkshopInput, idx: number) {
    const arr = [...(data[key] as unknown as string[])];
    arr.splice(idx, 1);
    setData({ ...data, [key]: arr } as WorkshopInput);
  }
  function addFaq() { setData({ ...data, faq: [...data.faq, { q: '', a: '' }] }); }
  function removeFaq(i: number) { const faq = [...data.faq]; faq.splice(i, 1); setData({ ...data, faq }); }

  function generateFiles() {
    const slug = sanitizeSlug(data.slug || suggestedSlug || 'workshop');
    const ready: WorkshopInput = { ...data, slug };
    const tsx = buildWorkshopTSX(ready);
    const tileJson = buildTileJSON(ready);
    setGenerated({ tsx, tileJson });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold">
        <span className="bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
          New Workshop
        </span>
      </h1>
      <p className="mt-2 text-gray-600">Fill this out to generate a ready-to-add workshop page and tile data.</p>

      {/* BASIC INFO */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Title</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.title} onChange={e => setData({ ...data, title: e.target.value })} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Subtitle / Hook</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.subtitle} onChange={e => setData({ ...data, subtitle: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Start Date (YYYY-MM-DD)</span>
              <input placeholder="2025-10-06" className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.dates.start} onChange={e => setData({ ...data, dates: { ...data.dates, start: e.target.value } })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">End Date (optional)</span>
              <input placeholder="2025-10-10" className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.dates.end} onChange={e => setData({ ...data, dates: { ...data.dates, end: e.target.value } })} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Times (e.g., Mon–Fri, 10:00 AM–2:00 PM)</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.times} onChange={e => setData({ ...data, times: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Price (USD)</span>
              <input type="number" min={0} step="1" className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.priceUSD ?? ''} onChange={e => setData({ ...data, priceUSD: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Capacity (seats)</span>
              <input type="number" min={1} step="1" className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.capacity ?? ''} onChange={e => setData({ ...data, capacity: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Age / Level</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.ageLevel} onChange={e => setData({ ...data, ageLevel: e.target.value })} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Overview</span>
            <textarea rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.overview} onChange={e => setData({ ...data, overview: e.target.value })} />
          </label>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Location Name</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.location.name} onChange={e => setData({ ...data, location: { ...data.location, name: e.target.value } })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Maps URL (optional)</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.location.mapUrl ?? ''} onChange={e => setData({ ...data, location: { ...data.location, mapUrl: e.target.value } })} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Full Address</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.location.address} onChange={e => setData({ ...data, location: { ...data.location, address: e.target.value } })} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Instructor Name</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.instructor.name} onChange={e => setData({ ...data, instructor: { ...data.instructor, name: e.target.value } })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Instructor Photo URL</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.instructor.photoUrl ?? ''} onChange={e => setData({ ...data, instructor: { ...data.instructor, photoUrl: e.target.value } })} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Instructor Bio</span>
            <textarea rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.instructor.bio} onChange={e => setData({ ...data, instructor: { ...data.instructor, bio: e.target.value } })} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Hero Image URL</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.images.hero ?? ''} onChange={e => setData({ ...data, images: { ...data.images, hero: e.target.value } })} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Checkout URL (GHL)</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
              value={data.checkoutUrl} onChange={e => setData({ ...data, checkoutUrl: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Contact Email</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.contactEmail} onChange={e => setData({ ...data, contactEmail: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Slug (auto if blank)</span>
              <input placeholder={suggestedSlug} className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={data.slug} onChange={e => setData({ ...data, slug: e.target.value })} />
            </label>
          </div>
        </div>
      </div>

      {/* LISTS */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objectives */}
        <div>
          <h2 className="text-lg font-semibold">You'll Learn / Objectives</h2>
          <div className="mt-2 space-y-2">
            {data.objectives.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                  value={v} onChange={e => onArrayChange('objectives', i, e.target.value)} />
                <button type="button" onClick={() => removeRow('objectives', i)} className="px-2 rounded border text-gray-600">–</button>
              </div>
            ))}
            <button type="button" onClick={() => addRow('objectives')} className="mt-1 text-sm text-dance-purple hover:text-dance-pink">+ Add objective</button>
          </div>
        </div>

        {/* Daily outline */}
        <div>
          <h2 className="text-lg font-semibold">Daily Outline</h2>
          <div className="mt-2 space-y-2">
            {data.dailyOutline.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                  value={v} onChange={e => onArrayChange('dailyOutline', i, e.target.value)} />
                <button type="button" onClick={() => removeRow('dailyOutline', i)} className="px-2 rounded border text-gray-600">–</button>
              </div>
            ))}
            <button type="button" onClick={() => addRow('dailyOutline')} className="mt-1 text-sm text-dance-purple hover:text-dance-pink">+ Add day</button>
          </div>
        </div>

        {/* Bring */}
        <div>
          <h2 className="text-lg font-semibold">What to Bring</h2>
          <div className="mt-2 space-y-2">
            {data.bring.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                  value={v} onChange={e => onArrayChange('bring', i, e.target.value)} />
                <button type="button" onClick={() => removeRow('bring', i)} className="px-2 rounded border text-gray-600">–</button>
              </div>
            ))}
            <button type="button" onClick={() => addRow('bring')} className="mt-1 text-sm text-dance-purple hover:text-dance-pink">+ Add item</button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <div className="mt-2 space-y-3">
          {data.faq.map((f, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Question" className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={f.q} onChange={e => { const faq = [...data.faq]; faq[i] = { ...faq[i], q: e.target.value }; setData({ ...data, faq }); }} />
              <input placeholder="Answer" className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
                value={f.a} onChange={e => { const faq = [...data.faq]; faq[i] = { ...faq[i], a: e.target.value }; setData({ ...data, faq }); }} />
              <div className="md:col-span-2">
                <button type="button" onClick={() => removeFaq(i)} className="text-sm text-gray-600">Remove</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addFaq} className="mt-1 text-sm text-dance-purple hover:text-dance-pink">+ Add FAQ</button>
        </div>
      </div>

      {/* Policies */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Policies</h2>
        <textarea rows={3} className="mt-2 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-dance-purple"
          value={data.policies} onChange={e => setData({ ...data, policies: e.target.value })} />
      </div>

      {/* Generate */}
      <div className="mt-10 flex items-center gap-4">
        <button onClick={generateFiles} className="rounded-xl bg-gradient-to-r from-dance-purple to-dance-pink px-5 py-3 text-white font-semibold shadow hover:shadow-lg transition">
          Generate Files
        </button>
        {generated.tsx ? (
          <>
            <button
              onClick={() => download(`page-${(data.slug || suggestedSlug) || 'workshop'}.tsx`, generated.tsx!)}
              className="rounded-xl border px-4 py-2 font-medium"
            >
              Download Workshop Page (.tsx)
            </button>
            <button
              onClick={() => download(`tile-${(data.slug || suggestedSlug) || 'workshop'}.json`, generated.tileJson!)}
              className="rounded-xl border px-4 py-2 font-medium"
            >
              Download Tile JSON (.json)
            </button>
          </>
        ) : null}
      </div>

      {/* Preview */}
      {generated.tsx ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-semibold text-gray-800">Tile JSON (add to your workshops data source)</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg border bg-gray-50 p-3 text-xs">{generated.tileJson}</pre>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800">Generated Page (app/workshops/[slug]/page.tsx)</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg border bg-gray-50 p-3 text-xs">{generated.tsx}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}