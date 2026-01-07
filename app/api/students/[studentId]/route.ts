import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

function normalizeKey(code: string) {
  switch (code) {
    case 'SHOE_SIZE':
      return 'shoeSize'
    default:
      return code.toLowerCase()
  }
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
    if (!perfRes.rowCount) {
      return NextResponse.json({ error: 'No active performance' }, { status: 404 })
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
    if (!studentRes.rowCount) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    const student = studentRes.rows[0]

    /* 3️⃣ All measurement events + values (newest first) */
    const rowsRes = await client.query(
      `
      SELECT
        me.id                AS event_id,
        me.recorded_at,
        me.height_in,
        me.photo_url,
        mt.code              AS measurement_code,
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

    if (!rowsRes.rowCount) {
      return NextResponse.json({
        student: {
          firstName: student.first_name,
          lastName: student.last_name,
        },
        currentMeasurement: null,
        history: [],
      })
    }

    /* 4️⃣ Build history + derived currentMeasurement */
    const historyMap = new Map<string, any>()
    const current: any = {}

    for (const row of rowsRes.rows) {
      // Initialize history event
      if (!historyMap.has(row.event_id)) {
        historyMap.set(row.event_id, {
          eventId: row.event_id,
          recordedAt: row.recorded_at,
          heightIn: row.height_in ?? null,
          photoUrl: row.photo_url ?? null,
          values: {},
        })
      }

      // History values
      if (row.measurement_code) {
        const key = normalizeKey(row.measurement_code)
        historyMap.get(row.event_id).values[key] = Number(row.value)
      }

      // Current derived values (first non-null wins)
      if (current.heightIn == null && row.height_in != null) {
        current.heightIn = Number(row.height_in)
      }

      if (current.photoUrl == null && row.photo_url) {
        current.photoUrl = row.photo_url
      }

      if (row.measurement_code) {
        const key = normalizeKey(row.measurement_code)
        if (current[key] == null && row.value != null) {
          current[key] = Number(row.value)
        }
      }
    }

    const history = Array.from(historyMap.values())

    return NextResponse.json({
      student: {
        firstName: student.first_name,
        lastName: student.last_name,
      },
      currentMeasurement: {
        ...current,
        hasPhoto: Boolean(current.photoUrl),
      },
      history,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Failed to load measurement data' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
