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

// Correct pipeline + stage IDs
const PIPELINE_ID = "BKJR7YvccnciXEqOEHJV";
const PIPELINE_STAGE_ID = "0eef5e7d-001b-4b31-8a3c-ce48521c45e7";

// REQUIRED FIELD IDS
const OF = {
  STUDENT_FIRST: "e8iULpr8OOMLyXrg6lfO",
  STUDENT_AGE: "CcjIXBIjx8QMOFrU37rG",
  TRIAL_CLASS: "PeszVlmQTXH1Cx7VpYWU",
};

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
      parentFirstName,
      parentLastName,
      dancerFirstName,
      dancerAge,
      selectedClass,
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Missing contactId for opportunity creation." },
        { status: 400 }
      );
    }

    // Clean & fallback
    const opportunityName =
      parentFirstName && parentLastName
        ? `${parentFirstName} ${parentLastName}`
        : dancerFirstName
        ? `${dancerFirstName} Trial Class Inquiry`
        : "Trial Class Inquiry";

    // Opportunity CFs use: id, key, field_value
    const customFields = [
      {
        id: OF.STUDENT_FIRST,
        key: "opportunity.student__first_name",
        field_value: dancerFirstName || "",
      },
      {
        id: OF.STUDENT_AGE,
        key: "opportunity.student__age",
        field_value: dancerAge ?? "",
      },
      {
        id: OF.TRIAL_CLASS,
        key: "opportunity.trial_class_name",
        field_value: selectedClass?.name || "",
      },
    ];

    const payload = {
      locationId: LOCATION_ID,
      contactId,
      pipelineId: PIPELINE_ID,
      pipelineStageId: PIPELINE_STAGE_ID,
      name: opportunityName,
      status: "open",
      customFields,
    };

    const res = await fetch(`${API}/opportunities/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch {}

    const opportunityId =
      json?.id ||
      json?.opportunity?.id ||
      null;

    if (!res.ok || !opportunityId) {
      console.error("Opportunity Create Error:", json || txt);
      return NextResponse.json(
        { error: json || txt, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ opportunityId });

  } catch (err: any) {
    console.error("Trial Opportunity Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
