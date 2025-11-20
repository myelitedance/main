import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// ---- CONFIG ----
const TZ = "America/Chicago";

// These ranges are inclusive “closed” days
const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

function isClosed(date: Date) {
  const ds = date.toISOString().split("T")[0];
  return CLOSED_RANGES.some(([start, end]) => ds >= start && ds <= end);
}

function nextWeek(d: Date) {
  const n = new Date(d);
  n.setDate(d.getDate() + 7);
  return n;
}

const DAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getDays(c: any): string[] {
  const map: [keyof any, string][] = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
  ];
  return map.filter(([k]) => !!c[k]).map(([, lbl]) => lbl);
}

function nextDateForWeekday(dayLabel: string): Date {
  const now = new Date();
  const todayDow = now.getDay(); // Sunday=0
  const target = DAY_MAP[dayLabel];

  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ })
  );
  d.setHours(0, 0, 0, 0);

  // Convert Sunday=0 → 7 for easier math
  const todayFixed = todayDow === 0 ? 7 : todayDow;

  let delta = target - todayFixed;
  if (delta <= 0) delta += 7;

  d.setDate(d.getDate() + delta);
  return d;
}

function formatDateLabel(d: Date, day: string, timeRange: string) {
  return `${day} • ${d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  })} @ ${timeRange}`;
}

function parseISO(runDate: Date, timeStr: string): string {
  const m = timeStr.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return runDate.toISOString();

  let [, hh, mm, ap] = m;
  let hour = parseInt(hh);
  const min = parseInt(mm);

  if (ap.toLowerCase() === "pm" && hour < 12) hour += 12;
  if (ap.toLowerCase() === "am" && hour === 12) hour = 0;

  const d = new Date(runDate);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const age = Number(searchParams.get("age") || NaN);

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // ---- Normalize ----
    const norm = raw.map((c) => {
      const days = getDays(c);
      const timeRange = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;

      return {
        id: String(c.id),
        description: (c.description || "").trim(),
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        days,
        timeRange,
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    // ---- Filter ----
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // ---- Group by description ----
    const groups: Record<string, any> = {};
    for (const c of filtered) {
      if (!groups[c.description]) {
        groups[c.description] = {
          className: c.description,
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          lengthMinutes: c.lengthMinutes,
          options: [],
        };
      }

      // Build date candidates for ALL days
      for (const day of c.days) {
        let first = nextDateForWeekday(day);

        // Skip closures
        while (isClosed(first)) {
          first = nextWeek(first);
        }

        let second = nextWeek(first);
        while (isClosed(second)) {
          second = nextWeek(second);
        }

        // Extract 4:45pm from "4:45pm - 5:45pm"
        const [startStr, endStr] = c.timeRange.split("-").map((s) => s.trim());

        groups[c.description].options.push({
          id: c.id,
          day,
          date: first.toISOString().split("T")[0],
          label: formatDateLabel(first, day, c.timeRange),
          timeRange: c.timeRange,
          startISO: parseISO(first, startStr),
          endISO: parseISO(first, endStr),
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: second.toISOString().split("T")[0],
          label: formatDateLabel(second, day, c.timeRange),
          timeRange: c.timeRange,
          startISO: parseISO(second, startStr),
          endISO: parseISO(second, endStr),
        });
      }

      // Sort options soon
    }

    // ---- Flatten + Reduce to NEXT 2 DATES ONLY ----
    const results = Object.values(groups).map((g: any) => {
      // Combine all options, sort chronologically
      const sorted = [...g.options].sort(
        (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
      );

      // Keep only next 2
      g.options = sorted.slice(0, 2);
      return g;
    });

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
