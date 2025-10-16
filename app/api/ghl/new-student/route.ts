// app/api/ghl/new-student/route.ts
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

// === GHL Custom Field IDs (from your list) ===
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",
  DANCER_DOB:   "DSx2NYeSCY2jCNo6iS0H",

  PARENT2:      "ucC4gId1ZMJm56cB0H3M",
  ALT_PHONE:    "1PB1OcQFUoBfS2inTunM",

  PRI_CELL:     "pkRiCpzFKLnuouOVbRc6", // CHECKBOX
  ALT_CELL:     "uQUw8mMjEpcfeqqNlPiB", // CHECKBOX
  SMS_ANY:      "uXnKTIHx6gsdKMDW68ON", // CHECKBOX

  HEAR_ABOUT:   "AqxaofUPA7KRJDo91MoR", // PICKLIST
  HEAR_DETAILS: "8D6kUnb4E5PtxjCVrsvq",

  SIG_DATAURL:  "Hjh3aLnraO504UGzLORT", // SIGNATURE (data URL)
  WAIVER_ACK:   "YWHGT6sjAq6SOnelzF8c", // CHECKBOX
  WAIVER_DATE:  "dndYtdzpmBCQSRzEBvUa", // DATE (YYYY-MM-DD)

  ADDL_JSON:    "iTzywEXgDcih4lodiDSr",
  AREA_6_12:    "rpFpiILLYhLsFmOoHyWY", // RADIO

  FORM_SOURCE:  "9tbYGdE00y20t00GUMcR",
};

type ClientCustomFields = {
  // exactly what your client sends (snake_case)
  student_first_name?: string;
  student_last_name?: string;
  student_birthdate?: string;  // YYYY-MM-DD
  student_age?: string;

  parent2_name?: string;
  alt_phone?: string;

  primary_phone_is_cell?: boolean;
  alt_phone_is_cell?: boolean;
  sms_opt_in_any?: boolean;

  hear_about?: string;
  hear_details?: string;

  benefits_other?: string;     // not mapped (no CF in list) – left here in case you add one later

  area6to12mo?: "Yes" | "No" | "";

  waiver_acknowledged?: boolean;
  waiver_date?: string;        // YYYY-MM-DD

  signature_data_url?: string; // data:image/png;base64,...

  additional_students_json?: string; // JSON string

  form_source?: string;
};

type NewStudentPayload = {
  source?: string; // "newstudent"
  contact: {
    // Parent account / household fields
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;

    // What the client sends to map into CFs
    customFields?: ClientCustomFields;
  };
  meta?: { contactId?: string }; // from lookup
};

// ---------- helpers ----------
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

function pushIf<T>(arr: Array<{id: string; value: T}>, id: string, value: T | undefined | null) {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  arr.push({ id, value: value as T });
}

// ---------- route ----------
export async function POST(req: Request) {
  try {
    const body = await req.json() as NewStudentPayload;

    // basic guard
    if (!body?.contact?.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const c = body.contact;
    const cf = (c.customFields || {}) as ClientCustomFields;

    // Build CFs exactly from the snake_case keys your client sends
    const cfPairs: Array<{ id: string; value: any }> = [];

    // Student (Dancer) name / age / dob
    pushIf(cfPairs, CF.DANCER_FIRST, cf.student_first_name);
    pushIf(cfPairs, CF.DANCER_LAST,  cf.student_last_name);
    pushIf(cfPairs, CF.DANCER_AGE,   cf.student_age);
    pushIf(cfPairs, CF.DANCER_DOB,   cf.student_birthdate);

    // Parent 2 / alt phone
    pushIf(cfPairs, CF.PARENT2,   cf.parent2_name);
    pushIf(cfPairs, CF.ALT_PHONE, cf.alt_phone);

    // Checkboxes
    if (typeof cf.primary_phone_is_cell === "boolean") pushIf(cfPairs, CF.PRI_CELL, cf.primary_phone_is_cell);
    if (typeof cf.alt_phone_is_cell === "boolean")     pushIf(cfPairs, CF.ALT_CELL, cf.alt_phone_is_cell);
    if (typeof cf.sms_opt_in_any === "boolean")        pushIf(cfPairs, CF.SMS_ANY,  cf.sms_opt_in_any);
    if (typeof cf.waiver_acknowledged === "boolean")   pushIf(cfPairs, CF.WAIVER_ACK, cf.waiver_acknowledged);

    // Picklists / radios
    pushIf(cfPairs, CF.HEAR_ABOUT,   cf.hear_about);
    pushIf(cfPairs, CF.HEAR_DETAILS, cf.hear_details);
    pushIf(cfPairs, CF.AREA_6_12,    cf.area6to12mo);

    // Dates
    pushIf(cfPairs, CF.WAIVER_DATE, cf.waiver_date); // YYYY-MM-DD

    // Signature
    pushIf(cfPairs, CF.SIG_DATAURL, cf.signature_data_url);

    // Additional students JSON
    pushIf(cfPairs, CF.ADDL_JSON, cf.additional_students_json);

    // Provenance
    const formSource = body.source ?? cf.form_source;
    pushIf(cfPairs, CF.FORM_SOURCE, formSource);

    // Base contact (parent/household) fields – keep these as-is
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

    // Create vs Update
    const targetId = body.meta?.contactId || (await findByEmail(c.email))?.id || null;
    const endpoint = targetId
      ? `${API}/contacts/${targetId}`    // UPDATE
      : `${API}/contacts/`;              // CREATE
    const method = targetId ? "PUT" : "POST";
    const payload = targetId
      ? baseContact
      : { ...baseContact, locationId: LOCATION_ID }; // required for create

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