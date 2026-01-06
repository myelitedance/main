import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { studentId: string } }
) {
  const client = await pool.connect()

  try {
    const { studentId } = params

    // 1️⃣ Get active performance
    const perfRes = await client.query(`
      SELECT id
      FROM performances
      WHERE status = 'measuring'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    if (perfRes.rows.length === 0) {
      return NextResponse.json({ error: 'No active performance' }, { status: 404 })
    }

    const performanceId = perfRes.rows[0].id

    // 2️⃣ Get student
    const studentRes = await client.query(
      `
      SELECT id, first_name, last_name
      FROM students
      WHERE external_id = $1
      `,
      [studentId]
    )

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const student = studentRes.rows[0]

    // 3️⃣ Get latest measurement event
    const measurementRes = await client.query(
      `
      SELECT
        height_in,
        photo_url,
        recorded_at
      FROM measurement_events
      WHERE student_id = $1
        AND performance_id = $2
      ORDER BY recorded_at DESC
      LIMIT 1
      `,
      [student.id, performanceId]
    )

    const measurement = measurementRes.rows[0] || null

    return NextResponse.json({
      student: {
        firstName: student.first_name,
        lastName: student.last_name,
      },
      measurement: measurement
        ? {
            heightIn: measurement.height_in,
            hasPhoto: Boolean(measurement.photo_url),
            recordedAt: measurement.recorded_at,
          }
        : null,
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
