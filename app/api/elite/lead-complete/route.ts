// /app/api/elite/lead-complete/route.ts
import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";

const GHL_API = "https://rest.gohighlevel.com/v1";
const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
const GHL_KEY = requireEnv("GHL_API_KEY");
const LOCATION_ID = requireEnv("GHL_LOCATION_ID");

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GHL_KEY}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GHL ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

/** -------- Custom Field ID cache (label -> id) -------- */
let FIELD_MAP: Record<string, string> | null = null;

async function getFieldIdMap(): Promise<Record<string, string>> {
  if (FIELD_MAP) return FIELD_MAP;
  const data = await ghl(`/custom-fields/?locationId=${encodeURIComponent(LOCATION_ID)}`);
  const fields = (data.customFields || []) as Array<{ id: string; name: string }>;
  FIELD_MAP = {};
  for (const f of fields) FIELD_MAP[f.name] = f.id;
  return FIELD_MAP!;
}

type CFEntry = { customFieldId: string; field_value: string };
function pushIf(map: Record<string, string>, arr: CFEntry[], label: string, value?: any) {
  if (value === undefined || value === null) return;
  const id = map[label];
  if (!id) return; // silently skip if field not found
  arr.push({ customFieldId: id, field_value: String(value) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    // Resolve selectedClassName if needed (no NEXT_PUBLIC_BASE_URL required)
    let selectedClassName: string = body.selectedClassName || "";
    if (!selectedClassName && body.selectedClassId) {
      try {
        const origin = new URL(req.url).origin;
        const res = await fetch(`${origin}/api/elite/classes`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          const hit = (j.classes || []).find((c: any) => c.id === body.selectedClassId);
          if (hit) selectedClassName = hit.name;
        }
      } catch {
        /* ignore */
      }
    }

    // Tags
    const tags: string[] = ["DanceInterest"];
    if (body.wantsTeam) tags.push("DanceTeamInterest");
    if (body.hasQuestions) tags.push("NeedHelp");

    // Build custom fields by ID (v2-safe)
    const map = await getFieldIdMap();
    const cf: CFEntry[] = [];
    pushIf(map, cf, "EDM – Preferred Days (CSV)", (body.preferDays || []).join(", "));
    pushIf(map, cf, "EDM – Wants Recommendations", body.wantsRecs ? "Yes" : "No");
    pushIf(map, cf, "EDM – Notes", body.notes || "");
    pushIf(map, cf, "EDM – Selected Class ID", body.selectedClassId || "");
    pushIf(map, cf, "EDM – Selected Class Name", selectedClassName || "");

    const ageNum = Number(body.age || 0);
    if (ageNum && ageNum < 7) {
      pushIf(map, cf, "EDM – U7 Recommended Classes (CSV)", (body.classOptionsU7 || []).join(", "));
    } else {
      if (body.experienceYears) pushIf(map, cf, "EDM – Experience (Years)", body.experienceYears);
      pushIf(map, cf, "EDM – Style Preference (CSV)", (body.stylePreference || []).join(", "));
      pushIf(map, cf, "EDM – Interested in Dance Team", body.wantsTeam ? "Yes" : "No");
    }

    // Update contact (tags + custom fields)
    await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        id: body.contactId,
        locationId: LOCATION_ID,
        tags,
        ...(cf.length ? { customFields: cf } : {}),
      }),
    });

    // (Optional) If hasQuestions, you can notify the front desk here via Email/SMS/Webhook

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}