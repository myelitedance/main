import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const age = searchParams.get("age") || "";

    // Always resolve origin dynamically — works on desktop, mobile, Vercel, anywhere
    const origin = req.nextUrl.origin;

    const res = await fetch(`${origin}/api/elite/classes?age=${age}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error || "Failed to load classes" },
        { status: res.status }
      );
    }

    return NextResponse.json({ classes: json.classes || [] });
  } catch (error: any) {
    console.error("Trial classes proxy error:", error);
    return NextResponse.json(
      { error: "Error loading class list" },
      { status: 500 }
    );
  }
}
