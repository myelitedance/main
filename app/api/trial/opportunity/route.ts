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

// Correct pipeline + stage IDs from your JSON
const PIPELINE_ID = "BKJR7YvccnciXEqOEHJV";
const PIPELINE_STAGE_ID = "0eef5e7d-001b-4b31-8a3c-ce48521c45e7";

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

    // Required name
    const opportunityName =
      `${dancerFirstName || "Student"} Trial Class Inquiry`;

    // Custom fields MUST be array objects
    const customFields = [
      { key: "opportunity.student__first_name", value: dancerFirstName || "" },
      { key: "opportunity.student__age", value: dancerAge || "" },
      { key: "opportunity.trial_class_name", value: selectedClass?.name || "" },
    ];

    const payload = {
      locationId: LOCATION_ID,
      contactId,
      pipelineId: PIPELINE_ID,
      pipelineStageId: PIPELINE_STAGE_ID, // ✔ correct key
      name: opportunityName,
      status: "open",                    // ✔ required
      customFields                       // ✔ array
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
