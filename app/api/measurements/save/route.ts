import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { studentId, measurements } = body;

    if (
      !studentId ||
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

    // 1️⃣ Create measurement event
    const eventRes = await client.query(
      `
      INSERT INTO measurement_events
        (student_id, performance_id, recorded_by)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [studentId, "2026", "admin"]
    );

    const eventId = eventRes.rows[0].id;

    // 2️⃣ Load measurement types
    const typesRes = await client.query(`
      SELECT id, code FROM measurement_types
    `);

    const typeMap: Record<string, string> = {};
    for (const row of typesRes.rows) {
      typeMap[row.code] = row.id;
    }

    // 3️⃣ Build values
    const values = [
      { code: "GIRTH", value: measurements.girth },
      { code: "HIPS", value: measurements.hips },
      { code: "SHOE_SIZE", value: measurements.shoeSize },
      ...(measurements.waist != null
        ? [{ code: "WAIST", value: measurements.waist }]
        : []),
      ...(measurements.bust != null
        ? [{ code: "BUST", value: measurements.bust }]
        : []),
    ];

    // 4️⃣ Insert values
    for (const v of values) {
      await client.query(
        `
        INSERT INTO measurement_values
          (measurement_event_id, measurement_type_id, value)
        VALUES ($1, $2, $3)
        `,
        [eventId, typeMap[v.code], v.value]
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
