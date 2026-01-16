import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const performanceId = searchParams.get("performanceId");

  if (!performanceId) {
    return NextResponse.json(
      { error: "Missing performanceId" },
      { status: 400 }
    );
  }

  const rows = await sql`
    SELECT
      s.id AS student_id,
      s.external_id,
      s.first_name,
      s.last_name,
      me.performance_id,
      me.recorded_at,
      me.recorded_by,
      me.height_in,
      (me.photo_url IS NOT NULL) AS has_photo,
      me.verification_confirmed,
      me.verification_reason
    FROM performance_registrations pr
    JOIN students s ON s.id = pr.student_id
    LEFT JOIN measurement_events me
      ON me.student_id = s.id
     AND me.performance_id = pr.performance_id
     AND me.is_active = true
    WHERE pr.performance_id = ${performanceId}
    ORDER BY s.last_name, s.first_name;
  `;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Measurements");

  sheet.columns = [
    { header: "Student ID", key: "student_id", width: 36 },
    { header: "External ID", key: "external_id", width: 20 },
    { header: "First Name", key: "first_name", width: 15 },
    { header: "Last Name", key: "last_name", width: 15 },
    { header: "Performance ID", key: "performance_id", width: 36 },
    { header: "Measured At", key: "recorded_at", width: 20 },
    { header: "Recorded By", key: "recorded_by", width: 18 },
    { header: "Height (in)", key: "height_in", width: 12 },
    { header: "Has Photo", key: "has_photo", width: 10 },
    { header: "Verified", key: "verification_confirmed", width: 10 },
    { header: "Verification Reason", key: "verification_reason", width: 25 },
  ];

  rows.forEach(r => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="measurement-report.xlsx"',
    },
  });
}
