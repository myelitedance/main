import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type StudentRow = {
  id: string;
  external_id: string;
  first_name: string;
  last_name: string;
};

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

  // 1️⃣ Check local DB
  const existing = (await sql`
    SELECT id, external_id, first_name, last_name
    FROM students
    WHERE external_id = ${externalId}
    LIMIT 1
  `) as StudentRow[];

  if (existing.length > 0) {
    return NextResponse.json(existing[0]);
  }

  // 2️⃣ Fetch from Akada
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

  // 3️⃣ Insert into DB
  const inserted = (await sql`
    INSERT INTO students (external_id, first_name, last_name)
    VALUES (${student.external_id}, ${student.first_name}, ${student.last_name})
    RETURNING id, external_id, first_name, last_name
  `) as StudentRow[];

  return NextResponse.json(inserted[0]);
}
