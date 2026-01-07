import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { uploadImage } from '@/lib/storage'

export const runtime = 'nodejs'

type UpdateType = 'PHOTO_ONLY' | 'ADD_MISSING' | 'REMEASURE_FULL'
const REQUIRED_CODES = ['GIRTH', 'HIPS', 'SHOE_SIZE']

export async function POST(req: Request) {
  const client = await pool.connect()

  try {
    const formData = await req.formData()

    const studentId = formData.get('studentId') as string | null
    const performanceId = formData.get('performanceId') as string | null
    const previousEventId = formData.get('previousEventId') as string | null
    const updateType = formData.get('updateType') as UpdateType | null
    const measurementsRaw = formData.get('measurements') as string | null
    const photo = formData.get('photo') as File | null

    const confirmReMeasure = formData.get('confirmReMeasure') === 'true'
    const verificationReason =
      formData.get('verificationReason') as string | null

    if (!studentId || !performanceId || !previousEventId || !updateType) {
      return NextResponse.json({ error: 'Missing identifiers' }, { status: 400 })
    }

    if (
      updateType === 'REMEASURE_FULL' &&
      (!confirmReMeasure || !verificationReason)
    ) {
      return NextResponse.json(
        { error: 'Confirmation + reason required' },
        { status: 400 }
      )
    }

    const measurements = measurementsRaw ? JSON.parse(measurementsRaw) : {}

    await client.query('BEGIN')

    /* 1️⃣ Resolve internal student */
    const studentRes = await client.query(
      `SELECT id FROM students WHERE external_id = $1`,
      [studentId]
    )
    if (!studentRes.rowCount) throw new Error('Student not found')
    const internalStudentId = studentRes.rows[0].id

    /* 2️⃣ Load active previous event */
    const prevEventRes = await client.query(
      `
      SELECT *
      FROM measurement_events
      WHERE id = $1
        AND student_id = $2
        AND is_active = true
      `,
      [previousEventId, internalStudentId]
    )

    if (!prevEventRes.rowCount) {
      return NextResponse.json(
        { error: 'Previous event not active' },
        { status: 409 }
      )
    }

    const prevEvent = prevEventRes.rows[0]

    /* 3️⃣ Validate update type */
    if (updateType === 'PHOTO_ONLY') {
      if (!photo) {
        return NextResponse.json({ error: 'Photo required' }, { status: 400 })
      }
      if (prevEvent.photo_url) {
        return NextResponse.json(
          { error: 'Photo already exists' },
          { status: 409 }
        )
      }
    }

    if (updateType === 'REMEASURE_FULL') {
      for (const code of REQUIRED_CODES) {
        if (measurements[code.toLowerCase()] == null) {
          return NextResponse.json(
            { error: 'Missing required measurements' },
            { status: 400 }
          )
        }
      }
    }

    /* 4️⃣ Deactivate previous event */
    await client.query(
      `
      UPDATE measurement_events
      SET is_active = false
      WHERE id = $1
      `,
      [previousEventId]
    )

    /* 5️⃣ Upload photo */
    let photoUrl: string | null = null
    if (photo) {
      photoUrl = await uploadImage(
        photo,
        `measurements/${studentId}-${Date.now()}`
      )
    }

    /* 6️⃣ Insert new event */
    const newEventRes = await client.query(
      `
      INSERT INTO measurement_events
        (student_id, performance_id, recorded_by, height_in, photo_url, verification_reason, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id
      `,
      [
        internalStudentId,
        performanceId,
        'admin',
        measurements.height ?? prevEvent.height_in,
        photoUrl,
        verificationReason,
      ]
    )

    const newEventId = newEventRes.rows[0].id

    /* 7️⃣ Insert measurement values */
    if (updateType !== 'PHOTO_ONLY') {
      const types = await client.query(
        `SELECT id, code FROM measurement_types`
      )
      const typeMap = Object.fromEntries(
        types.rows.map(r => [r.code, r.id])
      )

      for (const [key, value] of Object.entries(measurements)) {
        if (value == null || key === 'height') continue

        await client.query(
          `
          INSERT INTO measurement_values
            (measurement_event_id, measurement_type_id, value)
          VALUES ($1, $2, $3)
          `,
          [newEventId, typeMap[key.toUpperCase()], value]
        )
      }
    }

    await client.query('COMMIT')

    return NextResponse.json({ success: true, newEventId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Measurement update failed:', err)
    return NextResponse.json(
      { error: 'Failed to update measurements' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
