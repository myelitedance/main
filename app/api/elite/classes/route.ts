import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// ============================================================================
// CONFIG
// ============================================================================
const TZ = "America/Chicago";

// Closure windows (inclusive)
const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

// ============================================================================
// UTILITIES
// ============================================================================

// Test if a given local date falls inside a closed window
function isClosed(date: Date) {
  const iso = localISO(date);
  return CLOSED_RANGES.some(([start, end]) => iso >= start && iso <= end);
}

// Add 7 days
function nextWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 7);
  return d;
}

// Convert to YYYY-MM-DD in CST
function localISO(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // "2025-12-01"
}

// Convert to "Dec 1"
function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(date);
}

// 4:45pm → {h,m,am/pm}
function parseAkadaTime(str: string) {
  const m = str.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return null;
  let [, hh, mm, ap] = m;
  return {
    hour: Number(hh),
    min: Number(mm),
    ap: ap.toLowerCase(),
  };
}

// Convert a date + "4:45pm" → CST ISO with offset
function toLocalDateTimeISO(date: Date, timeStr: string) {
  const t = parseAkadaTime(timeStr);
  if (!t) return date.toISOString();

  let hour = t.hour;
  const min = t.min;

  if (t.ap === "pm" && hour < 12) hour += 12;
  if (t.ap === "am" && hour === 12) hour = 0;

  // Build local CST datetime using formatter parts
  const isoDate = localISO(date);
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hour, min));

  // Convert UTC → CST final ISO string with offset
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(dt)
    .reduce((acc: any, p: any) => ((acc[p.type] = p.value), acc), {});
}

// EXTRACT FULL ISO WITH OFFSET
function buildLocalISO(date: Date, timeStr: string) {
  const parts = toLocalDateTimeISO(date, timeStr);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00-06:00`;
}

// Convert “4:45pm - 5:45pm” → “4:45–5:45 PM”
function formatTimeRangeShort(range: string) {
  const [start, end] = range.split("-").map((s) => s.trim());
  const s = parseAkadaTime(start);
  const e = parseAkadaTime(end);

  if (!s || !e) return range;

  const pad = (n: number) => (n < 10 ? `0${n}` : n);

  const fmt = (obj: any) => {
    const hr = obj.hour === 12 ? 12 : obj.hour % 12 || 12;
    return `${hr}:${pad(obj.min)}`;
  };

  const ampm = e.ap === "pm" ? "PM" : "AM";

  return `${fmt(s)}–${fmt(e)} ${ampm}`;
}

// Map Akada booleans → weekday labels
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

// Find next date for weekday label ("Mon") in CST
function nextDateForWeekday(label: string) {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const target = map[label];

  if (target === undefined) {
    throw new Error(`Invalid weekday label: ${label}`);
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ })
  );

  const todayDow = now.getDay();
  let delta = target - todayDow;
  if (delta <= 0) delta += 7;

  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + delta);

  return d;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const age = Number(searchParams.get("age") || NaN);

    // Fetch from Akada API
    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // -----------------------
    // Normalize rows
    // -----------------------
    const norm = raw.map((c) => {
      const days = getDays(c);

      // Standardize time range
      const timeRangeRaw = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      const timeRange = formatTimeRangeShort(timeRangeRaw);

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

    // -----------------------
    // Filter
    // -----------------------
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax) // remove private
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // -----------------------
    // Group by description
    // -----------------------
    const groups: Record<string, any> = {};

    for (const c of filtered) {
      if (!groups[c.description]) {
        groups[c.description] = {
          groupId: c.description,
          name: c.description, // UI wants “name”
          className: c.description, // for ConfirmStep
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          lengthMinutes: c.lengthMinutes,
          options: [],
        };
      }

      // Build NEXT 2 DATES for EACH day
      for (const day of c.days) {
        let first = nextDateForWeekday(day);

        while (isClosed(first)) first = nextWeek(first);

        let second = nextWeek(first);
        while (isClosed(second)) second = nextWeek(second);

        const [startStr, endStr] = c.timeRange.split("–")[0].includes(":")
          ? c.timeRange.replace(" PM", "").replace(" AM", "").split("–").map((s) => s.trim())
          : c.timeRange.split("-").map((s) => s.trim());

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(first),
          dateFormatted: formatShortDate(first),
          label: `${day} • ${formatShortDate(first)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildLocalISO(first, startStr),
          endISO: buildLocalISO(first, endStr),
          lengthMinutes: c.lengthMinutes,
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(second),
          dateFormatted: formatShortDate(second),
          label: `${day} • ${formatShortDate(second)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildLocalISO(second, startStr),
          endISO: buildLocalISO(second, endStr),
          lengthMinutes: c.lengthMinutes,
        });
      }
    }

    // -----------------------
    // FINAL OUTPUT: only next 2 dates sorted
    // -----------------------
    const results = Object.values(groups).map((g: any) => {
      const sorted = [...g.options].sort(
        (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
      );

      g.options = sorted.slice(0, 2);
      return g;
    });

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
