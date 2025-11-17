import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName } = body || {};

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing firstName or lastName" },
        { status: 400 }
      );
    }

    // Fetch raw student list (server-side only)
    const res = await akadaFetch("/studio/students", { method: "GET" });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Akada error ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const j = JSON.parse(text);

    // Explicitly typed array
    const raw: any[] =
      j?.returnValue?.currentPageItems ||
      j?.returnValue ||
      [];

    // Normalize each student (explicitly type `s` as `any`)
    const normalized = raw.map((s: any) => ({
      studentId: String(s.id ?? s.studentId ?? ""),
      studentFirstName: String(
        s.fName ?? s.firstName ?? s.studentFirstName ?? ""
      ).trim(),
      studentLastName: String(
        s.lName ?? s.lastName ?? s.studentLastName ?? ""
      ).trim(),
      accountEmail: String(s.accountEmail ?? s.email ?? "").trim(),
      accountName: String(
        s.accountName ??
          `${s.parentFirstName || ""} ${s.parentLastName || ""}`
      ).trim(),
    }));

    // Exact match
    const matches = normalized.filter((s: any) =>
      s.studentFirstName.toLowerCase() === firstName.toLowerCase() &&
      s.studentLastName.toLowerCase() === lastName.toLowerCase()
    );

    return NextResponse.json(matches);
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
