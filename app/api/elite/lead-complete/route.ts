import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_BASE    = process.env.GHL_BASE || "https://services.leadconnectorhq.com";
const GHL_API_KEY = requireEnv("GHL_API_KEY");
const GHL_VERSION = process.env.GHL_VERSION || "";
const LOCATION_ID = requireEnv("GHL_LOCATION_ID");

// Custom-field IDs
const CF = {
  U7_RECS_CSV:        "IRFoGYtxrdlerisKdi1o",
  EXPERIENCE_YEARS:   "SrUlABm2OX3HEgSDJgBG",
  STYLE_PREF_CSV:     "uoAhDKEmTR2k7PcxCcag",
  TEAM_INTEREST:      "pTnjhy6ilHaY1ykoPly4",
  WANTS_RECOMMEND:    "gxIoT6RSun7KL9KDu0Qs",
  SELECTED_CLASS_ID:  "seWdQbk6ZOerhIjAdI7d",
  SELECTED_CLASS_NM:  "Zd88pTAbiEKK08JdDQNj",
  NOTES:              "2JKj9HTS7Hhu0NUxuswN",
} as const;

async function ghl(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${GHL_API_KEY}`,
  };
  if (GHL_VERSION) headers["Version"] = GHL_VERSION;

  const res = await fetch(`${GHL_BASE}/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GHL ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

const cf = (id: string, value: any) =>
  value === undefined || value === null || value === "" ? null : ({ id, value: String(value) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    // Optionally resolve class name from your classes endpoint
    let selectedClassName = body.selectedClassName || "";
    if (!selectedClassName && body.selectedClassId) {
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const r = await fetch(`${base}/api/elite/classes`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const hit = (j.classes || []).find((c: any) => c.id === body.selectedClassId);
          if (hit) selectedClassName = hit.name;
        }
      } catch {}
    }

    const ageNum = Number(body.age || 0);
    const fields = [
      cf(CF.WANTS_RECOMMEND, body.wantsRecs ? "Yes" : "No"),
      cf(CF.NOTES, body.notes || ""),
      cf(CF.SELECTED_CLASS_ID, body.selectedClassId || ""),
      cf(CF.SELECTED_CLASS_NM, selectedClassName || ""),
      ...(ageNum && ageNum < 7
        ? [cf(CF.U7_RECS_CSV, (body.classOptionsU7 || []).join(", "))]
        : [
            cf(CF.EXPERIENCE_YEARS, body.experienceYears || ""),
            cf(CF.STYLE_PREF_CSV, (body.stylePreference || []).join(", ")),
            cf(CF.TEAM_INTEREST, body.wantsTeam ? "Yes" : "No"),
          ]),
    ].filter(Boolean) as Array<{ id: string; value: string }>;

    if (fields.length) {
      await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          id: body.contactId,
          locationId: LOCATION_ID,
          customFields: fields,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}