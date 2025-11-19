import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GHL_BASE = "https://services.leadconnectorhq.com"; // your final base URL

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contactId,
      dancerFirstName,
      dancerAge,
      className,
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Missing contact ID" },
        { status: 400 }
      );
    }

    // Build opportunity payload
    const payload = {
      name: `Trial Class – ${dancerFirstName}`,
      contactId,
      pipelineId: process.env.GHL_PIPELINE_ID,  // Must be set in env
      stageId: process.env.GHL_STAGE_ID,        // Must be set in env

      // Custom fields
      customField: {
        student__first_name: dancerFirstName,
        student__age: dancerAge,
        trial_class_name: className,
      }
    };

    const res = await fetch(`${GHL_BASE}/opportunities/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28"    // Required for LeadConnector API
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.id) {
      console.error("GHL opportunity creation failed:", json);
      return NextResponse.json(
        { error: "Failed to create opportunity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ opportunityId: json.id });

  } catch (err: any) {
    console.error("trial opportunity API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
