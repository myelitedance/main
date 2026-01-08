import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { uploadImage } from '@/lib/storage'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const client = await pool.connect()

  try {
    const formData = await req.formData()

    const studentId = formData.get('studentId') as string | null
    const measurementsRaw = formData.get('measurements') as string | null
    const photo = formData.get('photo') as File | null

    if (!studentId || !measurementsRaw) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    const measurements = JSON.parse(measurementsRaw)

    if (
      measurements.height == null ||
      measurements.girth == null ||
      measurements.hips == null ||
      measurements.shoeSize == null
    ) {
      return NextResponse.json(
        { error: 'Missing required measurement fields' },
        { status: 400 }
      )
    }

    await client.query('BEGIN')

    // 1️⃣ Lookup internal student UUID
    const studentRes = await client.query(
      `
      SELECT id
      FROM students
      WHERE external_id = $1
      `,
      [studentId]
    )

    if (studentRes.rows.length === 0) {
      throw new Error('Student not found')
    }

    const internalStudentId = studentRes.rows[0].id

    // 2️⃣ Lookup active performance
    const performanceRes = await client.query(
      `
      SELECT id
      FROM performances
      WHERE status = 'measuring'
      ORDER BY created_at DESC
      LIMIT 1
      `
    )

    if (performanceRes.rows.length === 0) {
      throw new Error('No active performance in measuring state')
    }

    const performanceId = performanceRes.rows[0].id

    // 🔒 Guard: prevent duplicate measurements for same student + performance
const existingEventRes = await client.query(
  `
  SELECT id
  FROM measurement_events
  WHERE student_id = $1
    AND performance_id = $2
  LIMIT 1
  `,
  [internalStudentId, performanceId]
)

if (existingEventRes.rows.length > 0) {
  await client.query('ROLLBACK')

  return NextResponse.json(
    {
      error: 'Measurements already exist for this student. Use re-measure flow.',
    },
    { status: 409 }
  )
}
function readableTimestamp() {
  const d = new Date()

  const pad = (n: number) => n.toString().padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
         `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

    // 3️⃣ Upload photo (optional)
    let photoUrl: string | null = null

    if (photo) {
      photoUrl = await uploadImage(
        photo,
        `measurements/${studentId}-${readableTimestamp()}`
      )
    }

    // 4️⃣ Create measurement event
    const eventRes = await client.query(
      `
      INSERT INTO measurement_events
        (student_id, performance_id, recorded_by, height_in, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        internalStudentId,
        performanceId,
        'admin',
        measurements.height,
        photoUrl,
      ]
    )

    const eventId = eventRes.rows[0].id

    // 5️⃣ Load measurement types
    const typesRes = await client.query(`
      SELECT id, code FROM measurement_types
    `)

    const typeMap: Record<string, string> = {}
    for (const row of typesRes.rows) {
      typeMap[row.code] = row.id
    }

    // 6️⃣ Insert measurement values
    const values = [
      { code: 'GIRTH', value: measurements.girth },
      { code: 'HIPS', value: measurements.hips },
      { code: 'SHOE_SIZE', value: measurements.shoeSize },
      ...(measurements.waist != null
        ? [{ code: 'WAIST', value: measurements.waist }]
        : []),
      ...(measurements.bust != null
        ? [{ code: 'BUST', value: measurements.bust }]
        : []),
    ]

    for (const v of values) {
      await client.query(
        `
        INSERT INTO measurement_values
          (measurement_event_id, measurement_type_id, value)
        VALUES ($1, $2, $3)
        `,
        [eventId, typeMap[v.code], v.value]
      )
    }

    await client.query('COMMIT')

    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Measurement save failed:', err)

    return NextResponse.json(
      { error: 'Failed to save measurements' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
