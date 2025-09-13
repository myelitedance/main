// lib/workshops.ts

// Status values shown on the tiles
export type WorkshopStatus = 'open' | 'coming_soon' | 'sold_out';

// Minimal data needed to render the directory tiles
export interface WorkshopTile {
  slug: string;
  title: string;
  dateStart: string;      // ISO date (YYYY-MM-DD)
  dateEnd?: string;       // ISO date (optional for multi-day)
  location: string;
  priceCents?: number;    // omit for TBD
  imageUrl: string;       // path in /public or external URL
  status: WorkshopStatus;
}

/* ---------- Utilities (shared by pages) ---------- */
export function formatDateRange(startISO: string, endISO?: string) {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : undefined;

  const md = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const yr = new Intl.DateTimeFormat('en-US', { year: 'numeric' });

  if (!end || start.toDateString() === end.toDateString()) {
    return `${md.format(start)}, ${yr.format(start)}`;
  }
  const sameMonthYear =
    end && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonthYear) {
    // "6–10 Oct 2025"
    const left = md.format(start).replace(/[A-Za-z]+ /, '');
    return `${left}–${md.format(end)} ${yr.format(end)}`;
  }
  if (end && start.getFullYear() === end.getFullYear()) {
    // "Sep 29 – Oct 3 2025"
    return `${md.format(start)} – ${md.format(end)} ${yr.format(end)}`;
  }
  // "Dec 30 2025 – Jan 2 2026"
  return `${md.format(start)} ${yr.format(start)} – ${md.format(end!)} ${yr.format(end!)}`;
}

export function formatPrice(cents?: number) {
  if (typeof cents !== 'number') return 'TBD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/* ---------- Data (paste new tiles here) ---------- */
/**
 * Paste the JSON you download from /workshops/new ("Download Tile JSON") as an item in this array.
 * Example:
 *  {
 *    "slug": "musical-theater-fall-2025",
 *    "title": "Musical Theater Workshop",
 *    "dateStart": "2025-10-06",
 *    "dateEnd": "2025-10-10",
 *    "location": "Elite Dance & Music — Main Studio",
 *    "priceCents": 30000,
 *    "imageUrl": "/images/workshops/mt-fall-2025.jpg",
 *    "status": "open"
 *  }
 */
export const workshops: WorkshopTile[] = [
  // --- Sample placeholders (safe to remove) ---
  {
    slug: 'sample-workshop-1',
    title: 'Sample Workshop 1',
    dateStart: '2025-10-06',
    dateEnd: '2025-10-10',
    location: 'Elite Dance & Music — Main Studio',
    priceCents: 30000,
    imageUrl: '/images/workshops/sample-1.jpg',
    status: 'open',
  },
  {
    slug: 'sample-workshop-2',
    title: 'Sample Workshop 2',
    dateStart: '2025-11-17',
    dateEnd: '2025-11-21',
    location: 'Elite Dance & Music — Studio B',
    imageUrl: '/images/workshops/sample-2.jpg',
    status: 'coming_soon',
  },
];

/* Optional async shape if you later swap to a DB/API */
export async function getWorkshops(): Promise<WorkshopTile[]> {
  // Replace with fetch from your API when ready
  return workshops;
}