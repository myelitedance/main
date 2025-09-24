// /app/api/ghl/lookup/route.ts
import { NextResponse } from "next/server";

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

// Your CF ID map (from your dump). Add more as needed.
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
  FORM_SOURCE:  "9tbYGdE00y20t00GUMcR",
  AREA_6_12:    "rpFpiILLYhLsFmOoHyWY",
};

const getCF = (arr: Array<{id:string,value:any}>, id: string) =>
  arr.find(f => f.id === id)?.value ?? "";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  try {
    const { query } = await req.json() as { query?: string };
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    // Search (legacy-compatible)
    const u = new URL(API + "/contacts/");
    u.searchParams.set("locationId", LOCATION_ID);
    u.searchParams.set("query", query);

    const res = await fetch(u.toString(), { headers: headers(), cache: "no-store" });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (debug) console.log("[lookup] status", res.status, text?.slice(0,500));

    if (!res.ok) {
      return NextResponse.json({ error: `GHL search failed (${res.status})` }, { status: 502 });
    }

    const contacts = json?.contacts || [];
    if (!Array.isArray(contacts) || !contacts.length) {
      return NextResponse.json({ found: false });
    }

    // Prioritize exact email match
    const lower = (s:string)=>String(s||"").toLowerCase();
    const exact = contacts.find((c:any)=>lower(c.email)===lower(query)) || contacts[0];

    const c = exact;
    const cf = (c.customFields || []) as Array<{id:string,value:any}>;

    // Map into your form draft
    let additionalStudents = [];
    try { additionalStudents = JSON.parse(String(getCF(cf, CF.ADDL_JSON) || "[]")); } catch {}

    const formDraft = {
      studentFirstName: String(getCF(cf, CF.DANCER_FIRST) || ""),
      studentLastName:  String(getCF(cf, CF.DANCER_LAST)  || ""),
      birthdate:        String(getCF(cf, CF.DANCER_DOB)   || ""),
      age:              String(getCF(cf, CF.DANCER_AGE)   || ""),
      parent1:          c.contactName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
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
      benefits:         [],            // (not stored in your CFs; leave empty)
      benefitsOther:    "",
      area6to12mo:      String(getCF(cf, CF.AREA_6_12)    || ""),
      waiverAcknowledged: !!getCF(cf, CF.WAIVER_ACK),
      waiverDate:         String(getCF(cf, CF.WAIVER_DATE)|| ""),
      signatureDataUrl:   String(getCF(cf, CF.SIG_DATAURL)|| ""),
      additionalStudents,
    };

    return NextResponse.json({ found: true, contactId: c.id, formDraft });
  } catch (e: any) {
    if (debug) console.error("[lookup] error", e?.message, e?.stack);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}