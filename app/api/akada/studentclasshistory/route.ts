import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

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
    // Akada endpoint for student class history
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

    // Support both formats
    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize fields your StepClassSelect expects
    const normalized = raw.map((c) => ({
      classId: String(c.classId ?? c.id ?? ""),
      className: String(c.className ?? c.description ?? "").trim(),
      sessionId: String(c.sessionId ?? c.session_id ?? ""),
      startDate: c.startDate ?? c.start_date ?? null,
      endDate: c.endDate ?? c.end_date ?? null,
    }));

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("student class history API error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
