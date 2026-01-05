import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";
import { db } from "@/lib/db"; // adjust to your db helper

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { externalId: string } }
) {
  const externalId = params.externalId;

  if (!externalId) {
    return NextResponse.json(
      { error: "Missing externalId" },
      { status: 400 }
    );
  }

  // 1️⃣ Try local DB first
  const existing = await db
    .selectFrom("students")
    .selectAll()
    .where("external_id", "=", externalId)
    .executeTakeFirst();

  if (existing) {
    return NextResponse.json(existing);
  }

  // 2️⃣ Not found locally → fetch from Akada
  const res = await akadaFetch("/studio/students", { method: "GET" });
  const text = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { error: `Akada error ${res.status}: ${text}` },
      { status: 500 }
    );
  }

  const j = JSON.parse(text);
  const raw: any[] =
    j?.returnValue?.currentPageItems ||
    j?.returnValue ||
    [];

  const match = raw.find(
    (s: any) =>
      String(s.id ?? s.studentId ?? "") === String(externalId)
  );

  if (!match) {
    return NextResponse.json(
      { error: "Student not found in Akada" },
      { status: 404 }
    );
  }

  const student = {
    external_id: String(match.id ?? match.studentId),
    first_name: String(
      match.fName ?? match.firstName ?? match.studentFirstName ?? ""
    ).trim(),
    last_name: String(
      match.lName ?? match.lastName ?? match.studentLastName ?? ""
    ).trim(),
  };

  // 3️⃣ Insert into local DB
  const inserted = await db
    .insertInto("students")
    .values(student)
    .returningAll()
    .executeTakeFirst();

  return NextResponse.json(inserted);
}
