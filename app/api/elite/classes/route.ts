import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// Cache 5 minutes
let classesCache: { key: string; data: any[]; exp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 5;

// ---------------------------------------------
// CONFIG
// ---------------------------------------------
const TIMEZONE = "America/Chicago";

const DAY_MAP: [keyof any, string][] = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

// Closure windows (inclusive)
const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2025-03-02", "2026-03-08"], // Your provided window
].map(([s, e]) => ({
  start: new Date(`${s}T00:00:00`),
  end: new Date(`${e}T23:59:59`),
}));

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

function getDays(c: any) {
  return DAY_MAP.filter(([key]) => !!c[key]).map(([, label]) => label);
}

function isClosed(d: Date): boolean {
  return CLOSED_RANGES.some(
    (rng) => d >= rng.start && d <= rng.end
  );
}

// Get next occurrence of "Mon", "Tue", etc.
function nextDateForDay(dayLabel: string): Date {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const target = days.indexOf(dayLabel);
  const now = new Date();

  for (let i = 0; i < 60; i++) {
    let d = new Date(now);
    d.setHours(0,0,0,0);

    const delta = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + delta + i * 7);

    if (!isClosed(d)) return d;
  }

  return new Date(); // fallback should never happen
}

// Format YYYY-MM-DD
function dateString(d: Date) {
  return d.toISOString().split("T")[0];
}

// Convert "4:45pm" + runDate into ISO with correct CST/CDT offset
function toLocalISO(runDate: Date, timeStr: string): string {
  const m = timeStr.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return runDate.toISOString();

  let [, hh, mm, ap] = m;
  let h = parseInt(hh, 10);
  let minutes = parseInt(mm, 10);

  if (ap.toLowerCase() === "pm" && h < 12) h += 12;
  if (ap.toLowerCase() === "am" && h === 12) h = 0;

  // Build local datetime string
  const local = new Date(
    `${dateString(runDate)}T${String(h).padStart(2,"0")}:${String(
      minutes
    ).padStart(2,"0")}:00`
  );

  // Convert to ISO *with correct offset*
  return local.toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace(" ", "T");
}

// ---------------------------------------------
// ROUTE HANDLER
// ---------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ageParam = searchParams.get("age");
    const age = ageParam ? Number(ageParam) : NaN;

    const key = `grouped:${ageParam || ""}`;
    if (classesCache && classesCache.key === key && Date.now() < classesCache.exp) {
      return NextResponse.json({ classes: classesCache.data, cached: true });
    }

    // Fetch Akada Classes
    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();
    if (!res.ok) return NextResponse.json({ error: txt }, { status: res.status });

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // ---------------------------------------------
    // Normalize
    // ---------------------------------------------
    const normalized = raw.map((c) => {
      const days = getDays(c);
      const timeRange = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;

      return {
        id: String(c.id),
        description: String(c.description || "").trim(),
        days,
        timeRange,
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    // ---------------------------------------------
    // Filtering
    // ---------------------------------------------
    let filtered = normalized
      .filter((c) => c.days.length > 0)
      .filter((c) => !c.days.includes("Sun"))
      .filter((c) => c.ageMin !== c.ageMax) // private lessons
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!Number.isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // ---------------------------------------------
    // Group by class description
    // ---------------------------------------------
    const groups: Record<string, any> = {};

    for (const c of filtered) {
      if (!groups[c.description]) {
        groups[c.description] = {
          groupId: c.description,
          name: c.description,
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          options: [],
        };
      }

      // For each day → create 2 upcoming dates
      for (const day of c.days) {
        // First good date (not closed)
        const first = nextDateForDay(day);

        // Second good date
        let second = new Date(first);
        second.setDate(first.getDate() + 7);
        while (isClosed(second)) {
          second.setDate(second.getDate() + 7);
        }

        const [startStr, endStr] = c.timeRange.split("-").map((s) => s.trim());

        const startISO1 = toLocalISO(first, startStr);
        const endISO1 = toLocalISO(first, endStr);

        const startISO2 = toLocalISO(second, startStr);
        const endISO2 = toLocalISO(second, endStr);

        groups[c.description].options.push({
          id: c.id,
          day,
          date: dateString(first),
          label: `${day} • ${first.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
          })} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          lengthMinutes: c.lengthMinutes,
          startISO: startISO1,
          endISO: endISO1,
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: dateString(second),
          label: `${day} • ${second.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
          })} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          lengthMinutes: c.lengthMinutes,
          startISO: startISO2,
          endISO: endISO2,
        });
      }
    }

    const results = Object.values(groups);

    classesCache = {
      key,
      data: results,
      exp: Date.now() + CACHE_TTL,
    };

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("Grouped classes error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
