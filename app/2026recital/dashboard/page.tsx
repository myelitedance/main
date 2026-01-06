import { sql } from "@/lib/db";
import DashboardClient from "./DashboardClient";

type DashboardRow = {
  measurement_event_id: string;
  student_id: string;
  first_name: string;
  last_name: string;

  has_height: boolean;
  has_shoe_size: boolean;
  has_girth: boolean;
  has_photo: boolean;

  is_complete: boolean;
};

function toBool(v: unknown): boolean {
  // neon/postgres typically returns boolean as boolean, but guard anyway
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "true" || v === "t" || v === "1";
  return false;
}

function toString(v: unknown, fieldName: string): string {
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Dashboard query missing/invalid field: ${fieldName}`);
}

export default async function DashboardPage() {
  const rows = await sql`
    WITH base AS (
      SELECT
        me.id                  AS measurement_event_id,
        me.student_id,
        me.performance_id,
        me.height_in,
        me.photo_url,
        s.first_name,
        s.last_name
      FROM measurement_events me
      JOIN students s ON s.id = me.student_id
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
      b.measurement_event_id,
      b.student_id,
      b.first_name,
      b.last_name,

      b.height_in IS NOT NULL                    AS has_height,
      COALESCE(r.has_shoe_size, 0) = 1           AS has_shoe_size,
      COALESCE(r.has_girth, 0) = 1               AS has_girth,
      b.photo_url IS NOT NULL                    AS has_photo,

      (
        b.height_in IS NOT NULL
        AND COALESCE(r.has_shoe_size, 0) = 1
        AND COALESCE(r.has_girth, 0) = 1
        AND b.photo_url IS NOT NULL
      ) AS is_complete
    FROM base b
    LEFT JOIN required r ON r.measurement_event_id = b.measurement_event_id
    ORDER BY b.last_name, b.first_name;
  `;

  // Convert unknown DB rows -> strongly typed DashboardRow[]
  const data: DashboardRow[] = rows.map((r) => ({
    measurement_event_id: toString(r.measurement_event_id, "measurement_event_id"),
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
