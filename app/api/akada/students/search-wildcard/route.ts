import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body || {};

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const q = query.toLowerCase().trim();

    // Fetch full student list (Akada has no wildcard support)
    const res = await akadaFetch("/studio/students", { method: "GET" });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Akada error ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const j = JSON.parse(text);

    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize (same logic as exact search)
    const normalized = raw.map((s: any) => ({
      studentId: String(s.id ?? s.studentId ?? ""),
      studentFirstName: String(
        s.fName ?? s.firstName ?? s.studentFirstName ?? ""
      ).trim(),
      studentLastName: String(
        s.lName ?? s.lastName ?? s.studentLastName ?? ""
      ).trim(),
    }));

    // 🔑 Wildcard filter (first OR last name)
    const matches = normalized.filter((s) =>
      s.studentFirstName.toLowerCase().includes(q) ||
      s.studentLastName.toLowerCase().includes(q)
    );

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("Wildcard student search error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
