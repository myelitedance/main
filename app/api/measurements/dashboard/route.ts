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

    // 2️⃣ Get all students
    const studentsRes = await client.query(`
      SELECT id, external_id, first_name, last_name
      FROM students
      ORDER BY last_name, first_name
    `)

    // 3️⃣ Get COMPLETED measurements only
    const completedRes = await client.query(
      `
      SELECT
        mec.student_id,
        mec.completed_at
      FROM measurement_event_completeness mec
      WHERE mec.performance_id = $1
      `,
      [performanceId]
    )

    const completedMap = new Map(
      completedRes.rows.map((r) => [r.student_id, r])
    )

    const measured: any[] = []
    const unmeasured: any[] = []

    for (const s of studentsRes.rows) {
      const completed = completedMap.get(s.id)

      if (completed) {
        measured.push({
          studentId: s.external_id,
          firstName: s.first_name,
          lastName: s.last_name,
          measuredAt: completed.completed_at,
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
