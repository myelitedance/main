'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UpdateType = 'PHOTO_ONLY' | 'ADD_MISSING' | 'REMEASURE_FULL'

type CurrentResponse = {
  student: {
    firstName: string
    lastName: string
  }
  performance: {
    id: string
  }
  measurementEvent: {
    id: string
    heightIn: number | null
    photoUrl: string | null
    values: Record<string, number>
  } | null
  derived: {
    isComplete: boolean
    missingFields: string[]
    hasPhoto: boolean
    canAddMissing: boolean
    canPhotoOnly: boolean
    canRemeasureFull: boolean
  }
}

export default function RemeasurePage() {
  const { studentId } = useParams()
  const router = useRouter()

  const [data, setData] = useState<CurrentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [updateType, setUpdateType] = useState<UpdateType | null>(null)
  const [measurements, setMeasurements] = useState<Record<string, number>>({})
  const [photo, setPhoto] = useState<File | null>(null)

  const [confirm, setConfirm] = useState(false)
  const [reason, setReason] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/measurements/current?studentId=${studentId}`
        )
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        setData(json)
      } catch {
        setError('Unable to load measurement context')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  function submit() {
    if (!data || !updateType || saving) return

    const form = new FormData()
    form.append('studentId', studentId as string)
    form.append('performanceId', data.performance.id)
    form.append('previousEventId', data.measurementEvent!.id)
    form.append('updateType', updateType)

    if (updateType === 'REMEASURE_FULL') {
      if (!confirm || !reason) return
      form.append('confirmReMeasure', 'true')
      form.append('verificationReason', reason)
    }

    if (Object.keys(measurements).length > 0) {
      form.append('measurements', JSON.stringify(measurements))
    }

    if (photo) {
      form.append('photo', photo)
    }

    setSaving(true)

    fetch('/api/measurements/update', {
      method: 'POST',
      body: form,
    })
      .then(res => {
        if (!res.ok) throw new Error()
        router.push(`/2026recital/measurements/${studentId}`)
      })
      .catch(() =>
        alert(
          'This measurement set was already updated. Please reload the dashboard.'
        )
      )
      .finally(() => setSaving(false))
  }

  if (loading) return <p className="mt-10 text-center">Loading…</p>
  if (error || !data)
    return <p className="mt-10 text-center text-red-600">{error}</p>

  const { student, measurementEvent, derived } = data

  return (
    <div className="max-w-xl mx-auto mt-6 space-y-6 px-4">
      <h1 className="text-2xl font-bold">
        Re-Measure: {student.firstName} {student.lastName}
      </h1>

      {/* INTENT SELECTION */}
      {!updateType && (
        <div className="space-y-4">
          {derived.canAddMissing && (
            <Card onClick={() => setUpdateType('ADD_MISSING')}>
              <CardContent className="p-4 cursor-pointer">
                <strong>Add Missing Info</strong>
                <p className="text-sm text-gray-600">
                  Complete missing measurements or photo
                </p>
              </CardContent>
            </Card>
          )}

          {derived.canPhotoOnly && (
            <Card onClick={() => setUpdateType('PHOTO_ONLY')}>
              <CardContent className="p-4 cursor-pointer">
                <strong>Upload Photo Only</strong>
                <p className="text-sm text-gray-600">
                  Add missing height confirmation photo
                </p>
              </CardContent>
            </Card>
          )}

          <Card
            onClick={() => setUpdateType('REMEASURE_FULL')}
            className="border-yellow-400"
          >
            <CardContent className="p-4 cursor-pointer">
              <strong>Full Re-Measure</strong>
              <p className="text-sm text-gray-600">
                Replace all measurements with a new set
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PHOTO */}
      {updateType && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>
      )}

      {/* ADD MISSING */}
      {updateType === 'ADD_MISSING' &&
        derived.missingFields.map(field => (
          <Card key={field}>
            <CardHeader>
              <CardTitle>{field}</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="number"
                step="0.1"
                className="w-full border rounded px-3 py-2"
                onChange={e =>
                  setMeasurements(prev => ({
                    ...prev,
                    [field.toLowerCase()]: Number(e.target.value),
                  }))
                }
              />
            </CardContent>
          </Card>
        ))}

      {/* FULL REMEASURE */}
      {updateType === 'REMEASURE_FULL' && (
        <>
          {['height', 'girth', 'hips', 'shoeSize'].map(k => (
            <Card key={k}>
              <CardHeader>
                <CardTitle>{k}</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  step="0.1"
                  className="w-full border rounded px-3 py-2"
                  onChange={e =>
                    setMeasurements(prev => ({
                      ...prev,
                      [k]: Number(e.target.value),
                    }))
                  }
                />
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="space-y-3">
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={e => setConfirm(e.target.checked)}
                />
                I confirm these measurements were physically re-taken
              </label>

              <select
                className="w-full border rounded px-3 py-2"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                <option value="">Select reason</option>
                <option value="growth">Growth since last measurement</option>
                <option value="incorrect">Initial measurement incorrect</option>
                <option value="costume">Costume requirement change</option>
                <option value="instructor">Instructor request</option>
              </select>
            </CardContent>
          </Card>
        </>
      )}

      {/* SUBMIT */}
      {updateType && (
        <button
          disabled={saving}
          onClick={submit}
          className="w-full py-3 rounded font-semibold bg-purple-600 text-white"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  )
}
