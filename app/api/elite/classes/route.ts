import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// cache for 5 minutes
let classesCache: { key: string; data: any[]; exp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 5;

const DAY_MAP: [keyof any, string][] = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

function getDays(c: any) {
  return DAY_MAP.filter(([key]) => !!c[key]).map(([, label]) => label);
}

// Get next date for a given day (label form: "Mon", "Tue", ...)
function nextDateForDay(dayLabel: string): Date {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const target = days.indexOf(dayLabel);
  const now = new Date();

  const d = new Date(now);
  d.setHours(0,0,0,0);

  let delta = target - now.getDay();
  if (delta <= 0) delta += 7;

  d.setDate(now.getDate() + delta);
  return d;
}

// Format as "2024-12-02"
function dateString(d: Date) {
  return d.toISOString().split("T")[0];
}

// Convert runDate + "4:45pm" → ISO
function parseTimeWithDate(runDate: Date, timeStr: string): string {
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) return runDate.toISOString();

  let [, hh, mm, ap] = match;
  let h = parseInt(hh, 10);
  let m = parseInt(mm, 10);

  if (ap.toLowerCase() === "pm" && h < 12) h += 12;
  if (ap.toLowerCase() === "am" && h === 12) h = 0;

  const d = new Date(runDate);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ageParam = searchParams.get("age");
    const age = ageParam ? Number(ageParam) : NaN;

    const key = `grouped:${ageParam || ""}`;
    if (classesCache && classesCache.key === key && Date.now() < classesCache.exp) {
      return NextResponse.json({ classes: classesCache.data, cached: true });
    }

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // 1️⃣ Normalize
    const normalized = raw.map((c) => {
      const days = getDays(c); // e.g., ["Mon", "Sat"]
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

    // 2️⃣ Filter
    let filtered = normalized
      .filter((c) => c.days.length > 0) // must have a schedule
      .filter((c) => !c.days.includes("Sun")) // drop Sunday
      .filter((c) => c.ageMin !== c.ageMax) // remove private classes
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase())); // remove FLX/PRE/DT

    if (!Number.isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // 3️⃣ Group by Description
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

      // Build next 2 upcoming dates for this class
      for (const day of c.days) {
        const first = nextDateForDay(day);
        const second = new Date(first);
        second.setDate(first.getDate() + 7);

        const times = c.timeRange.split("-");
        const startStr = times[0];
        const endStr = times[1];

        const startISO1 = parseTimeWithDate(first, startStr);
        const endISO1 = parseTimeWithDate(first, endStr);

        const startISO2 = parseTimeWithDate(second, startStr);
        const endISO2 = parseTimeWithDate(second, endStr);

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

    // Convert groups → array
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
