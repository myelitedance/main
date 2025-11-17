import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

let cache: { data: any[]; exp: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export async function GET() {
  try {
    // use cached list if still valid
    if (cache && cache.exp > Date.now()) {
      return NextResponse.json(cache.data);
    }

    // Akada endpoint
    const res = await akadaFetch(`/studio/students`, { method: "GET" });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Akada students ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const j = JSON.parse(text);

    // Support multiple possible formats
    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize student object to a stable shape
    const normalized = raw.map((s) => ({
      studentId: String(s.id ?? s.studentId ?? ""),
      studentFirstName: String(s.fName ?? s.firstName ?? s.studentFirstName ?? "").trim(),
      studentLastName: String(s.lName ?? s.lastName ?? s.studentLastName ?? "").trim(),
      accountEmail: String(s.accountEmail ?? s.email ?? "").trim(),
      accountName: String(s.accountName ?? `${s.parentFirstName || ""} ${s.parentLastName || ""}`).trim(),
    }));

    // Cache
    cache = { data: normalized, exp: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("students API error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
