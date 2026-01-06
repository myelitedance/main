import { sql } from "@/lib/db";
import DashboardClient from "./DashboardClient";
import type { DashboardRow } from "@/lib/types/dashboard";

// ----------------------------
// Helpers
// ----------------------------
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "true" || v === "t" || v === "1";
  return false;
}

function toString(v: unknown, fieldName: string): string {
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Dashboard query missing/invalid field: ${fieldName}`);
}

function toNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  throw new Error("Expected string or null");
}

// ----------------------------
// Page
// ----------------------------
export default async function DashboardPage() {
  const rows = await sql`
    WITH registered AS (
      SELECT
        pr.student_id,
        s.first_name,
        s.last_name
      FROM performance_registrations pr
      JOIN students s ON s.id = pr.student_id
      WHERE pr.performance_id = 'af7ee279-ee4e-4a91-83ef-36f95e78fa11'
    ),
    measurements AS (
      SELECT
        me.id AS measurement_event_id,
        me.student_id,
        me.height_in,
        me.photo_url
      FROM measurement_events me
      WHERE me.performance_id = 'af7ee279-ee4e-4a91-83ef-36f95e78fa11'
    ),
    required AS (
      SELECT
        mv.measurement_event_id,
        MAX(CASE WHEN mt.code = 'SHOE_SIZE' THEN 1 ELSE 0 END) AS has_shoe_size,
        MAX(CASE WHEN mt.code = 'GIRTH' THEN 1 ELSE 0 END)     AS has_girth
      FROM measurement_values mv
      JOIN measurement_types mt ON mt.id = mv.measurement_type_id
      GROUP BY mv.measurement_event_id
    )
    SELECT
      r.student_id,
      r.first_name,
      r.last_name,
      m.measurement_event_id,

      m.height_in IS NOT NULL                    AS has_height,
      COALESCE(req.has_shoe_size, 0) = 1         AS has_shoe_size,
      COALESCE(req.has_girth, 0) = 1             AS has_girth,
      m.photo_url IS NOT NULL                    AS has_photo,

      (
        m.height_in IS NOT NULL
        AND COALESCE(req.has_shoe_size, 0) = 1
        AND COALESCE(req.has_girth, 0) = 1
        AND m.photo_url IS NOT NULL
      ) AS is_complete
    FROM registered r
    LEFT JOIN measurements m ON m.student_id = r.student_id
    LEFT JOIN required req ON req.measurement_event_id = m.measurement_event_id
    ORDER BY r.last_name, r.first_name;
  `;

  const data: DashboardRow[] = rows.map((r) => ({
    measurement_event_id: toNullableString(r.measurement_event_id),
    student_id: toString(r.student_id, "student_id"),
    first_name: toString(r.first_name, "first_name"),
    last_name: toString(r.last_name, "last_name"),

    has_height: toBool(r.has_height),
    has_shoe_size: toBool(r.has_shoe_size),
    has_girth: toBool(r.has_girth),
    has_photo: toBool(r.has_photo),

    is_complete: toBool(r.is_complete),
  }));

  return <DashboardClient data={data} />;
}
