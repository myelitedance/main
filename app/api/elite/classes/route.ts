import { NextRequest, NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

const TZ = "America/Chicago";

const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

// --- Utility: produce a Date object in CST/CDT -----------------
function makeLocalDate(y: number, m: number, d: number): Date {
  // Midnight local time
  return new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`);
}

// --- Utility: get YYYY-MM-DD in CST/CDT ------------------------
function localISO(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// --- Utility: formatted date like "Dec 1" -----------------------
function localShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(date);
}

// --- Parse raw "6:15pm" safely --------------------------------
function parseAkadaTime(str: string) {
  const m = str.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return null;

  let [, hh, mm, ap] = m;
  let hour = parseInt(hh, 10);
  const min = parseInt(mm, 10);

  ap = ap.toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;

  return { hour, min };
}

// --- Build ISO with offset (America/Chicago) -------------------
function buildLocalISO(date: Date, timeStr: string): string {
  const t = parseAkadaTime(timeStr);
  if (!t) return date.toISOString();

  const isoDate = localISO(date);
  const [y, m, d] = isoDate.split("-").map(Number);

  // Create date in UTC, then format it in America/Chicago with correct offset
  const utc = new Date(Date.UTC(y, m - 1, d, t.hour, t.min));

  // Format to "2025-12-08T18:15:00-06:00"
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(utc)
    .reduce<Record<string, string>>((acc, p) => {
  acc[p.type] = p.value;
  return acc;
}, {});


  // Determine the offset for that date & time
  const offsetMinutes = -(
    new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`
    ).getTimezoneOffset()
  );
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const oh = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const om = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00${sign}${oh}:${om}`;
}

// --- Next weekday date in CST/CDT ------------------------------
const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nextDateForWeekday(label: string): Date {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const dow = today.getDay();
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const target = map[label as keyof typeof map];


  let delta = target - dow;
  if (delta <= 0) delta += 7;

  const out = makeLocalDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  out.setDate(out.getDate() + delta);
  return out;
}

// --- Is a date inside a closure window -------------------------
function isClosed(date: Date): boolean {
  const iso = localISO(date);
  return CLOSED_RANGES.some(([start, end]) => iso >= start && iso <= end);
}

function nextWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + 7);
  return x;
}

// ---------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const age = Number(searchParams.get("age") || NaN);

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();
    if (!res.ok) return NextResponse.json({ error: txt }, { status: res.status });

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // Normalize Akada records
    const norm = raw.map((c: any) => {
      const start = (c.startTimeDisplay || "").trim(); // "6:15pm"
      const stop = (c.stopTimeDisplay || "").trim();   // "7:00pm"

      return {
        id: String(c.id),
        description: (c.description || "").trim(),
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        days: ["monday","tuesday","wednesday","thursday","friday","saturday"]
          .filter((d) => c[d])
          .map((d) => d.charAt(0).toUpperCase() + d.slice(1,3)),
        start,
        stop,
        timeRange: `${start} - ${stop}`,
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    // Filters
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // Group by description
    const groups: Record<string, any> = {};

    for (const c of filtered) {
      if (!groups[c.description]) {
        groups[c.description] = {
          groupId: c.description,
          name: c.description,
          className: c.description,
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          lengthMinutes: c.lengthMinutes,
          options: [],
        };
      }

      for (const day of c.days) {
        let first = nextDateForWeekday(day);
        while (isClosed(first)) first = nextWeek(first);

        let second = nextWeek(first);
        while (isClosed(second)) second = nextWeek(second);

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(first),
          dateFormatted: localShort(first),
          label: `${day} • ${localShort(first)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildLocalISO(first, c.start),
          endISO: buildLocalISO(first, c.stop),
          lengthMinutes: c.lengthMinutes,
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(second),
          dateFormatted: localShort(second),
          label: `${day} • ${localShort(second)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildLocalISO(second, c.start),
          endISO: buildLocalISO(second, c.stop),
          lengthMinutes: c.lengthMinutes,
        });
      }
    }

    // Only NEXT 2 dates per group
    const results = Object.values(groups).map((g: any) => {
      g.options = [...g.options].sort(
        (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
      ).slice(0, 2);
      return g;
    });

    return NextResponse.json({ classes: results });

  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
