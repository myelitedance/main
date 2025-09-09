// /app/api/elite/quick-capture/route.ts
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const GHL_API = "https://rest.gohighlevel.com/v2";

// ---- Env helpers ----
const must = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
const GHL_KEY        = must("GHL_API_KEY");
const LOCATION_ID    = must("GHL_LOCATION_ID");     // e.g. 3i9Ku39oDuJfmFIrPlxa
const PIPELINE_ID    = must("GHL_PIPELINE_ID");     // e.g. BKJR7YvccnciXEqOEHJV
const STAGE_NEW_LEAD = must("GHL_STAGE_NEW_LEAD");  // e.g. 0eef5e7d-001b-4b31-8a3c-ce48521c45e7

// ---- HTTP helper ----
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
  const text = await res.text();
  // Try to parse JSON if possible
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* noop */ }
  if (!res.ok) {
    // Bubble up full error body for diagnosis
    throw new Error(`GHL ${path} ${res.status}: ${text}`);
  }
  return json ?? text;
}

// ---- Custom Field ID cache (label -> id) ----
let FIELD_MAP: Record<string, string> | null = null;

async function getFieldIdMap(): Promise<Record<string, string>> {
  if (FIELD_MAP) return FIELD_MAP;
  const data = await ghl(`/custom-fields/?locationId=${encodeURIComponent(LOCATION_ID)}`);
  const fields = (data?.customFields || []) as Array<{ id: string; name: string }>;
  const map: Record<string, string> = {};
  for (const f of fields) map[f.name] = f.id;
  FIELD_MAP = map;
  return FIELD_MAP!;
}

function normalizePhone(input: string): string {
  // Keep digits and a leading '+'
  const raw = String(input || "");
  const cleaned = raw.replace(/[^\d+]/g, "");
  // If it doesn't start with + and has 10 digits, assume US
  if (!cleaned.startsWith("+") && cleaned.replace(/\D/g, "").length === 10) {
    return `+1${cleaned.replace(/\D/g, "")}`;
  }
  return cleaned;
}

// Build contact customFields array using IDs (v2 format expects {customFieldId, field_value})
async function buildContactCF(body: any) {
  const map = await getFieldIdMap();
  const out: Array<{ customFieldId: string; field_value: string }> = [];

  const add = (label: string, value?: any) => {
    if (value === undefined || value === null) return;
    const id = map[label];
    if (!id) return;
    out.push({ customFieldId: id, field_value: String(value) });
  };

  add("EDM – Dancer First Name", body.dancerFirst || "");
  add("EDM – Dancer Last Name", body.dancerLast || "");
  add("EDM – Dancer Age", String(body.age || ""));

  add("EDM – UTM Source", body.utm?.source || "");
  add("EDM – UTM Medium", body.utm?.medium || "");
  add("EDM – UTM Campaign", body.utm?.campaign || "");
  add("EDM – Page Path", body.page || "");
  add("EDM – SMS Consent", body.smsConsent ? "Yes" : "No");

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ---- Validate incoming payload (aligns with your form) ----
    const required = ["parentFirst", "parentLast", "email", "phone", "smsConsent", "dancerFirst", "age"] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }

    const phone = normalizePhone(body.phone);

    // ---- 1) Upsert contact (minimal fields first) ----
    const upsertPayload = {
      locationId: LOCATION_ID,
      firstName: body.parentFirst,
      lastName: body.parentLast,
      email: body.email,
      phone,
      tags: ["EliteLead", "DanceInterest"],
      source: body.utm?.source || "Website",
    };

    // Helpful for debugging (remove if too chatty):
    // console.log("UPSERT PAYLOAD:", JSON.stringify(upsertPayload, null, 2));

    const upsert = await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify(upsertPayload),
    });

    const contactId = upsert?.contact?.id || upsert?.id;
    if (!contactId) {
      throw new Error(`Contact upsert did not return an id. Raw: ${JSON.stringify(upsert)}`);
    }

    // ---- 2) Write custom fields by ID (v2-safe) ----
    const cf = await buildContactCF(body);
    if (cf.length) {
      const cfPayload = {
        id: contactId,
        locationId: LOCATION_ID,
        customFields: cf,
      };
      // console.log("CONTACT CF PAYLOAD:", JSON.stringify(cfPayload, null, 2));
      await ghl(`/contacts/`, { method: "POST", body: JSON.stringify(cfPayload) });
    }

    // ---- 3) Verify the contact exists (helps catch cross-location issues) ----
    try {
      const verify = await ghl(`/contacts/${encodeURIComponent(contactId)}`);
      // console.log("VERIFY CONTACT:", { id: verify?.id, locationId: verify?.locationId });
      if (verify?.locationId && verify.locationId !== LOCATION_ID) {
        throw new Error(`Contact belongs to a different location (${verify.locationId}) than expected (${LOCATION_ID})`);
      }
    } catch (e: any) {
      // If verify fails, surface that reason
      throw new Error(`Unable to verify contact after upsert: ${String(e?.message || e)}`);
    }

    // ---- 4) Create Opportunity in "New Lead / Inquiry" (v2 requires pipelineStageId) ----
    const oppPayload = {
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_NEW_LEAD, // ✅ v2 key
      name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
      contactId,
      status: "open",                  // some tenants allow/ignore; fine to keep
      monetaryValue: 0,
      source: body.utm?.source || "Website",
    };

    // Log payload if we fail (we’ll rethrow below with full GHL body)
    // console.log("OPP PAYLOAD:", JSON.stringify(oppPayload, null, 2));

    try {
      await ghl(`/opportunities/`, { method: "POST", body: JSON.stringify(oppPayload) });
    } catch (e: any) {
      // Give maximum context to debug 404/400 quickly
      throw new Error(`Opportunity create failed.\nPayload=${JSON.stringify(oppPayload)}\nErr=${String(e?.message || e)}`);
    }

    return NextResponse.json({ ok: true, contactId }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("quick-capture error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}