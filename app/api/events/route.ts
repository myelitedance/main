// /app/api/events/route.ts
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs"; // or "edge" — either is fine here

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
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  const calendarId = process.env.GCAL_CALENDAR_ID;   // like "abcd1234@group.calendar.google.com"
  const apiKey     = process.env.GCAL_API_KEY;

  if (!calendarId || !apiKey) {
    return NextResponse.json(
      { error: "Missing GCAL_CALENDAR_ID or GCAL_API_KEY env vars." },
      { status: 500 }
    );
  }

  // Build Google Calendar API URL
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("singleEvents", "true");    // expand recurring
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeZone", "America/Chicago");
  if (timeMin) url.searchParams.set("timeMin", timeMin);
  if (timeMax) url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("key", apiKey);

  const r = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!r.ok) {
    const txt = await r.text();
    return NextResponse.json({ error: `Google API error: ${txt}` }, { status: r.status });
  }
  const json = await r.json();

  const items: GEvent[] = json.items || [];
  // Normalize to your HTML’s expected shape
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

  return NextResponse.json({ events });
}