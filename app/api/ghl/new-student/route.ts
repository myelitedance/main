// app/api/ghl/new-student/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

function ghlHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

// ---- CF ID map (same IDs you used in lookup) ----
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

// turn your contact.customFields object → GHL array format
function toGhlCustomFields(obj: Record<string, any> | undefined) {
  if (!obj) return [];
  // map your semantic keys → CF IDs
  const map: Record<string, string> = {
    student_name: CF.DANCER_FIRST,             // we'll split first/last below
    student_birthdate: CF.DANCER_DOB,
    parent2_name: CF.PARENT2,
    alt_phone: CF.ALT_PHONE,
    primary_phone_is_cell: CF.PRI_CELL,
    alt_phone_is_cell: CF.ALT_CELL,
    hear_about: CF.HEAR_ABOUT,
    hear_details: CF.HEAR_DETAILS,
    benefits: CF.DANCER_AGE,                   // if you had a dedicated CF; otherwise remove
    benefits_other: "",                        // remove if no CF
    area6to12mo: CF.AREA_6_12,
    waiverAcknowledged: CF.WAIVER_ACK,
    waiverSignedAt: CF.WAIVER_DATE,
    edm__additional_students_json: CF.ADDL_JSON,
    edm__signature_data_url: CF.SIG_DATAURL,
    edm__sms_opt_in_any: CF.SMS_ANY,
  };

  const out: { id: string; value: any }[] = [];

  for (const [k, v] of Object.entries(obj)) {
    const id = map[k];
    if (!id) continue;
    out.push({ id, value: v });
  }
  return out;
}

// Split "student_name" into first/last if provided
function splitName(full?: string) {
  const s = String(full || "").trim();
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  return { first, last };
}

// ---------- Upstream helpers ----------
async function searchByEmail(email: string) {
  const u = new URL(API + "/contacts/");
  u.searchParams.set("locationId", LOCATION_ID);
  u.searchParams.set("query", email);

  const r = await fetch(u.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!r.ok) return { ok: false, status: r.status, json: await r.json().catch(() => null) };

  const json = await r.json().catch(() => null) as any;
  const list = Array.isArray(json?.contacts) ? json.contacts : [];
  const lower = (s:string)=>String(s||"").toLowerCase();
  const hit = list.find((c:any)=> lower(c.email) === lower(email)) || null;
  return { ok: true, id: hit?.id || null };
}

async function createContact(body: any) {
  // creation must include locationId
  const payload = { locationId: LOCATION_ID, ...body };
  const r = await fetch(API + "/contacts/", {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, json };
}

async function updateContact(id: string, body: any) {
  // GHL accepts PUT for update on /contacts/{id}
  const r = await fetch(`${API}/contacts/${id}`, {
    method: "PUT",
    headers: ghlHeaders(),
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, json };
}

// normalize the incoming client payload → GHL shape
function buildGhlBody(input: any) {
  const c = input?.contact ?? {};
  const cfArray = toGhlCustomFields(c.customFields);

  // If you sent student_name, split it
  let studentFirst = "";
  let studentLast = "";
  if (c?.customFields?.student_name) {
    const s = splitName(c.customFields.student_name);
    studentFirst = s.first;
    studentLast = s.last;
    // also push explicit dancer first/last if you actually use separate CFs for them
    if (CF.DANCER_FIRST) cfArray.push({ id: CF.DANCER_FIRST, value: studentFirst });
    if (CF.DANCER_LAST)  cfArray.push({ id: CF.DANCER_LAST,  value: studentLast });
  }

  return {
    // base contact fields
    name: c.name || undefined,
    firstName: c.firstName || undefined,
    lastName: c.lastName || undefined,
    email: c.email || undefined,
    phone: c.phone || undefined,
    smsOptIn: !!c.smsOptIn,
    address1: c.address1 || undefined,
    city: c.city || undefined,
    state: c.state || undefined,
    postalCode: c.postalCode || undefined,
    // custom fields array
    customFields: cfArray,
  };
}

// -------- Route handlers --------
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  // health check (handy for curl)
  return NextResponse.json({ ok: true, route: "/api/ghl/new-student" });
}

export async function POST(req: Request) {
  try {
    const input = await req.json().catch(() => null);
    if (!input?.contact?.email) {
      return NextResponse.json({ error: "Missing contact.email" }, { status: 400 });
    }

    const email = String(input.contact.email).trim();
    const ghlBody = buildGhlBody(input);

    // search → upsert
    const search = await searchByEmail(email);
    if (!search.ok) {
      return NextResponse.json(
        { error: "Search failed", upstream: search },
        { status: 502 }
      );
    }

    if (search.id) {
      // update existing
      const upd = await updateContact(search.id, ghlBody);
      if (!upd.ok) {
        return NextResponse.json(
          { error: "Update failed", upstream: upd },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, mode: "update", id: search.id, upstream: upd.json });
    } else {
      // create new
      const crt = await createContact(ghlBody);
      if (!crt.ok) {
        return NextResponse.json(
          { error: "Create failed", upstream: crt },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, mode: "create", upstream: crt.json });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unhandled" }, { status: 500 });
  }
}