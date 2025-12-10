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

// === GHL Custom Field IDs ===
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",
  DANCER_DOB:   "DSx2NYeSCY2jCNo6iS0H",

  PARENT2:      "ucC4gId1ZMJm56cB0H3M",
  ALT_PHONE:    "1PB1OcQFUoBfS2inTunM",

  PRI_CELL:     "pkRiCpzFKLnuouOVbRc6",
  ALT_CELL:     "uQUw8mMjEpcfeqqNlPiB",
  SMS_ANY:      "uXnKTIHx6gsdKMDW68ON",

  HEAR_ABOUT:   "AqxaofUPA7KRJDo91MoR",
  HEAR_DETAILS: "8D6kUnb4E5PtxjCVrsvq",

  SIG_DATAURL:  "Hjh3aLnraO504UGzLORT",
  WAIVER_ACK:   "YWHGT6sjAq6SOnelzF8c",
  WAIVER_DATE:  "dndYtdzpmBCQSRzEBvUa",

  ADDL_JSON:    "iTzywEXgDcih4lodiDSr",
  AREA_6_12:    "rpFpiILLYhLsFmOoHyWY",

  FORM_SOURCE:  "9tbYGdE00y20t00GUMcR",
};

function pushIf(arr: any[], id: string, v: any) {
  if (v === undefined || v === null) return;
  if (typeof v === "string" && v.trim() === "") return;
  arr.push({ id, value: v });
}

async function safeFindByEmail(email: string) {
  try {
    const u = new URL(API + "/contacts/");
    u.searchParams.set("locationId", LOCATION_ID);
    u.searchParams.set("query", email);
    const r = await fetch(u.toString(), { headers: headers(true), cache: "no-store" });
    if (!r.ok) return null;
    const j: any = await r.json().catch(() => null);
    const list = Array.isArray(j?.contacts) ? j.contacts : [];
    const lower = (s: string) => String(s || "").toLowerCase();
    return list.find((c: any) => lower(c.email) === lower(email)) || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let ghlError: string | null = null;
  let contactId: string | null = null;

  try {
    const body = await req.json();

    if (!body?.contact?.email) {
      ghlError = "No email provided";
      return NextResponse.json({ ok: true, ghlError }); // still succeed
    }

    const c = body.contact;
    const cf = c.customFields || {};
    const cfPairs: any[] = [];

    pushIf(cfPairs, CF.DANCER_FIRST, cf.student_first_name);
    pushIf(cfPairs, CF.DANCER_LAST,  cf.student_last_name);
    pushIf(cfPairs, CF.DANCER_AGE,   cf.student_age);
    pushIf(cfPairs, CF.DANCER_DOB,   cf.student_birthdate);
    pushIf(cfPairs, CF.PARENT2,      cf.parent2_name);
    pushIf(cfPairs, CF.ALT_PHONE,    cf.alt_phone);

    if (typeof cf.primary_phone_is_cell === "boolean") pushIf(cfPairs, CF.PRI_CELL, cf.primary_phone_is_cell);
    if (typeof cf.alt_phone_is_cell === "boolean")     pushIf(cfPairs, CF.ALT_CELL, cf.alt_phone_is_cell);
    if (typeof cf.sms_opt_in_any === "boolean")        pushIf(cfPairs, CF.SMS_ANY,  cf.sms_opt_in_any);
    if (typeof cf.waiver_acknowledged === "boolean")   pushIf(cfPairs, CF.WAIVER_ACK, cf.waiver_acknowledged);

    pushIf(cfPairs, CF.HEAR_ABOUT, cf.hear_about);
    pushIf(cfPairs, CF.HEAR_DETAILS, cf.hear_details);
    pushIf(cfPairs, CF.AREA_6_12, cf.area6to12mo);

    pushIf(cfPairs, CF.WAIVER_DATE, cf.waiver_date);
    pushIf(cfPairs, CF.SIG_DATAURL, cf.signature_data_url);
    pushIf(cfPairs, CF.ADDL_JSON, cf.additional_students_json);

    const formSource = body.source ?? cf.form_source;
    pushIf(cfPairs, CF.FORM_SOURCE, formSource);

    const baseContact: any = {
      firstName: (c.firstName || "").trim(),
      lastName:  (c.lastName  || "").trim(),
      email:     (c.email     || "").trim(),
      phone:     (c.phone     || "").trim(),
      address1:  (c.address1  || "").trim(),
      city:      (c.city      || "").trim(),
      state:     (c.state     || "").trim(),
      postalCode:(c.postalCode|| "").trim(),
    };

    if (c.name) baseContact.name = c.name.trim();
    if (cfPairs.length) baseContact.customFields = cfPairs;

    let target = body.meta?.contactId || (await safeFindByEmail(c.email))?.id || null;

    const endpoint = target
      ? `${API}/contacts/${target}`
      : `${API}/contacts/`;

    const method = target ? "PUT" : "POST";
    const payload = target ? baseContact : { ...baseContact, locationId: LOCATION_ID };

    const upstream = await fetch(endpoint, {
      method,
      headers: headers(false),
      body: JSON.stringify(payload),
    });

    const txt = await upstream.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch {}

    if (!upstream.ok) {
      ghlError = `GHL API error (${upstream.status}): ${txt}`;
    } else {
      contactId = target || json?.contact?.id || json?.id || null;
    }

  } catch (err: any) {
    ghlError = `Server exception: ${err?.message}`;
  }

  return NextResponse.json({
    ok: true,
    contactId,
    ghlError,
  });
}
