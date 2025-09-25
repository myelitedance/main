// app/api/ghl/lookup/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing env: ${k}`); return v; };
const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

function headers() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

// ——— utilities ———
function titleCaseName(s: string) {
  // Handles spaces, hyphens, and apostrophes: e.g., "mary-kate o'neal"
  return String(s || "")
    .toLowerCase()
    .split(" ")
    .map((chunk) =>
      chunk
        .split("-")
        .map((part) =>
          part
            .split("'")
            .map((seg) => (seg ? seg[0].toUpperCase() + seg.slice(1) : seg))
            .join("'")
        )
        .join("-")
    )
    .join(" ")
    .trim();
}

// CF IDs you shared
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
const getCF = (arr: Array<{id:string,value:any}>, id: string) =>
  arr.find(f => f.id === id)?.value ?? "";

async function searchContact(query: string) {
  const u = new URL(API + "/contacts/");
  u.searchParams.set("locationId", LOCATION_ID);
  u.searchParams.set("query", query);

  const res = await fetch(u.toString(), { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `GHL search failed (${res.status})` }, { status: 502 });
  }
  const json = await res.json() as any;

  const contacts = json?.contacts || [];
  if (!Array.isArray(contacts) || !contacts.length) {
    return NextResponse.json({ found: false });
  }

  const lower = (s:string)=>String(s||"").toLowerCase();
  const exact = contacts.find((c:any)=>lower(c.email)===lower(query)) || contacts[0];

  const c = exact;
  const cf = (c.customFields || []) as Array<{id:string,value:any}>;
  let additionalStudents: any[] = [];
  try { additionalStudents = JSON.parse(String(getCF(cf, CF.ADDL_JSON) || "[]")); } catch {}

  const parentFirst = c.firstName ?? "";
  const parentLast  = c.lastName ?? "";
  const parentFull  = (parentFirst || parentLast)
    ? `${parentFirst} ${parentLast}`.trim()
    : (c.contactName || "");

  const formDraft = {
    studentFirstName: String(getCF(cf, CF.DANCER_FIRST) || ""),
    studentLastName:  String(getCF(cf, CF.DANCER_LAST)  || ""),
    birthdate:        String(getCF(cf, CF.DANCER_DOB)   || ""),
    age:              String(getCF(cf, CF.DANCER_AGE)   || ""),
    // Title-case to avoid all-lowercase coming from GHL
    parent1:          titleCaseName(parentFull),
    parent2:          String(getCF(cf, CF.PARENT2)      || ""),
    primaryPhone:     c.phone || "",
    primaryPhoneIsCell: !!getCF(cf, CF.PRI_CELL),
    primaryPhoneSmsOptIn: !!getCF(cf, CF.SMS_ANY) || !!c.smsOptIn,
    altPhone:         String(getCF(cf, CF.ALT_PHONE)    || ""),
    altPhoneIsCell:   !!getCF(cf, CF.ALT_CELL),
    altPhoneSmsOptIn: !!getCF(cf, CF.SMS_ANY),
    email:            c.email || query,
    street:           c.address1 || "",
    city:             c.city || "",
    state:            c.state || "",
    zip:              c.postalCode || "",
    hearAbout:        String(getCF(cf, CF.HEAR_ABOUT)   || ""),
    hearAboutDetails: String(getCF(cf, CF.HEAR_DETAILS) || ""),
    benefits:         [],
    benefitsOther:    "",
    area6to12mo:      String(getCF(cf, CF.AREA_6_12)    || ""),
    waiverAcknowledged: !!getCF(cf, CF.WAIVER_ACK),
    waiverDate:         String(getCF(cf, CF.WAIVER_DATE)|| ""),
    signatureDataUrl:   String(getCF(cf, CF.SIG_DATAURL)|| ""),
    additionalStudents,
  };

  return NextResponse.json({ found: true, contactId: c.id, formDraft });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query") || url.searchParams.get("email") || "";
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  return searchContact(query);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { query?: string } | null;
  const query = body?.query || "";
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  return searchContact(query);
}