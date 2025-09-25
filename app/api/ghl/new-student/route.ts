import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing env: ${k}`); return v; };
const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

function headers(readOnly = false) {
  const h: Record<string,string> = {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
  if (!readOnly) h["Content-Type"] = "application/json";
  return h;
}

// === CF ids from your list ===
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",
  DANCER_DOB:   "DSx2NYeSCY2jCNo6iS0H",
  PARENT2:      "ucC4gId1ZMJm56cB0H3M",
  ALT_PHONE:    "1PB1OcQFUoBfS2inTunM",
  PRI_CELL:     "pkRiCpzFKLnuouOVbRc6", // CHECKBOX → boolean
  ALT_CELL:     "uQUw8mMjEpcfeqqNlPiB", // CHECKBOX → boolean
  SMS_ANY:      "uXnKTIHx6gsdKMDW68ON", // CHECKBOX → boolean
  HEAR_ABOUT:   "AqxaofUPA7KRJDo91MoR", // SINGLE_OPTIONS → one of: Referral, Show/demonstration, ...
  HEAR_DETAILS: "8D6kUnb4E5PtxjCVrsvq",
  SIG_DATAURL:  "Hjh3aLnraO504UGzLORT", // SIGNATURE (accepts data URL)
  WAIVER_ACK:   "YWHGT6sjAq6SOnelzF8c", // CHECKBOX → boolean
  WAIVER_DATE:  "dndYtdzpmBCQSRzEBvUa", // DATE → YYYY-MM-DD
  ADDL_JSON:    "iTzywEXgDcih4lodiDSr",
  AREA_6_12:    "rpFpiILLYhLsFmOoHyWY", // RADIO → "Yes" | "No" | ""
  FORM_SOURCE:  "9tbYGdE00y20t00GUMcR",
};

type NewStudentPayload = {
  source?: string;
  contact: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    smsOptIn?: boolean;               // IGNORE – don’t send to top-level (GHL rejects)
    customFields?: {
      student_name?: string;
      student_birthdate?: string;     // YYYY-MM-DD
      parent2_name?: string;
      alt_phone?: string;
      primary_phone_is_cell?: boolean;
      alt_phone_is_cell?: boolean;
      hear_about?: string;            // must match one of the picklist options
      hear_details?: string;
      benefits?: string;              // you’re storing as CSV; we won’t send (no CF for it)
      benefits_other?: string;        // (same)
      area6to12mo?: "Yes" | "No" | "";
      waiverAcknowledged?: boolean;
      waiverSignedAt?: string;        // YYYY-MM-DD
      signatureDataUrl?: string;      // data:image/png;base64,...
      additionalStudentsJson?: string;// JSON string
    };
  };
  meta?: { contactId?: string }       // <— pass this from the client
};

async function findByEmail(email: string) {
  const u = new URL(API + "/contacts/");
  u.searchParams.set("locationId", LOCATION_ID);
  u.searchParams.set("query", email);
  const r = await fetch(u.toString(), { headers: headers(true), cache: "no-store" });
  if (!r.ok) return null;
  const j: any = await r.json().catch(() => null);
  const list = Array.isArray(j?.contacts) ? j.contacts : [];
  const lower = (s: string) => String(s || "").toLowerCase();
  return list.find((c: any) => lower(c.email) === lower(email)) || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as NewStudentPayload;
    if (!body?.contact?.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const c = body.contact;

    // ---- map to GHL contact ----
    const cfPairs: Array<{ id: string; value: any }> = [];

    const cf = c.customFields || {};
    // optional fields → push only if defined/non-empty
    if (cf.student_birthdate) cfPairs.push({ id: CF.DANCER_DOB, value: cf.student_birthdate });
    if (cf.parent2_name)      cfPairs.push({ id: CF.PARENT2,    value: cf.parent2_name });
    if (cf.alt_phone)         cfPairs.push({ id: CF.ALT_PHONE,  value: cf.alt_phone });

    // booleans for CHECKBOX custom fields
    if (typeof cf.primary_phone_is_cell === "boolean")
      cfPairs.push({ id: CF.PRI_CELL, value: cf.primary_phone_is_cell });
    if (typeof cf.alt_phone_is_cell === "boolean")
      cfPairs.push({ id: CF.ALT_CELL, value: cf.alt_phone_is_cell });
    if (typeof cf.waiverAcknowledged === "boolean")
      cfPairs.push({ id: CF.WAIVER_ACK, value: cf.waiverAcknowledged });

    // picklists / radios
    if (cf.hear_about)        cfPairs.push({ id: CF.HEAR_ABOUT, value: cf.hear_about });
    if (cf.hear_details)      cfPairs.push({ id: CF.HEAR_DETAILS, value: cf.hear_details });
    if (cf.area6to12mo)       cfPairs.push({ id: CF.AREA_6_12, value: cf.area6to12mo });

    // dates
    if (cf.waiverSignedAt)    cfPairs.push({ id: CF.WAIVER_DATE, value: cf.waiverSignedAt });

    // signature
    if (cf.signatureDataUrl)  cfPairs.push({ id: CF.SIG_DATAURL, value: cf.signatureDataUrl });

    // additional students JSON
    if (cf.additionalStudentsJson) cfPairs.push({ id: CF.ADDL_JSON, value: cf.additionalStudentsJson });

    // optional provenance
    if (body.source) cfPairs.push({ id: CF.FORM_SOURCE, value: body.source });

    // base (valid for both create & update)
    const baseContact: any = {
      firstName: (c.firstName || "").trim(),
      lastName:  (c.lastName  || "").trim(),
      email:     (c.email     || "").trim(),
      phone:     (c.phone     || "").trim(),
      address1:  (c.address1  || "").trim(),
      city:      (c.city      || "").trim(),
      state:     (c.state     || "").trim(),
      postalCode:(c.postalCode|| "").trim(),
      ...(c.name ? { name: c.name.trim() } : {}),
      ...(cfPairs.length ? { customFields: cfPairs } : {}),
    };

    // decide target: prefer explicit ID from client, else match by email
    const targetId = body.meta?.contactId || (await findByEmail(c.email))?.id || null;

    const endpoint = targetId
      ? `${API}/contacts/${targetId}`   // UPDATE
      : `${API}/contacts/`;             // CREATE

    const method = targetId ? "PUT" : "POST";
    const payload = targetId
      ? baseContact                         // UPDATE: NO locationId
      : { ...baseContact, locationId: LOCATION_ID }; // CREATE: MUST include locationId

    const upstream = await fetch(endpoint, {
      method,
      headers: headers(false),
      body: JSON.stringify(payload),
    });

    const txt = await upstream.text();
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Update failed", upstream: { ok: upstream.ok, status: upstream.status, body: json || txt } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: targetId ? "update" : "create",
      contactId: targetId || json?.contact?.id || json?.id || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}