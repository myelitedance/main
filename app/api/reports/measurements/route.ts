import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


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
  WITH latest_event AS (
    SELECT DISTINCT ON (me.student_id)
      me.id,
      me.student_id,
      me.height_in,
      me.photo_url
    FROM measurement_events me
    WHERE me.performance_id = ${performanceId}
    ORDER BY me.student_id, me.recorded_at DESC
  )

  SELECT
    s.external_id,
    s.first_name,
    s.last_name,
    le.height_in,

    MAX(CASE WHEN mt.code = 'SHOE_SIZE' THEN mv.value END) AS shoe_size,
    MAX(CASE WHEN mt.code = 'GIRTH' THEN mv.value END)     AS girth,
    MAX(CASE WHEN mt.code = 'HIPS' THEN mv.value END)     AS hips

  FROM performance_registrations pr
  JOIN students s
    ON s.id = pr.student_id

  LEFT JOIN latest_event le
    ON le.student_id = s.id

  LEFT JOIN measurement_values mv
    ON mv.measurement_event_id = le.id

  LEFT JOIN measurement_types mt
    ON mt.id = mv.measurement_type_id

  WHERE pr.performance_id = ${performanceId}

  GROUP BY
    s.external_id,
    s.first_name,
    s.last_name,
    le.height_in

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
  { header: "Hips", key: "hips", width: 10 },
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
