import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const client = await pool.connect()

  try {
    // 1️⃣ Get active performance
    const performanceRes = await client.query(`
      SELECT id
      FROM performances
      WHERE status = 'measuring'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    if (performanceRes.rows.length === 0) {
      return NextResponse.json({ measured: [], unmeasured: [] })
    }

    const performanceId = performanceRes.rows[0].id

    // 2️⃣ Get all students (already filtered upstream)
    const studentsRes = await client.query(`
      SELECT id, external_id, first_name, last_name
      FROM students
      ORDER BY last_name, first_name
    `)

    // 3️⃣ Get latest measurement per student for this performance
    const measurementsRes = await client.query(
      `
      SELECT DISTINCT ON (student_id)
        student_id,
        height_in,
        photo_url,
        created_at
      FROM measurement_events
      WHERE performance_id = $1
      ORDER BY student_id, created_at DESC
      `,
      [performanceId]
    )

    const measurementMap = new Map(
      measurementsRes.rows.map((m) => [m.student_id, m])
    )

    const measured: any[] = []
    const unmeasured: any[] = []

    for (const s of studentsRes.rows) {
      const m = measurementMap.get(s.id)

      if (m) {
        measured.push({
          studentId: s.external_id,
          firstName: s.first_name,
          lastName: s.last_name,
          height: m.height_in,
          hasPhoto: Boolean(m.photo_url),
          measuredAt: m.created_at,
        })
      } else {
        unmeasured.push({
          studentId: s.external_id,
          firstName: s.first_name,
          lastName: s.last_name,
        })
      }
    }

    return NextResponse.json({ measured, unmeasured })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Failed to load measurement dashboard' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
