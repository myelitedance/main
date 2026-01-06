import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

// DB → UI key normalization
const MEASUREMENT_KEY_MAP: Record<string, string> = {
  height: 'heightIn',
  girth: 'girth',
  hips: 'hips',
  shoe_size: 'shoeSize',
  waist: 'waist',
  bust: 'bust',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params

  const client = await pool.connect()

  try {
    /* 1️⃣ Active performance */
    const perfRes = await client.query(`
      SELECT id
      FROM performances
      WHERE status = 'measuring'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    if (perfRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active performance' },
        { status: 404 }
      )
    }

    const performanceId = perfRes.rows[0].id

    /* 2️⃣ Student */
    const studentRes = await client.query(
      `
      SELECT id, first_name, last_name
      FROM students
      WHERE external_id = $1
      `,
      [studentId]
    )

    if (studentRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const student = studentRes.rows[0]

    /* 3️⃣ Latest measurement event + values */
    const measurementRes = await client.query(
      `
      SELECT
        me.id                AS event_id,
        me.recorded_at,
        me.photo_url,
        mt.code              AS measurement_key,
        mv.value
      FROM measurement_events me
      LEFT JOIN measurement_values mv
        ON mv.measurement_event_id = me.id
      LEFT JOIN measurement_types mt
        ON mt.id = mv.measurement_type_id
      WHERE me.student_id = $1
        AND me.performance_id = $2
      ORDER BY me.recorded_at DESC
      `,
      [student.id, performanceId]
    )

    if (measurementRes.rows.length === 0) {
      return NextResponse.json({
        student: {
          firstName: student.first_name,
          lastName: student.last_name,
        },
        measurement: null,
      })
    }

    /* 4️⃣ Collapse rows → single measurement object */
    const base = measurementRes.rows[0]

    const values: Record<string, number> = {}

    for (const row of measurementRes.rows) {
      if (!row.measurement_key) continue

      const mappedKey = MEASUREMENT_KEY_MAP[row.measurement_key]
      if (mappedKey) {
        values[mappedKey] = Number(row.value)
      }
    }

    return NextResponse.json({
      student: {
        firstName: student.first_name,
        lastName: student.last_name,
      },
      measurement: {
        ...values,
        hasPhoto: Boolean(base.photo_url),
        photoUrl: base.photo_url,
        recordedAt: base.recorded_at,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Failed to load student measurement' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
