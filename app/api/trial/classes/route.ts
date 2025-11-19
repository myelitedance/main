import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy that calls the existing Akada integration at /api/elite/classes
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const age = searchParams.get("age") || "";

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/elite/classes?age=${age}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error || "Failed to load classes" },
        { status: res.status }
      );
    }

    return NextResponse.json({ classes: json.classes || [] });
  } catch (err: any) {
    console.error("Trial classes proxy error:", err);
    return NextResponse.json(
      { error: "Error loading class list" },
      { status: 500 }
    );
  }
}
