import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { studentId, measurements } = body;

    // 0️⃣ Validate payload shape
    if (
      !studentId ||
      !measurements ||
      measurements.height == null ||
      measurements.girth == null ||
      measurements.hips == null ||
      measurements.shoeSize == null
    ) {
      return NextResponse.json(
        { error: "Missing required measurement fields" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1️⃣ Resolve internal student UUID from external (Akada) ID
    const studentRes = await client.query(
      `
      SELECT id
      FROM students
      WHERE external_id = $1
      `,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      throw new Error("Student not found in local database");
    }

    const internalStudentId = studentRes.rows[0].id;
// Resolve internal performance UUID
// Resolve active performance (must be in measuring state)
const performanceRes = await client.query(
  `
  SELECT id
  FROM performances
  WHERE status = 'measuring'
  LIMIT 1
  `
);

if (performanceRes.rows.length === 0) {
  throw new Error("No active performance in measuring state");
}

const performanceId = performanceRes.rows[0].id;


    const recordedBy = "admin";

    // 2️⃣ Prevent duplicate measurements for same student + performance
    const existingEvent = await client.query(
      `
      SELECT id
      FROM measurement_events
      WHERE student_id = $1
        AND performance_id = $2
      LIMIT 1
      `,
      [internalStudentId, performanceId]
    );

    if (existingEvent.rows.length > 0) {
      throw new Error("Measurements already recorded for this student");
    }

    // 3️⃣ Create measurement event
    const eventRes = await client.query(
      `
      INSERT INTO measurement_events
        (student_id, performance_id, recorded_by, height_in)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [internalStudentId, performanceId, recordedBy, measurements.height]
    );

    const eventId = eventRes.rows[0].id;

    // 4️⃣ Load measurement types
    const typesRes = await client.query(`
      SELECT id, code FROM measurement_types
    `);

    const typeMap: Record<string, string> = {};
    for (const row of typesRes.rows) {
      typeMap[row.code] = row.id;
    }

    // 5️⃣ Ensure required measurement types exist
    const requiredCodes = ["GIRTH", "HIPS", "SHOE_SIZE"];
    for (const code of requiredCodes) {
      if (!typeMap[code]) {
        throw new Error(`Missing measurement type: ${code}`);
      }
    }

    // 6️⃣ Build measurement values (required + optional)
    const values: { code: string; value: number }[] = [
      { code: "GIRTH", value: measurements.girth },
      { code: "HIPS", value: measurements.hips },
      { code: "SHOE_SIZE", value: measurements.shoeSize },
    ];

    if (measurements.waist != null) {
      values.push({ code: "WAIST", value: measurements.waist });
    }

    if (measurements.bust != null) {
      values.push({ code: "BUST", value: measurements.bust });
    }

    // 7️⃣ Insert measurement values
    for (const v of values) {
      const typeId = typeMap[v.code];
      if (!typeId) {
        throw new Error(`Unknown measurement type: ${v.code}`);
      }

      await client.query(
        `
        INSERT INTO measurement_values
          (measurement_event_id, measurement_type_id, value)
        VALUES ($1, $2, $3)
        `,
        [eventId, typeId, v.value]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Measurement save failed:", err);

    return NextResponse.json(
      { error: "Failed to save measurements" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
