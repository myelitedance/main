// app/api/ghl/new-student/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing env: ${k}`); return v; };
const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

function headers() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

// ---- CF IDs (from your list) ----
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt", // TEXT
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm", // TEXT
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT", // NUMERICAL
  DANCER_DOB:   "DSx2NYeSCY2jCNo6iS0H", // DATE (YYYY-MM-DD)
  PARENT2:      "ucC4gId1ZMJm56cB0H3M", // TEXT
  ALT_PHONE:    "1PB1OcQFUoBfS2inTunM", // TEXT
  PRI_CELL:     "pkRiCpzFKLnuouOVbRc6", // CHECKBOX (true/false)
  ALT_CELL:     "uQUw8mMjEpcfeqqNlPiB", // CHECKBOX
  SMS_ANY:      "uXnKTIHx6gsdKMDW68ON", // CHECKBOX
  HEAR_ABOUT:   "AqxaofUPA7KRJDo91MoR", // SINGLE_OPTIONS (one of list)
  HEAR_DETAILS: "8D6kUnb4E5PtxjCVrsvq", // LARGE_TEXT
  SIG_DATAURL:  "Hjh3aLnraO504UGzLORT", // SIGNATURE (data URL string)
  WAIVER_ACK:   "YWHGT6sjAq6SOnelzF8c", // CHECKBOX
  WAIVER_DATE:  "dndYtdzpmBCQSRzEBvUa", // DATE
  ADDL_JSON:    "iTzywEXgDcih4lodiDSr", // LARGE_TEXT (we'll stringify)
  AREA_6_12:    "rpFpiILLYhLsFmOoHyWY", // RADIO ("Yes" | "No")
  FORM_SOURCE:  "9tbYGdE00y20t00GUMcR", // TEXT
};

const HEAR_ALLOWED = new Set([
  "Referral",
  "Show/demonstration",
  "Print advertisement",
  "Flier",
  "Internet Search",
  "Social Media",
  "Other",
]);

function pickHear(v?: string) {
  if (!v) return "";
  return HEAR_ALLOWED.has(v) ? v : "Other";
}
function pickYesNo(v?: string) {
  return v === "Yes" ? "Yes" : v === "No" ? "No" : "";
}
function toBool(v: any) {
  return v === true || v === "true" || v === "1" || v === 1;
}
function toIntOrNull(v: any) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}
function ymd(v?: string) {
  // Expect "YYYY-MM-DD"; pass-through if already that format
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? v : "";
}

// --- Search by email to decide update vs create ---
async function findByEmail(email: string) {
  const u = new URL(API + "/contacts/");
  u.searchParams.set("locationId", LOCATION_ID);
  u.searchParams.set("query", email);
  const res = await fetch(u.toString(), { headers: headers(), cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as any;
  const list = json?.contacts || [];
  if (!Array.isArray(list) || list.length === 0) return null;
  const lower = (s:string)=>String(s||"").toLowerCase();
  return list.find((c:any)=> lower(c.email) === lower(email)) || list[0];
}

// ...unchanged headers(), CF map, helpers...

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as any;
    if (!body || !body.contact) {
      return NextResponse.json({ error: "Missing contact payload" }, { status: 400 });
    }

    const c = body.contact as any;
    const email = (c.email || "").trim();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    // --- build customFields[] exactly as before (omitted here for brevity) ---
    const customFields: Array<{id:string; value:any}> = [];
    // ...populate customFields just like you had...

    // Base payload for BOTH create & update (NO locationId here!)
    const basePayload: any = {
      firstName: (c.firstName || "").trim(),
      lastName:  (c.lastName  || "").trim(),
      email,
      phone: (c.phone || "").trim(),
      address1: (c.address1 || "").trim(),
      city: (c.city || "").trim(),
      state: (c.state || "").trim(),
      postalCode: (c.postalCode || "").trim(),
      ...(c.name ? { name: c.name.trim() } : {}),
      ...(customFields.length ? { customFields } : {}),
    };

    // Upsert check
    const existing = await findByEmail(email);

    // CREATE: include locationId
    const createPayload = { ...basePayload, locationId: LOCATION_ID };

    // UPDATE: MUST NOT include locationId
    const updatePayload = basePayload;

    const endpoint = existing?.id
      ? `${API}/contacts/${existing.id}`
      : `${API}/contacts/`;

    const method = existing?.id ? "PUT" : "POST";
    const bodyToSend = existing?.id ? updatePayload : createPayload;

    const upstreamRes = await fetch(endpoint, {
      method,
      headers: headers(),
      body: JSON.stringify(bodyToSend),
    });

    const txt = await upstreamRes.text();
    let upstreamJson: any = null;
    try { upstreamJson = txt ? JSON.parse(txt) : null; } catch {}

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: "Update failed", upstream: { ok: upstreamRes.ok, status: upstreamRes.status, body: upstreamJson || txt } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: existing?.id ? "update" : "create",
      contactId: existing?.id || upstreamJson?.contact?.id || upstreamJson?.id || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}