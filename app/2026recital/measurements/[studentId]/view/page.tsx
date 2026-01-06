'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'



interface Student {
  id: string
  external_id: string
  first_name: string
  last_name: string
}

type MeasurementFormState = {
    height: number | ''
  girth: number | ''
  hips: number | ''
  shoeSize: number | ''
  waist: number | ''
  bust: number | ''
}

export default function MeasurementEntryPage() {
  const params = useParams()
  const studentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


const [measurements, setMeasurements] = useState<MeasurementFormState>({
    height: '',
  girth: '',
  hips: '',
  shoeSize: '',
  waist: '',
  bust: '',
})

const [saving, setSaving] = useState(false)
const [saveSuccess, setSaveSuccess] = useState(false)

const [photoFile, setPhotoFile] = useState<File | null>(null)
const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)



function updateMeasurement(
  field: keyof MeasurementFormState,
  value: string
) {
  setMeasurements((prev) => ({
    ...prev,
    [field]: value === '' ? '' : Number(value),
  }))
}
async function handleSave() {
  if (!isFormValid || !studentId) return

  setSaving(true)

  try {
    const formData = new FormData()

    // Required identifiers
    formData.append('studentId', studentId)

    // Measurements payload (JSON string)
    formData.append(
      'measurements',
      JSON.stringify({
        height: measurements.height as number,
        girth: measurements.girth as number,
        hips: measurements.hips as number,
        shoeSize: measurements.shoeSize as number,
        ...(measurements.waist !== '' && { waist: measurements.waist }),
        ...(measurements.bust !== '' && { bust: measurements.bust }),
      })
    )

    // Optional photo
    if (photoFile) {
      formData.append('photo', photoFile)
    }

    const res = await fetch('/api/measurements/save', {
      method: 'POST',
      body: formData, // ⚠️ DO NOT set Content-Type
    })

    if (!res.ok) {
      throw new Error('Save failed')
    }

    setSaveSuccess(true)
    window.dispatchEvent(new Event('measurement-saved'))
  } catch (err) {
    console.error(err)
    alert('Failed to save measurements')
  } finally {
    setSaving(false)
  }
}


  useEffect(() => {
    async function loadStudent() {
      try {
        const res = await fetch(`/api/students/${studentId}`)
        if (!res.ok) {
          throw new Error('Student not found')
        }

        const data = await res.json()
        setStudent(data)
      } catch (err) {
        console.error(err)
        setError('Unable to load student')
      } finally {
        setLoading(false)
      }
    }

    if (typeof studentId === 'string' && studentId.length > 0) {
  loadStudent()
}
  }, [studentId])

  const isFormValid =
  measurements.height !== '' &&
  measurements.girth !== '' &&
  measurements.hips !== '' &&
  measurements.shoeSize !== ''


  if (loading) {
    return <p className="text-center mt-10">Loading student…</p>
  }

  if (error || !student) {
    return (
      <p className="text-center mt-10 text-red-600">
        {error ?? 'Student not found'}
      </p>
    )
  }
if (saveSuccess && student) {
  return (
    <div className="max-w-xl mx-auto mt-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Measurements Saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Measurements for{' '}
            <strong>
              {student.first_name} {student.last_name}
            </strong>{' '}
            have been saved.
          </p>

          <div className="space-y-3">
            <a
              href="/2026recital/measurements"
              className="block w-full text-center py-3 rounded font-semibold bg-purple-600 text-white"
            >
              Measure Another Student
            </a>

            <button
              onClick={() => setSaveSuccess(false)}
              className="block w-full py-3 rounded font-semibold bg-gray-200 text-gray-800"
            >
              Re-measure This Student
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Viewing: {student.first_name} {student.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Akada ID: {student.external_id}
          </p>
        </CardContent>
      </Card>

      <Card>
  <CardHeader>
    <CardTitle>Measurements</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* REQUIRED */}
    <div>
  <label className="block text-sm font-medium">
    Height (cm) <span className="text-red-500">*</span>
  </label>
  <input
    type="number"
    step="0.1"
    value={measurements.height}
    onChange={(e) => updateMeasurement('height', e.target.value)}
    className="w-full border rounded px-3 py-2"
    placeholder="e.g. 52.5"
  />
</div>
<div className="space-y-2">
  <label className="block text-sm font-medium">
    Height Confirmation Photo (optional)
  </label>

  <input
    type="file"
    accept="image/*"
    capture="environment"
    onChange={(e) => {
      const file = e.target.files?.[0] ?? null
      setPhotoFile(file)

      if (file) {
        const url = URL.createObjectURL(file)
        setPhotoPreviewUrl(url)
      } else {
        setPhotoPreviewUrl(null)
      }
    }}
  />

  {photoPreviewUrl && (
    <img
      src={photoPreviewUrl}
      alt="Height confirmation preview"
      className="mt-2 rounded border max-h-64 object-contain"
    />
  )}
</div>

    <div>
      <label className="block text-sm font-medium">
        Girth (in) <span className="text-red-500">*</span>
      </label>
      <input
  type="number"
  step="0.1"
  value={measurements.girth}
  onChange={(e) => updateMeasurement('girth', e.target.value)}
  className="w-full border rounded px-3 py-2"
  placeholder="e.g. 32.5"
/>

    </div>

    <div>
      <label className="block text-sm font-medium">
        Hips (in) <span className="text-red-500">*</span>
      </label>
      <input
  type="number"
  step="0.1"
  value={measurements.hips}
  onChange={(e) => updateMeasurement('hips', e.target.value)}
  className="w-full border rounded px-3 py-2"
  placeholder="e.g. 30.0"
/>

    </div>

    <div>
      <label className="block text-sm font-medium">
        Shoe Size (cm) <span className="text-red-500">*</span>
      </label>
      <input
  type="number"
  step="0.1"
  value={measurements.shoeSize}
  onChange={(e) => updateMeasurement('shoeSize', e.target.value)}
  className="w-full border rounded px-3 py-2"
  placeholder="e.g. 21.5"
/>

    </div>

    {/* OPTIONAL */}
    <div className="pt-4 border-t">
      <p className="text-sm text-gray-500 mb-2">
        Optional (only if required for costume fit)
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Waist (in)
          </label>
          <input
  type="number"
  step="0.1"
  value={measurements.waist}
  onChange={(e) => updateMeasurement('waist', e.target.value)}
  className="w-full border rounded px-3 py-2"
  placeholder="e.g. 24.0"
/>

        </div>

        <div>
          <label className="block text-sm font-medium">
            Bust (in)
          </label>
          <input
  type="number"
  step="0.1"
  value={measurements.bust}
  onChange={(e) => updateMeasurement('bust', e.target.value)}
  className="w-full border rounded px-3 py-2"
  placeholder="e.g. 28.0"
/>
        </div>
      </div>
    </div>
    <button
  disabled={!isFormValid || saving}
  onClick={handleSave}
  className={`w-full mt-6 py-3 rounded font-semibold ${
    isFormValid && !saving
      ? 'bg-purple-600 text-white'
      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
  }`}
>
  {saving ? 'Saving…' : 'Save Measurements'}
</button>


  </CardContent>
</Card>

    </div>
  )
}
