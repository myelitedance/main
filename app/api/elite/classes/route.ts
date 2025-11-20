import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const TZ = "America/Chicago";

const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// ---------------------------------------------------------------------------
// DATE HELPERS
// ---------------------------------------------------------------------------

function localISO(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(date);
}

function isClosed(date: Date): boolean {
  const iso = localISO(date);
  return CLOSED_RANGES.some(([s, e]) => iso >= s && iso <= e);
}

function addWeeks(date: Date, w: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + w * 7);
  return d;
}

function nextWeekday(label: string): Date {
  const target = WEEKDAY_INDEX[label];
  if (target === undefined) throw new Error("Invalid weekday: " + label);

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ })
  );
  const today = now.getDay();

  let delta = target - today;
  if (delta <= 0) delta += 7;

  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  return d;
}

// ---------------------------------------------------------------------------
// TIME HELPERS
// ---------------------------------------------------------------------------

function parseTime(str: string) {
  const m = str.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return null;

  let [, hh, mm, ap] = m;
  let h = Number(hh);
  const min = Number(mm);

  if (ap.toLowerCase() === "pm" && h < 12) h += 12;
  if (ap.toLowerCase() === "am" && h === 12) h = 0;

  return { hour: h, min };
}

function buildISO(date: Date, timeStr: string): string {
  const t = parseTime(timeStr);
  if (!t) return date.toISOString();

  const iso = localISO(date);
  const [y, m, d] = iso.split("-").map(Number);

  const dt = new Date(Date.UTC(y, m - 1, d, t.hour, t.min));

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(dt)
    .reduce((a: any, p: any) => ((a[p.type] = p.value), a), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00-06:00`;
}

function formatTimeLabel(range: string) {
  const [start, end] = range.split("-").map((s) => s.trim());
  const s = parseTime(start);
  const e = parseTime(end);
  if (!s || !e) return range;

  const fmt = (t: any) => {
    const hr = t.hour % 12 || 12;
    const mm = t.min.toString().padStart(2, "0");
    return `${hr}:${mm}`;
  };

  const suffix = e.hour >= 12 ? "PM" : "AM";
  return `${fmt(s)}–${fmt(e)} ${suffix}`;
}

// ---------------------------------------------------------------------------
// GET WEEKDAYS FROM AKADA
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// MAIN ROUTE
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const age = Number(new URL(req.url).searchParams.get("age") || NaN);

    const res = await akadaFetch(`/studio/classes`);
    const txt = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const raw: any[] = JSON.parse(txt)?.returnValue?.currentPageItems || [];

    // Normalize
    const norm = raw.map((c: any) => {
      const days = getDays(c);
      const rawRange = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      return {
        id: String(c.id),
        description: (c.description || "").trim(),
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        days,
        timeRange: formatTimeLabel(rawRange),
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    // Filter
    let filtered = norm
      .filter((c: any) => c.days.length > 0)
      .filter((c: any) => c.ageMin !== c.ageMax)
      .filter((c: any) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter(
        (c: any) => age >= c.ageMin && age <= c.ageMax
      );
    }

    // Group
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
        let first = nextWeekday(day);
        while (isClosed(first)) first = addWeeks(first, 1);

        let second = addWeeks(first, 1);
        while (isClosed(second)) second = addWeeks(second, 1);

        const [startStr, endStr] = formatTimeLabel(c.timeRange)
          .split("–")
          .map((s) => s.trim());

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(first),
          dateFormatted: shortDate(first),
          label: `${day} • ${shortDate(first)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(first, startStr),
          endISO: buildISO(first, endStr),
          lengthMinutes: c.lengthMinutes,
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(second),
          dateFormatted: shortDate(second),
          label: `${day} • ${shortDate(second)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(second, startStr),
          endISO: buildISO(second, endStr),
          lengthMinutes: c.lengthMinutes,
        });
      }
    }

    const results = Object.values(groups).map((g: any) => {
      g.options = g.options
        .sort(
          (a: any, b: any) =>
            new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
        )
        .slice(0, 2);

      return g;
    });

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
