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
    s.external_id,
    s.first_name,
    s.last_name
  FROM performance_registrations pr
  JOIN students s ON s.id = pr.student_id
  WHERE pr.performance_id = 'af7ee279-ee4e-4a91-83ef-36f95e78fa11'
),

measurement_base AS (
  SELECT
    me.id                AS measurement_event_id,
    me.student_id,
    me.height_in,
    me.photo_url
  FROM measurement_events me
  WHERE me.performance_id = 'af7ee279-ee4e-4a91-83ef-36f95e78fa11'
),

measurement_flags AS (
  SELECT
    me.student_id,

    -- height + photo live on measurement_events
    MAX(me.height_in IS NOT NULL)::boolean AS has_height,
    MAX(me.photo_url IS NOT NULL)::boolean AS has_photo,

    -- values live in measurement_values
    MAX(mt.code = 'SHOE_SIZE') AS has_shoe_size,
    MAX(mt.code = 'GIRTH')     AS has_girth
  FROM measurement_events me
  LEFT JOIN measurement_values mv
    ON mv.measurement_event_id = me.id
  LEFT JOIN measurement_types mt
    ON mt.id = mv.measurement_type_id
  WHERE me.performance_id = 'af7ee279-ee4e-4a91-83ef-36f95e78fa11'
  GROUP BY me.student_id
)

SELECT
  r.student_id,
  r.external_id,
  r.first_name,
  r.last_name,

  mb.measurement_event_id,

  COALESCE(mf.has_height, false)     AS has_height,
  COALESCE(mf.has_shoe_size, false)  AS has_shoe_size,
  COALESCE(mf.has_girth, false)      AS has_girth,
  COALESCE(mf.has_photo, false)      AS has_photo,

  (
    COALESCE(mf.has_height, false)
    AND COALESCE(mf.has_shoe_size, false)
    AND COALESCE(mf.has_girth, false)
    AND COALESCE(mf.has_photo, false)
  ) AS is_complete

FROM registered r
LEFT JOIN measurement_base mb
  ON mb.student_id = r.student_id
LEFT JOIN measurement_flags mf
  ON mf.student_id = r.student_id
ORDER BY r.last_name, r.first_name;

  `;

  const data: DashboardRow[] = rows.map((r) => ({
    measurement_event_id: toNullableString(r.measurement_event_id),
    student_id: toString(r.student_id, "student_id"),
    external_id: toString(r.external_id, "external_id"),
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
