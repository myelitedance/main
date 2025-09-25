// app/api/ghl/new-student/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing env: ${k}`); return v; };
const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

function apiHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

// Custom Field IDs (from your earlier list)
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
};

// Normalize “truthy” into what your CFs expect
const yesNo = (v: any) => (v ? "Yes" : "");

async function searchByEmail(email: string) {
  const u = new URL(API + "/contacts");
  u.searchParams.set("locationId", LOCATION_ID);
  u.searchParams.set("query", email);
  const res = await fetch(u.toString(), { headers: apiHeaders(), cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    return { ok: false, status: res.status, body: text || "" };
  }
  const contacts = json?.contacts || [];
  const found = contacts.find((c: any) => String(c.email || "").toLowerCase() === String(email || "").toLowerCase());
  return { ok: true, id: found?.id || null };
}

function buildGhlContactBody(input: any) {
  // input = { contact: { name, firstName, lastName, email, phone, smsOptIn, address1, city, state, postalCode, customFields: {...} } }
  const c = input?.contact || {};

  // Derive first/last if only name was provided
  let firstName = c.firstName;
  let lastName = c.lastName;
  if (!firstName && !lastName && c.name) {
    const parts = String(c.name).trim().split(/\s+/);
    firstName = parts.shift() || "";
    lastName = parts.join(" ");
  }

  // Custom fields map (read the friendly keys you send from page.tsx)
  const cfSrc = c.customFields || {};
  const cfArray: Array<{ id: string; value: any }> = [];

  // Student name fields — prefer explicit first/last if you later add them
  const studentName = String(cfSrc.student_name || "").trim();
  const [studFirst, ...studLastRest] = studentName ? studentName.split(" ") : ["",""];
  const studLast = studLastRest.join(" ").trim();

  if (studFirst) cfArray.push({ id: CF.DANCER_FIRST, value: studFirst });
  if (studLast)  cfArray.push({ id: CF.DANCER_LAST,  value: studLast  });
  if (cfSrc.student_birthdate) cfArray.push({ id: CF.DANCER_DOB, value: cfSrc.student_birthdate });
  if (cfSrc.benefits_age || cfSrc.student_age) cfArray.push({ id: CF.DANCER_AGE, value: String(cfSrc.benefits_age || cfSrc.student_age) });

  if (cfSrc.parent2_name)     cfArray.push({ id: CF.PARENT2, value: cfSrc.parent2_name });
  if (c.altPhone)             cfArray.push({ id: CF.ALT_PHONE, value: c.altPhone });
  if (cfSrc.primary_phone_is_cell !== undefined) cfArray.push({ id: CF.PRI_CELL, value: yesNo(cfSrc.primary_phone_is_cell) });
  if (cfSrc.alt_phone_is_cell !== undefined)     cfArray.push({ id: CF.ALT_CELL, value: yesNo(cfSrc.alt_phone_is_cell) });
  if (cfSrc.hear_about)       cfArray.push({ id: CF.HEAR_ABOUT, value: cfSrc.hear_about });
  if (cfSrc.hear_details)     cfArray.push({ id: CF.HEAR_DETAILS, value: cfSrc.hear_details });
  if (cfSrc.area6to12mo || cfSrc.area_6_12_mo) cfArray.push({ id: CF.AREA_6_12, value: String(cfSrc.area6to12mo || cfSrc.area_6_12_mo) });
  if (cfSrc.waiverAcknowledged !== undefined)    cfArray.push({ id: CF.WAIVER_ACK, value: yesNo(cfSrc.waiverAcknowledged) });
  if (cfSrc.waiverSignedAt)   cfArray.push({ id: CF.WAIVER_DATE, value: cfSrc.waiverSignedAt });
  if (cfSrc.signature_data_url) cfArray.push({ id: CF.SIG_DATAURL, value: cfSrc.signature_data_url });
  if (cfSrc.additional_students_json) cfArray.push({ id: CF.ADDL_JSON, value: cfSrc.additional_students_json });

  // Compose GHL body
  const body: any = {
    locationId: LOCATION_ID,
    contact: {
      firstName: firstName || "",
      lastName: lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      smsOptIn: !!c.smsOptIn,
      address1: c.address1 || "",
      city: c.city || "",
      state: c.state || "",
      postalCode: c.postalCode || "",
      // GHL expects array of {id,value} for custom fields
      customFields: cfArray,
    },
  };

  return body;
}

export async function POST(req: Request) {
  try {
    const input = await req.json().catch(() => null);
    if (!input?.contact?.email) {
      return NextResponse.json({ ok: false, error: "Missing contact.email" }, { status: 400 });
    }

    // Build body for GHL
    const body = buildGhlContactBody(input);

    // Upsert: search by email → PUT if exists, else POST create
    const found = await searchByEmail(body.contact.email);
    if (!found.ok) {
      return NextResponse.json({ ok: false, upstream: "search", status: found.status, body: found.body }, { status: 502 });
    }

    let url = API + "/contacts/";
    let method: "POST" | "PUT" = "POST";
    if (found.id) {
      url = API + `/contacts/${found.id}`;
      method = "PUT";
    }

    const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      // Pass through what GHL said so you can see the real issue in the UI
      return NextResponse.json({ ok: false, status: res.status, body: text || json }, { status: 502 });
    }

    const id = found.id || json?.contact?.id || json?.id;
    return NextResponse.json({ ok: true, id, method });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unhandled error" }, { status: 500 });
  }
}