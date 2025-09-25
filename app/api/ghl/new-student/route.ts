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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as any;
    if (!body || !body.contact) {
      return NextResponse.json({ error: "Missing contact payload" }, { status: 400 });
    }

    // Incoming from your page.tsx buildGhlPayload(...)
    const c = body.contact as {
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      customFields?: {
        student_name?: string; // not used directly—split below
        student_birthdate?: string;
        parent2_name?: string;
        alt_phone?: string;
        primary_phone_is_cell?: boolean;
        alt_phone_is_cell?: boolean;
        hear_about?: string;
        hear_details?: string;
        benefits?: string;        // (unused in GHL fields)
        benefits_other?: string;  // (unused in GHL fields)
        area6to12mo?: "Yes"|"No"|"";
        waiverAcknowledged?: boolean;
        waiverSignedAt?: string;  // date
      };
    };

    const email = (c.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Derive student first/last from student_name if provided
    const studentName = (c.customFields?.student_name || "").trim();
    const [studentFirst, ...rest] = studentName.split(/\s+/);
    const studentLast = rest.join(" ");

    // Build customFields array matching your schema
    const cf: Array<{ id: string; value: any }> = [];

    // Student name / DOB / Age (age: prefer numerical from DOB if your UI provided; else ignore)
    if (studentFirst) cf.push({ id: CF.DANCER_FIRST, value: studentFirst });
    if (studentLast)  cf.push({ id: CF.DANCER_LAST,  value: studentLast  });
    if (c.customFields?.student_birthdate) {
      const d = ymd(c.customFields.student_birthdate);
      if (d) cf.push({ id: CF.DANCER_DOB, value: d });
    }

    // Parent 2
    if (c.customFields?.parent2_name) cf.push({ id: CF.PARENT2, value: c.customFields.parent2_name });

    // Phones
    if (c.customFields?.alt_phone) cf.push({ id: CF.ALT_PHONE, value: c.customFields.alt_phone });
    if (typeof c.customFields?.primary_phone_is_cell !== "undefined") {
      cf.push({ id: CF.PRI_CELL, value: toBool(c.customFields.primary_phone_is_cell) });
    }
    if (typeof c.customFields?.alt_phone_is_cell !== "undefined") {
      cf.push({ id: CF.ALT_CELL, value: toBool(c.customFields.alt_phone_is_cell) });
    }

    // SMS (Any) -> CHECKBOX
    // (Top-level smsOptIn is NOT allowed by the API you hit; set the CF instead.)
    const smsAny =
      toBool(c.customFields?.primary_phone_is_cell) || // your UI used this as indicator
      toBool(c.customFields?.alt_phone_is_cell) ||
      false;
    cf.push({ id: CF.SMS_ANY, value: smsAny });

    // Hear about + details
    const hear = pickHear(c.customFields?.hear_about || "");
    if (hear) cf.push({ id: CF.HEAR_ABOUT, value: hear });
    if (c.customFields?.hear_details) cf.push({ id: CF.HEAR_DETAILS, value: c.customFields.hear_details });

    // Area 6–12 months -> RADIO "Yes" | "No"
    const area = pickYesNo(c.customFields?.area6to12mo || "");
    if (area) cf.push({ id: CF.AREA_6_12, value: area });

    // Waiver
    if (typeof c.customFields?.waiverAcknowledged !== "undefined") {
      cf.push({ id: CF.WAIVER_ACK, value: toBool(c.customFields.waiverAcknowledged) });
    }
    if (c.customFields?.waiverSignedAt) {
      const d = ymd(c.customFields.waiverSignedAt);
      if (d) cf.push({ id: CF.WAIVER_DATE, value: d });
    }

    // Signature (data URL)
    if (body?.source === "newstudent" && body.contact?.customFields?.["signatureDataUrl"]) {
      // If you send it from the form directly, adapt as needed.
      cf.push({ id: CF.SIG_DATAURL, value: String(body.contact.customFields["signatureDataUrl"] || "") });
    }

    // Additional students JSON (if you have them in the form payload—optional)
    if (body?.additionalStudents) {
      cf.push({ id: CF.ADDL_JSON, value: JSON.stringify(body.additionalStudents) });
    }

    // Form source
    cf.push({ id: CF.FORM_SOURCE, value: "newstudent" });

    // Base contact payload (NO smsOptIn here to avoid 422)
    const contactPayload: any = {
      locationId: LOCATION_ID,
      firstName: (c.firstName || "").trim(),
      lastName:  (c.lastName  || "").trim(),
      email,
      phone: (c.phone || "").trim(),
      address1: (c.address1 || "").trim(),
      city: (c.city || "").trim(),
      state: (c.state || "").trim(),
      postalCode: (c.postalCode || "").trim(),
      // name is optional; GHL derives from first/last—safe to omit or include
      ...(c.name ? { name: c.name.trim() } : {}),
      customFields: cf,
    };

    // Upsert: find existing by email → PUT /contacts/{id}, else POST /contacts/
    const existing = await findByEmail(email);

    let upstreamRes: Response;
    if (existing?.id) {
      upstreamRes = await fetch(`${API}/contacts/${existing.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(contactPayload),
      });
    } else {
      upstreamRes = await fetch(`${API}/contacts/`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(contactPayload),
      });
    }

    const txt = await upstreamRes.text();
    let upstreamJson: any = null;
    try { upstreamJson = txt ? JSON.parse(txt) : null; } catch {}

    if (!upstreamRes.ok) {
      // Return a concise error for the UI
      return NextResponse.json(
        { error: "Update failed", upstream: { ok: upstreamRes.ok, status: upstreamRes.status, body: upstreamJson || txt } },
        { status: 502 }
      );
    }

    // Success
    return NextResponse.json({
      ok: true,
      mode: existing?.id ? "update" : "create",
      contactId: existing?.id || upstreamJson?.contact?.id || upstreamJson?.id || null,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}