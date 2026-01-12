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

async function ensurePerformanceRegistration(studentId: string) {
  await sql`
    INSERT INTO performance_registrations (
      performance_id,
      student_id,
      source
    )
    SELECT id, ${studentId}, 'akada-search'
    FROM performances
    WHERE status = 'active'
    ON CONFLICT (performance_id, student_id)
    DO NOTHING
  `;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ externalId: string }> }
) {
  const { externalId } = await context.params;

  if (!externalId) {
    return NextResponse.json({ error: "Missing externalId" }, { status: 400 });
  }

  // 1️⃣ Check local DB
  const existing = (await sql`
    SELECT id, external_id, first_name, last_name
    FROM students
    WHERE external_id = ${externalId}
    LIMIT 1
  `) as StudentRow[];

  if (existing.length > 0) {
    await ensurePerformanceRegistration(existing[0].id);
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
  const raw =
    j?.returnValue?.currentPageItems ??
    j?.returnValue ??
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

  // 3️⃣ Insert student
  const inserted = (await sql`
    INSERT INTO students (external_id, first_name, last_name)
    VALUES (
      ${String(match.id ?? match.studentId)},
      ${String(match.fName ?? match.firstName ?? match.studentFirstName ?? "").trim()},
      ${String(match.lName ?? match.lastName ?? match.studentLastName ?? "").trim()}
    )
    RETURNING id, external_id, first_name, last_name
  `) as StudentRow[];

  // 4️⃣ Enforce performance membership
  await ensurePerformanceRegistration(inserted[0].id);

  return NextResponse.json(inserted[0]);
}
