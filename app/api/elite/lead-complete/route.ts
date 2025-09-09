// /app/api/elite/lead-complete/route.ts
import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";

const GHL_API = "https://services.leadconnectorhq.com";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY     = requireEnv("GHL_API_KEY");
const LOCATION_ID = requireEnv("GHL_LOCATION_ID");

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${GHL_KEY}`,
      "Version": "2021-07-28",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    // Optional: resolve selected class name via your classes API
    let selectedClassName = body.selectedClassName || "";
    if (!selectedClassName && body.selectedClassId) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/elite/classes`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          const hit = (j.classes || []).find((c: any) => c.id === body.selectedClassId);
          if (hit) selectedClassName = hit.name;
        }
      } catch {}
    }

    // Simple tag updates (no custom fields to avoid 404s for now)
    const tags: string[] = ["DanceInterest", "Lead-Completed"];
    if (body.wantsTeam) tags.push("DanceTeamInterest");
    if (body.hasQuestions) tags.push("NeedHelp");

    await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        id: body.contactId,
        locationId: LOCATION_ID,
        tags,
        // You can later add a `customFields` block here after we confirm your CF IDs
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}