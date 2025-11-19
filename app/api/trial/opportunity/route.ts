import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");

// Your pipeline
const PIPELINE_ID = "Dance Lead / Prospect";   

function headers() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      contactId,
      dancerFirstName,
      dancerAge,
      selectedClass
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Missing contactId for opportunity creation." },
        { status: 400 }
      );
    }

    // Required opportunity name
    const opportunityName =
      `${dancerFirstName || "Student"} Trial Class Inquiry`;

    // Build custom fields ARRAY
    const customFields = [
      { key: "opportunity.student__first_name", value: dancerFirstName || "" },
      { key: "opportunity.student__age", value: dancerAge || "" },
      { key: "opportunity.trial_class_name", value: selectedClass?.name || "" },
    ];

    const payload = {
      locationId: LOCATION_ID,
      contactId,
      pipelineId: PIPELINE_ID,
      name: opportunityName,
      status: "open",           // REQUIRED
      customFields              // MUST be array of objects
    };

    const res = await fetch(`${API}/opportunities/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}

    if (!res.ok || !json?.id) {
      console.error("Opportunity Create Error:", json || txt);
      return NextResponse.json(
        { error: json || txt, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({
      opportunityId: json.id,
    });

  } catch (err: any) {
    console.error("Trial Opportunity Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
