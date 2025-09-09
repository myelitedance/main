import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const GHL_API = "https://rest.gohighlevel.com/v1";
const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
const GHL_KEY       = requireEnv("GHL_API_KEY");
const LOCATION_ID   = requireEnv("GHL_LOCATION_ID");
const PIPELINE_ID   = requireEnv("GHL_PIPELINE_ID");
const STAGE_NEW_LEAD= requireEnv("GHL_STAGE_NEW_LEAD");

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

/** ------- Custom Field ID cache (label -> id) ------- **/
let FIELD_MAP: Record<string, string> | null = null;

async function getFieldIdMap(): Promise<Record<string, string>> {
  if (FIELD_MAP) return FIELD_MAP;

  // v2-compatible list of custom fields for a location
  const data = await ghl(`/custom-fields/?locationId=${encodeURIComponent(LOCATION_ID)}`);
  // data example: { customFields: [{ id, name, dataType, ... }, ...] }
  const fields = (data.customFields || []) as Array<{ id: string; name: string }>;

  FIELD_MAP = {};
  for (const f of fields) {
    FIELD_MAP[f.name] = f.id; // map by label
  }
  return FIELD_MAP!;
}

/** Build "customFields" array using IDs instead of labels */
async function buildCustomFieldsById(body: any) {
  const map = await getFieldIdMap();

  const entries: Array<{ customFieldId: string; field_value: string }> = [];
  const add = (label: string, value: any) => {
    if (value === undefined || value === null) return;
    const id = map[label];
    if (!id) return; // silently skip if field not found
    entries.push({ customFieldId: id, field_value: String(value) });
  };

  add("EDM – Dancer First Name", body.dancerFirst || "");
  add("EDM – Dancer Last Name", body.dancerLast || "");
  add("EDM – Dancer Age", String(body.age || ""));

  add("EDM – UTM Source", body.utm?.source || "");
  add("EDM – UTM Medium", body.utm?.medium || "");
  add("EDM – UTM Campaign", body.utm?.campaign || "");
  add("EDM – Page Path", body.page || "");
  add("EDM – SMS Consent", "Yes");

  return entries;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic validation (match client)
    const required = ["parentFirst","parentLast","email","phone","smsConsent","dancerFirst","age"] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }

    // 1) Minimal upsert (core fields only) — avoids label/ID issues
    const upsert = await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: body.parentFirst,
        lastName: body.parentLast,
        email: body.email,
        phone: body.phone,
        tags: ["EliteLead", "DanceInterest"],
        source: body.utm?.source || "Website",
      }),
    });
    const contactId = upsert.contact?.id || upsert.id;

    // 2) Patch custom fields using IDs (safe on v2)
    const cf = await buildCustomFieldsById(body);
    if (cf.length) {
      await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          id: contactId,
          locationId: LOCATION_ID,
          customFields: cf,
        }),
      });
    }

    // 3) Create opportunity at New Lead
    await ghl(`/opportunities/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        pipelineId: PIPELINE_ID,
        stageId: STAGE_NEW_LEAD,
        name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
        contactId,
        status: "open",
        monetaryValue: 0,
        source: body.utm?.source || "Website",
      }),
    });

    return NextResponse.json({ ok: true, contactId });
  } catch (err: any) {
    console.error("quick-capture error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}