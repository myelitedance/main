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
    console.log('UPDATE FORM DATA:', {
  studentId: formData.get('studentId'),
  performanceId: formData.get('performanceId'),
  previousEventId: formData.get('previousEventId'),
  updateType: formData.get('updateType'),
  hasPhoto: !!formData.get('photo'),
  measurementsRaw: formData.get('measurements'),
  confirmReMeasure: formData.get('confirmReMeasure'),
  verificationReason: formData.get('verificationReason'),
})


    const studentId = formData.get('studentId') as string | null
    const performanceId = formData.get('performanceId') as string | null
    const previousEventId = formData.get('previousEventId') as string | null
    const updateType = formData.get('updateType') as UpdateType | null
    const measurementsRaw = formData.get('measurements') as string | null
    const photo = formData.get('photo') as File | null

    const confirmReMeasure =
      formData.get('confirmReMeasure') === 'true'
    const verificationReason =
      formData.get('verificationReason') as string | null

    if (!studentId || !performanceId || !previousEventId || !updateType) {
      return NextResponse.json(
        { error: 'Missing required identifiers' },
        { status: 400 }
      )
    }

    if (
      updateType === 'REMEASURE_FULL' &&
      (!confirmReMeasure || !verificationReason)
    ) {
      return NextResponse.json(
        { error: 'Re-measure confirmation and reason required' },
        { status: 400 }
      )
    }

    const measurements = measurementsRaw
      ? JSON.parse(measurementsRaw)
      : {}

    await client.query('BEGIN')

    // 1️⃣ Resolve internal student ID
    const studentRes = await client.query(
      `SELECT id FROM students WHERE external_id = $1`,
      [studentId]
    )

    if (studentRes.rows.length === 0) {
      throw new Error('Student not found')
    }

    const internalStudentId = studentRes.rows[0].id

    // 2️⃣ Load previous measurement event
    const prevEventRes = await client.query(
      `
      SELECT
        me.id,
        me.performance_id,
        me.height_in,
        me.photo_url,
        me.superseded_by_event_id
      FROM measurement_events me
      WHERE me.id = $1
        AND me.student_id = $2
      `,
      [previousEventId, internalStudentId]
    )

    if (prevEventRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Previous measurement event not found' },
        { status: 409 }
      )
    }

    const prevEvent = prevEventRes.rows[0]

    if (prevEvent.performance_id !== performanceId) {
      return NextResponse.json(
        { error: 'Performance mismatch' },
        { status: 409 }
      )
    }

    if (prevEvent.superseded_by_event_id) {
      return NextResponse.json(
        { error: 'Measurement already superseded' },
        { status: 409 }
      )
    }

    // 3️⃣ Load existing measurement values
    const valuesRes = await client.query(
      `
      SELECT mt.code
      FROM measurement_values mv
      JOIN measurement_types mt ON mt.id = mv.measurement_type_id
      WHERE mv.measurement_event_id = $1
      `,
      [previousEventId]
    )

    const existingCodes = new Set(valuesRes.rows.map(r => r.code))

    const isComplete =
      REQUIRED_CODES.every(code => existingCodes.has(code)) &&
      prevEvent.height_in != null

    // 🔒 ADD_MISSING guards
    if (updateType === 'ADD_MISSING') {
      if (isComplete) {
        return NextResponse.json(
          { error: 'Measurements already complete' },
          { status: 409 }
        )
      }

      const providedCodes = Object.keys(measurements)
        .map(k => k.toUpperCase())
        .filter(k => k !== 'HEIGHT')

      const newCodes = providedCodes.filter(
        code => !existingCodes.has(code)
      )

      const addingHeight =
        measurements.height != null && prevEvent.height_in == null

      if (newCodes.length === 0 && !addingHeight && !photo) {
        return NextResponse.json(
          { error: 'No missing data provided' },
          { status: 400 }
        )
      }

      for (const code of providedCodes) {
        if (existingCodes.has(code)) {
          return NextResponse.json(
            { error: `Measurement ${code} already exists` },
            { status: 409 }
          )
        }
      }

      if (photo && prevEvent.photo_url) {
        return NextResponse.json(
          { error: 'Photo already exists' },
          { status: 409 }
        )
      }
    }

    // 🔒 PHOTO_ONLY guards
    if (updateType === 'PHOTO_ONLY') {
      if (!photo) {
        return NextResponse.json(
          { error: 'Photo required for PHOTO_ONLY update' },
          { status: 400 }
        )
      }

      if (prevEvent.photo_url) {
        return NextResponse.json(
          { error: 'Photo already exists' },
          { status: 409 }
        )
      }
    }

    // 🔒 REMEASURE_FULL guards
    if (updateType === 'REMEASURE_FULL') {
      for (const code of REQUIRED_CODES) {
        if (measurements[code.toLowerCase()] == null) {
          return NextResponse.json(
            { error: 'Missing required measurement fields' },
            { status: 400 }
          )
        }
      }
    }

    // 4️⃣ Upload photo if provided
    let photoUrl: string | null = null
    if (photo) {
      photoUrl = await uploadImage(
        photo,
        `measurements/${studentId}-${Date.now()}`
      )
    }

    // 5️⃣ Insert new measurement event
    const newEventRes = await client.query(
      `
      INSERT INTO measurement_events
        (student_id, performance_id, recorded_by, height_in, photo_url, verification_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        internalStudentId,
        performanceId,
        'admin', // TODO: replace with auth user
        measurements.height ?? prevEvent.height_in,
        photoUrl,
        verificationReason ?? null,
      ]
    )

    const newEventId = newEventRes.rows[0].id

    // 6️⃣ Insert measurement values (if any)
    if (updateType !== 'PHOTO_ONLY') {
      const typesRes = await client.query(
        `SELECT id, code FROM measurement_types`
      )

      const typeMap: Record<string, string> = {}
      for (const row of typesRes.rows) {
        typeMap[row.code] = row.id
      }

      for (const [key, value] of Object.entries(measurements)) {
        if (value == null || key === 'height') continue

        const code = key.toUpperCase()
        const typeId = typeMap[code]

        if (!typeId) {
          throw new Error(`Unknown measurement type: ${code}`)
        }

        await client.query(
          `
          INSERT INTO measurement_values
            (measurement_event_id, measurement_type_id, value)
          VALUES ($1, $2, $3)
          `,
          [newEventId, typeId, value]
        )
      }
    }

    // 7️⃣ Supersede previous event if full re-measure
    if (updateType === 'REMEASURE_FULL') {
      await client.query(
        `
        UPDATE measurement_events
        SET superseded_by_event_id = $1
        WHERE id = $2
        `,
        [newEventId, previousEventId]
      )
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      newEventId,
      supersededEventId:
        updateType === 'REMEASURE_FULL' ? previousEventId : null,
    })
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
