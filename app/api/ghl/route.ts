// /app/api/ghl/lookup/route.ts
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const GHL_API = "https://services.leadconnectorhq.com";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY     = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

// ---- Custom Field IDs (from your full list) ----
const CF = {
  DANCER_FIRST:          "scpp296TInQvCwknlSXt",
  DANCER_LAST:           "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:            "HtGv4RUuffIl4UJeXmjT",
  U7_RECS_CSV:           "IRFoGYtxrdlerisKdi1o",
  EXPERIENCE:            "SrUlABm2OX3HEgSDJgBG",
  STYLE_CSV:             "uoAhDKEmTR2k7PcxCcag",
  TEAM_INT:              "pTnjhy6ilHaY1ykoPly4",
  WANTS_RECS:            "gxIoT6RSun7KL9KDu0Qs",
  CLASS_ID:              "seWdQbk6ZOerhIjAdI7d",
  CLASS_NAME:            "Zd88pTAbiEKK08JdDQNj",
  SMS_CONSENT:           "vZb6JlxDCWfTParnzInw",
  NOTES:                 "2JKj9HTS7Hhu0NUxuswN",

  DANCER_BIRTHDATE:      "DSx2NYeSCY2jCNo6iS0H",
  PARENT2_NAME:          "ucC4gId1ZMJm56cB0H3M",
  ALT_PHONE:             "1PB1OcQFUoBfS2inTunM",
  PRIMARY_PHONE_IS_CELL: "pkRiCpzFKLnuouOVbRc6",
  ALT_PHONE_IS_CELL:     "uQUw8mMjEpcfeqqNlPiB",
  SMS_OPT_ANY:           "uXnKTIHx6gsdKMDW68ON",
  HEAR_ABOUT:            "AqxaofUPA7KRJDo91MoR",
  HEAR_DETAILS:          "8D6kUnb4E5PtxjCVrsvq",
  SIGNATURE_DATA_URL:    "Hjh3aLnraO504UGzLORT",
  WAIVER_ACK:            "YWHGT6sjAq6SOnelzF8c",
  WAIVER_DATE:           "dndYtdzpmBCQSRzEBvUa",
  ADDL_STUDENTS_JSON:    "iTzywEXgDcih4lodiDSr",
  FORM_SOURCE:           "9tbYGdE00y20t00GUMcR",
  AREA_6_12_MO:          "rpFpiILLYhLsFmOoHyWY",

  // UTM + page path (handy to show but not required to prefill)
  UTM_SOURCE:            "CSCvFURGpjVT3QQq4zMj",
  UTM_MEDIUM:            "DSr9AU4sDkgbCp4EX7XR",
  UTM_CAMPAIGN:          "griR53QgvqlnnXDbd1Qi",
  PAGE_PATH:             "f1bLQiSnX2HtnY0vjLAe",
};

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

type GhlCF = { id: string; value?: any };

/** Pull simple value from contact.customFields[] by ID */
function getCF(contact: any, id: string): any {
  const f: GhlCF | undefined = (contact?.customFields || []).find((x: any) => x.id === id);
  return f?.value ?? null;
}

/** Try several queries, return first contact or null */
async function findContact(query: string): Promise<any | null> {
  const q = encodeURIComponent(query.trim());
  // 1) Generic search
  try {
    const s = await ghl(`/contacts/?locationId=${LOCATION_ID}&query=${q}&limit=1`);
    const c = s?.contacts?.[0];
    if (c?.id) return c;
  } catch {}

  // 2) Email-specific search (if the API supports it in your tenant)
  try {
    const s = await ghl(`/contacts/search?locationId=${LOCATION_ID}&email=${q}`);
    const c = s?.contacts?.[0];
    if (c?.id) return c;
  } catch {}

  // 3) Phone-specific search
  try {
    const s = await ghl(`/contacts/search?locationId=${LOCATION_ID}&phone=${q}`);
    const c = s?.contacts?.[0];
    if (c?.id) return c;
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query || body?.email || body?.phone || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing 'query' (email or phone)" }, { status: 400 });
    }

    const summary = await findContact(query);
    if (!summary) {
      return NextResponse.json({ found: false });
    }

    // pull the full contact to ensure we have all fields/customFields
    const full = await ghl(`/contacts/${summary.id}`);

    const c = full?.contact || full; // different shapes exist, normalize

    // Normalize -> shape for your NewStudentForm
    const parentFirst = c.firstName || "";
    const parentLast  = c.lastName || "";
    const parent1     = [parentFirst, parentLast].filter(Boolean).join(" ");

    const formDraft = {
      // Parent / contact basics
      parent1,
      parent2:                getCF(c, CF.PARENT2_NAME) || "",
      email:                  c.email || "",
      primaryPhone:           c.phone || "",
      primaryPhoneIsCell:     !!(getCF(c, CF.PRIMARY_PHONE_IS_CELL) === "Yes"),
      altPhone:               getCF(c, CF.ALT_PHONE) || "",
      altPhoneIsCell:         !!(getCF(c, CF.ALT_PHONE_IS_CELL) === "Yes"),
      primaryPhoneSmsOptIn:   !!(getCF(c, CF.SMS_OPT_ANY) === "Yes"),
      altPhoneSmsOptIn:       !!(getCF(c, CF.SMS_OPT_ANY) === "Yes"), // mirrored "any"
      street:                 c.address1 || "",
      city:                   c.city || "",
      state:                  c.state || "",
      zip:                    c.postalCode || "",

      // Student (primary)
      studentFirstName:       getCF(c, CF.DANCER_FIRST) || "",
      studentLastName:        getCF(c, CF.DANCER_LAST) || "",
      birthdate:              getCF(c, CF.DANCER_BIRTHDATE) || "",
      age:                    getCF(c, CF.DANCER_AGE) || "",

      // How did you hear
      hearAbout:              getCF(c, CF.HEAR_ABOUT) || "",
      hearAboutDetails:       getCF(c, CF.HEAR_DETAILS) || "",

      // Benefits (your existing CFs don’t store these individually; leave blank)
      benefits:               [] as string[],
      benefitsOther:          "",

      // 6–12 month area
      area6to12mo:            (getCF(c, CF.AREA_6_12_MO) as "Yes" | "No" | "") || "",

      // Waiver / signature (prefill to reduce rework)
      waiverAcknowledged:     !!(getCF(c, CF.WAIVER_ACK) === "Yes"),
      waiverDate:             getCF(c, CF.WAIVER_DATE) || "",
      signatureDataUrl:       getCF(c, CF.SIGNATURE_DATA_URL) || "",

      // Additional students (stored as JSON string)
      additionalStudents: (() => {
        const raw = getCF(c, CF.ADDL_STUDENTS_JSON);
        if (!raw) return [];
        try {
          const j = JSON.parse(String(raw));
          if (Array.isArray(j)) return j;
        } catch {}
        return [];
      })(),
    };

    return NextResponse.json({
      found: true,
      contactId: c.id,
      formDraft,
    });
  } catch (err: any) {
    console.error("lookup error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}