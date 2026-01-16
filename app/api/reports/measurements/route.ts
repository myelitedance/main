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
  s.external_id,
  s.first_name,
  s.last_name,

  MAX(CASE WHEN mv.measurement_key = 'height' THEN mv.numeric_value END)     AS height_in,
  MAX(CASE WHEN mv.measurement_key = 'shoe_size' THEN mv.numeric_value END) AS shoe_size,
  MAX(CASE WHEN mv.measurement_key = 'girth' THEN mv.numeric_value END)      AS girth,
  MAX(CASE WHEN mv.measurement_key = 'waist' THEN mv.numeric_value END)      AS waist

FROM performance_registrations pr
JOIN students s
  ON s.id = pr.student_id

LEFT JOIN measurement_events me
  ON me.student_id = s.id
 AND me.performance_id = pr.performance_id
 AND me.is_active = true

LEFT JOIN measurement_values mv
  ON mv.measurement_event_id = me.id

WHERE pr.performance_id = $1

GROUP BY
  s.external_id,
  s.first_name,
  s.last_name

ORDER BY
  s.last_name,
  s.first_name;

  `;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Measurements");

  sheet.columns = [
  { header: "External ID", key: "external_id", width: 18 },
  { header: "First Name", key: "first_name", width: 14 },
  { header: "Last Name", key: "last_name", width: 14 },
  { header: "Height", key: "height_in", width: 12 },
  { header: "Shoe Size", key: "shoe_size", width: 12 },
  { header: "Girth", key: "girth", width: 10 },
  { header: "Waist", key: "waist", width: 10 },
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
