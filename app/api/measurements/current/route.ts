import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

const REQUIRED_CODES = ['GIRTH', 'HIPS', 'SHOE_SIZE']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json(
      { error: 'studentId is required' },
      { status: 400 }
    )
  }

  const client = await pool.connect()

  try {
    // 1️⃣ Resolve internal student
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

    // 2️⃣ Resolve active performance
    const perfRes = await client.query(
      `
      SELECT id
      FROM performances
      WHERE status = 'measuring'
      ORDER BY created_at DESC
      LIMIT 1
      `
    )

    if (perfRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active performance' },
        { status: 404 }
      )
    }

    const performanceId = perfRes.rows[0].id

    // 3️⃣ Get latest non-superseded measurement event
    const eventRes = await client.query(
      `
      SELECT
        me.id,
        me.height_in,
        me.photo_url,
        me.recorded_at
      FROM measurement_events me
      WHERE me.student_id = $1
        AND me.performance_id = $2
        AND me.superseded_by_event_id IS NULL
      ORDER BY me.recorded_at DESC
      LIMIT 1
      `,
      [student.id, performanceId]
    )

    if (eventRes.rows.length === 0) {
      return NextResponse.json({
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
        },
        performance: { id: performanceId },
        measurementEvent: null,
        derived: {
          isComplete: false,
          missingFields: REQUIRED_CODES,
          hasPhoto: false,
          canAddMissing: false,
          canPhotoOnly: false,
          canRemeasureFull: false,
        },
      })
    }

    const event = eventRes.rows[0]

    // 4️⃣ Load measurement values
    const valuesRes = await client.query(
      `
      SELECT mt.code, mv.value
      FROM measurement_values mv
      JOIN measurement_types mt ON mt.id = mv.measurement_type_id
      WHERE mv.measurement_event_id = $1
      `,
      [event.id]
    )

    const values: Record<string, number> = {}
    const existingCodes = new Set<string>()

    for (const row of valuesRes.rows) {
      values[row.code] = row.value
      existingCodes.add(row.code)
    }

    // 5️⃣ Compute completeness
    const missingRequired = REQUIRED_CODES.filter(
      code => !existingCodes.has(code)
    )

    const isComplete =
      missingRequired.length === 0 && event.height_in != null

    const hasPhoto = !!event.photo_url

    // 6️⃣ Derive allowed actions
    const canAddMissing = !isComplete
    const canPhotoOnly = isComplete && !hasPhoto
    const canRemeasureFull = true

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
      },
      performance: {
        id: performanceId,
      },
      measurementEvent: {
        id: event.id,
        heightIn: event.height_in,
        photoUrl: event.photo_url,
        recordedAt: event.recorded_at,
        values,
      },
      derived: {
        isComplete,
        missingFields: missingRequired,
        hasPhoto,
        canAddMissing,
        canPhotoOnly,
        canRemeasureFull,
      },
    })
  } catch (err) {
    console.error('Failed to load current measurements:', err)
    return NextResponse.json(
      { error: 'Failed to load measurements' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
