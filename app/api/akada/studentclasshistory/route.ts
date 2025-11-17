import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";
import { recitalPricesByClassId } from "@/data/recitalPrices2026";

export const runtime = "nodejs";

// Hard-coded recital session ID
const SESSION_ID = 27450;

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

    // Handle possible Akada response formats
    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize & filter
    const normalized = raw
      .filter((c: any) => c.isEnrolled === true) // ⭐ only current enrolled classes
      .filter((c: any) => Number(c.sessionId) === SESSION_ID) // ⭐ only this session
      .map((c: any) => ({
        classId: String(c.classId ?? c.id ?? ""),
        className: String(c.classDisplayName ?? "").trim(),
        sessionId: String(c.sessionId ?? ""),
        startDate: c.startDate ?? null,
        endDate: c.stopDate ?? null,
        isEnrolled: Boolean(c.isEnrolled),
        accountEmail: c.accountEmail ?? null,
        accountFirstName: c.accountFirstName ?? null,
        accountLastName: c.accountLastName ?? null,
      }))
      .filter((c: any) => recitalPricesByClassId[c.classId] !== undefined); // ⭐ only recital classes

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("student class history API error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
