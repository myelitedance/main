import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// Hard-coded session ID for recital classes
const SESSION_ID = 27450; // Note: numeric here because Akada returns numeric

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json(
      { error: "Missing studentId parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await akadaFetch(
      `/studio/studentclasshistory/student/${studentId}`,
      { method: "GET" }
    );

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Akada class history ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const j = JSON.parse(text);

    // Akada wraps differently depending on payload size
    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize to what the frontend expects
    const normalized = raw.map((c: any) => ({
      classId: String(c.classId ?? c.id ?? ""),           // Always string
      className: String(c.classDisplayName ?? "").trim(), // Use Akada’s official display name
      sessionId: String(c.sessionId ?? ""),               // Convert to string for UI comparison
      startDate: c.startDate ?? null,
      endDate: c.stopDate ?? null,
    }));

    // Only include classes for the recital session
    const filtered = normalized.filter(
      (c: any) => Number(c.sessionId) === SESSION_ID
    );

    return NextResponse.json(filtered);
  } catch (err: any) {
    console.error("student class history API error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
