// /app/api/elite/lead-complete/route.ts
import { NextRequest, NextResponse } from "next/server";

const GHL_API = "https://rest.gohighlevel.com/v1";
const GHL_KEY = process.env.GHL_API_KEY!;
const LOCATION_ID = process.env.GHL_LOCATION_ID!;

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GHL_KEY}`,
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  // Resolve selected class name client-side if needed (optional)
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

  // Build tags
  const tags: string[] = ["DanceInterest"];
  if (body.wantsTeam) tags.push("DanceTeamInterest");
  if (body.hasQuestions) tags.push("NeedHelp");

  // Update Contact fields
  const fields = [
    { field: "EDM – Preferred Days (CSV)", value: (body.preferDays || []).join(", ") },
    { field: "EDM – Wants Recommendations", value: body.wantsRecs ? "Yes" : "No" },
    { field: "EDM – Notes", value: body.notes || "" },
    { field: "EDM – Selected Class ID", value: body.selectedClassId || "" },
    { field: "EDM – Selected Class Name", value: selectedClassName || "" }
  ];

  if (Number(body.age || 0) < 7) {
    fields.push({ field: "EDM – U7 Recommended Classes (CSV)", value: (body.classOptionsU7 || []).join(", ") });
  } else {
    if (body.experienceYears) fields.push({ field: "EDM – Experience (Years)", value: body.experienceYears });
    fields.push({ field: "EDM – Style Preference (CSV)", value: (body.stylePreference || []).join(", ") });
    fields.push({ field: "EDM – Interested in Dance Team", value: body.wantsTeam ? "Yes" : "No" });
  }

  await ghl(`/contacts/`, {
    method: "POST",
    body: JSON.stringify({
      id: body.contactId,
      locationId: LOCATION_ID,
      tags,
      customFields: fields
    })
  });

  return NextResponse.json({ ok: true });
}