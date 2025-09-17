// /app/api/events/route.ts
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";               // or "edge"
export const dynamic = "force-dynamic";        // avoid static caching of this route

type GEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin") || undefined;
  const timeMax = searchParams.get("timeMax") || undefined;

  // Choose calendar via ?cal=...
  const calParam = (searchParams.get("cal") || "studio").toLowerCase();
  const CAL_IDS: Record<string, string | undefined> = {
    studio: process.env.GCAL_CALENDAR_ID,       // e.g. "studio@group.calendar.google.com"
    team:   process.env.GCAL_CALENDAR_ID_TEAM,  // e.g. "team@group.calendar.google.com"
  };

  // Fallback to studio if param is missing/unknown
  const calendarId = CAL_IDS[calParam] || CAL_IDS.studio;
  const apiKey = process.env.GCAL_API_KEY;

  if (!calendarId || !apiKey) {
    return NextResponse.json(
      { error: "Missing GCAL_CALENDAR_ID / GCAL_CALENDAR_ID_TEAM or GCAL_API_KEY." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Build Google Calendar API URL
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("singleEvents", "true");      // expand recurring
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeZone", "America/Chicago");
  if (timeMin) url.searchParams.set("timeMin", timeMin);
  if (timeMax) url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("key", apiKey);

  // Fetch from Google; don't cache at the server layer either
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text();
    return NextResponse.json(
      { error: "Google API error", detail: txt },
      { status: r.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = await r.json();
  const items: GEvent[] = data.items || [];

  // Normalize to front-end shape
  const events = items.map((ev) => {
    const start = ev.start?.dateTime || ev.start?.date || "";
    const end   = ev.end?.dateTime   || ev.end?.date   || "";
    return {
      id: ev.id,
      title: ev.summary || "",
      description: ev.description || "",
      location: ev.location || "",
      htmlLink: ev.htmlLink || "",
      start,
      end,
    };
  });

  return NextResponse.json(
    { cal: CAL_IDS[calParam] ? calParam : "studio", events },
    {
      headers: {
        // Prevent CDN from serving studio results to the team page
        "Cache-Control": "no-store",
      },
    }
  );
}